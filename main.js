const readline = require("readline");
const fs = require("fs");
const path = require("path");
const { createWorker } = require("tesseract.js");
const { pdfToPng } = require("pdf-to-png-converter");

// ----- Utility: Wait for key press -----
const waitForKeyPress = () => {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    console.log("Press any key to continue...");
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.once("data", () => {
      process.stdin.setRawMode(false);
      rl.close();
      resolve();
    });
  });
};

// ----- OCR Function for Image Files -----
const processImageFile = async (filePath, worker, outputDir) => {
  console.log(`Processing image file: ${path.basename(filePath)}`);
  const { data: { text } } = await worker.recognize(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));
  const outputFilePath = path.join(outputDir, baseName + ".txt");
  fs.writeFileSync(outputFilePath, text, "utf8");
  console.log(`Text written to: ${outputFilePath}`);
};

// ----- OCR Pipeline for PDF Files -----
// This function converts a PDF to PNG pages and then performs OCR on each page.
// It then combines the text from all pages into a single .txt file.
const processPdfFile = async (pdfFilePath, worker, outputDir) => {
  console.log(`Processing PDF file: ${path.basename(pdfFilePath)}`);
  // Convert PDF to PNG pages.
  // Note: Not specifying outputFolder returns PNG buffers instead of writing files.
  const pngPages = await pdfToPng(pdfFilePath, {
    viewportScale: 2.0,
    // Other options can be added as needed.
  });

  let combinedText = "";
  // Process each page buffer with Tesseract
  for (const page of pngPages) {
    console.log(`Processing PDF page ${page.pageNumber}`);
    const { data: { text } } = await worker.recognize(page.content);
    combinedText += `--- Page ${page.pageNumber} ---\n${text}\n\n`;
  }
  
  // Write the combined text to an output file named after the PDF.
  const baseName = path.basename(pdfFilePath, path.extname(pdfFilePath));
  const outputFilePath = path.join(outputDir, baseName + ".txt");
  fs.writeFileSync(outputFilePath, combinedText, "utf8");
  console.log(`Text written to: ${outputFilePath}`);
};

// ----- Main Processing Pipeline -----
const processFiles = async () => {
  // Define input and output directories
  const inputDir = path.join(__dirname, "input");
  const outputDir = path.join(__dirname, "output");

  // Create the output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Read all files from the input directory
  const files = fs.readdirSync(inputDir);

  // Initialize Tesseract worker
  const worker = await createWorker();

  // Loop through each file and process based on extension
  for (const file of files) {
    const filePath = path.join(inputDir, file);
    const ext = path.extname(file).toLowerCase();
    if (ext === ".pdf") {
      // Process PDF file
      await processPdfFile(filePath, worker, outputDir);
    } else if ([".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tiff"].includes(ext)) {
      // Process image file
      await processImageFile(filePath, worker, outputDir);
    } else {
      console.log(`Skipping unsupported file type: ${file}`);
    }
  }

  // Terminate the Tesseract worker when done
  await worker.terminate();
};

// ----- Main Execution -----
(async () => {
  console.log("Welcome to the OCR Pipeline!");
  await waitForKeyPress();
  console.log("Starting processing...");
  await processFiles();
  console.log("Processing complete!");
  await waitForKeyPress();

})();
