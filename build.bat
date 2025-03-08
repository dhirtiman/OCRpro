@echo off
REM Batch script to package Node.js application using pkg

echo Starting packaging process...
pkg -t node14-win main.js --out-path "./dist"
echo Packaging complete!

pause
