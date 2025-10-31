// backend/server.js
const express = require("express");
const multer = require("multer");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts, degrees } = require("pdf-lib");
const libre = require("libreoffice-convert");
const Tesseract = require("tesseract.js");
const cors = require("cors");
const archiver = require("archiver");
const { exec } = require("child_process");
const { promisify } = require("util");
const crypto = require("crypto");

const execPromise = promisify(exec);
// Don't promisify libre.convert as it already returns a promise in newer versions

const app = express();

// ---------------- Configuration ----------------
const UPLOAD_DIR = path.join(__dirname, "uploads");
const TEMP_DIR = path.join(__dirname, "temp");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_FILES = 10;

// Ensure directories exist
[UPLOAD_DIR, TEMP_DIR].forEach(dir => {
  if (!fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
});

// ---------------- Middleware ----------------
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json());

// File upload configuration with validation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log(`📥 Upload destination: ${UPLOAD_DIR}`);
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${file.originalname}`;
    console.log(`📝 Saving file as: ${uniqueName}`);
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/msword',
    'application/vnd.ms-powerpoint',
    'application/vnd.ms-excel'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type: ${file.mimetype}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES }
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Max size is 50MB' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: `Too many files. Max is ${MAX_FILES}` });
    }
  }
  
  if (err.message.includes('Invalid file type')) {
    return res.status(400).json({ error: err.message });
  }
  
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------- Helper Functions ----------------
const cleanUp = async (files) => {
  const fileArray = Array.isArray(files) ? files : [files];
  for (const file of fileArray) {
    try {
      if (file && fsSync.existsSync(file)) {
        const stats = await fs.stat(file);
        if (stats.isDirectory()) {
          // Remove directory recursively
          await fs.rm(file, { recursive: true, force: true });
        } else {
          // Remove file with retry for Windows
          await retryOperation(() => fs.unlink(file), 3);
        }
      }
    } catch (err) {
      // On Windows, files might be locked - just log and continue
      if (err.code !== 'ENOENT') {
        console.error(`Error cleaning up ${file}:`, err.message);
      }
    }
  }
};

// Helper function to retry operations (useful for Windows file locks)
const retryOperation = async (operation, maxRetries = 3, delay = 100) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await operation();
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

const downloadFile = async (res, filePath, filename) => {
  try {
    console.log(`📤 Starting download: ${filename}`);
    console.log(`📂 File path: ${filePath}`);
    console.log(`📊 File exists: ${fsSync.existsSync(filePath)}`);
    
    if (!fsSync.existsSync(filePath)) {
      throw new Error(`File not found for download: ${filePath}`);
    }
    
    const stats = fsSync.statSync(filePath);
    console.log(`📏 File size: ${stats.size} bytes`);
    
    res.download(filePath, filename, async (err) => {
      if (err) {
        console.error('❌ Download error:', err);
      } else {
        console.log('✅ Download completed successfully');
      }
      // Clean up after a delay to ensure download completes
      setTimeout(async () => {
        await cleanUp(filePath);
      }, 2000);
    });
  } catch (error) {
    console.error('❌ Download file error:', error);
    throw error;
  }
};

const convertOffice = async (filePath, format, res) => {
  let outputPath;
  try {
    const normalizedPath = path.resolve(filePath);
    
    if (!fsSync.existsSync(normalizedPath)) {
      throw new Error(`Source file not found: ${normalizedPath}`);
    }
    
    const isWindows = process.platform === 'win32';
    const inputExt = path.extname(normalizedPath).toLowerCase();
    const outputExt = format.toLowerCase();
    
    // Check if this is a PDF to Office conversion
    const isPdfToOffice = inputExt === '.pdf' && ['.docx', '.pptx', '.xlsx'].includes(outputExt);
    
    if (isPdfToOffice) {
      console.log('📌 Using Python converter for PDF to Office');
      
      const outputDir = path.dirname(normalizedPath);
      const baseName = path.basename(normalizedPath, inputExt);
      outputPath = path.join(outputDir, `${baseName}${outputExt}`);
      
      if (fsSync.existsSync(outputPath)) {
        await fs.unlink(outputPath);
      }
      
      const formatMap = {
        '.docx': 'word',
        '.xlsx': 'excel',
        '.pptx': 'powerpoint'
      };
      
      const pythonFormat = formatMap[outputExt];
      const pythonScript = path.join(__dirname, 'pdf_converter.py');
      
      if (!fsSync.existsSync(pythonScript)) {
        throw new Error('Python converter script not found at: ' + pythonScript);
      }
      
      const cmd = `python "${pythonScript}" ${pythonFormat} "${normalizedPath}" "${outputPath}"`;
      
      console.log(`🐍 Running Python: ${cmd}`);
      
      try {
        const { stdout, stderr } = await execPromise(cmd, { 
          timeout: 120000,
          windowsHide: true 
        });
        
        
       if (stdout) console.log('✅ Python output:', stdout);
       if (stderr) console.log('⚠️  Python stderr:', stderr);

// Check if conversion succeeded by looking for SUCCESS in output
       if (!stdout.includes('SUCCESS')) {
           throw new Error('Conversion failed - no SUCCESS message');
}
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (fsSync.existsSync(outputPath)) {
          console.log(`✅ Conversion successful: ${outputPath}`);
          await cleanUp(normalizedPath);
          await downloadFile(res, outputPath, `output${outputExt}`);
        } else {
          throw new Error(`Output file not created: ${outputPath}`);
        }
      } catch (error) {
        console.error('❌ Python conversion failed:', error.message);
        throw new Error(`Python conversion failed: ${error.message}`);
      }
      
    } else if (isWindows) {
      console.log('📌 Using LibreOffice for Office to PDF');
      
      const outputDir = path.dirname(normalizedPath);
      const baseName = path.basename(normalizedPath, inputExt);
      
      const formatMap = {
        '.pdf': 'pdf:writer_pdf_Export',
        '.docx': 'docx:"MS Word 2007 XML"',
        '.pptx': 'pptx',
        '.xlsx': 'xlsx:"Calc MS Excel 2007 XML"'
      };
      
      const loFormat = formatMap[outputExt] || outputExt.substring(1);
      outputPath = path.join(outputDir, `${baseName}${outputExt}`);
      
      if (fsSync.existsSync(outputPath)) {
        await fs.unlink(outputPath);
      }
      
      const cmd = `soffice --headless --invisible --nodefault --nofirststartwizard --nolockcheck --nologo --norestore --convert-to ${loFormat} --outdir "${outputDir}" "${normalizedPath}"`;
      
      console.log(`Running LibreOffice: ${cmd}`);
      
      const { stdout, stderr } = await execPromise(cmd, { 
        timeout: 60000,
        windowsHide: true 
      });
      
      if (stdout) console.log('LibreOffice output:', stdout);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (fsSync.existsSync(outputPath)) {
        console.log(`✅ Conversion successful: ${outputPath}`);
        await cleanUp(normalizedPath);
        await downloadFile(res, outputPath, `output${outputExt}`);
      } else {
        throw new Error(`Output file not created: ${outputPath}`);
      }
      
    } else {
      const file = await fs.readFile(normalizedPath);
      
      let converted;
      if (libre.convert.constructor.name === 'AsyncFunction') {
        converted = await libre.convert(file, format, undefined);
      } else {
        converted = await new Promise((resolve, reject) => {
          libre.convert(file, format, undefined, (err, done) => {
            if (err) reject(err);
            else resolve(done);
          });
        });
      }
      
      outputPath = normalizedPath + format;
      await fs.writeFile(outputPath, converted);
      await cleanUp(normalizedPath);
      await downloadFile(res, outputPath, `output${format}`);
    }
  } catch (error) {
    console.error('❌ Conversion error:', error.message);
    await cleanUp([filePath, outputPath]);
    throw new Error(`Conversion failed: ${error.message}`);
  }
};

const validatePDFFile = (file) => {
  if (!file) throw new Error('No file uploaded');
  if (file.mimetype !== 'application/pdf') {
    throw new Error('File must be a PDF');
  }
};

// ---------------- PDF Tools ----------------

// Merge PDFs
app.post("/api/merge", upload.array("files", MAX_FILES), async (req, res) => {
  const uploadedFiles = req.files || [];
  try {
    if (uploadedFiles.length < 2) {
      throw new Error('Please upload at least 2 PDF files');
    }

    uploadedFiles.forEach(validatePDFFile);

    const mergedPdf = await PDFDocument.create();
    
    for (const file of uploadedFiles) {
      const pdfBytes = await fs.readFile(file.path);
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    const outputPath = path.join(TEMP_DIR, `merged-${Date.now()}.pdf`);
    const mergedBytes = await mergedPdf.save();
    await fs.writeFile(outputPath, mergedBytes);
    
    await cleanUp(uploadedFiles.map(f => f.path));
    await downloadFile(res, outputPath, "merged.pdf");
  } catch (error) {
    await cleanUp(uploadedFiles.map(f => f.path));
    res.status(500).json({ error: error.message });
  }
});

// Split PDF
app.post("/api/split", upload.single("file"), async (req, res) => {
  let pdfPath, outputDir, zipPath;
  try {
    validatePDFFile(req.file);
    
    pdfPath = req.file.path;
    const pdfBytes = await fs.readFile(pdfPath);
    const pdf = await PDFDocument.load(pdfBytes);
    const pageCount = pdf.getPageCount();

    if (pageCount === 1) {
      throw new Error('PDF has only one page, cannot split');
    }

    outputDir = path.join(TEMP_DIR, `split-${Date.now()}`);
    await fs.mkdir(outputDir, { recursive: true });

    zipPath = path.join(TEMP_DIR, `split-${Date.now()}.zip`);
    const output = fsSync.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);

    for (let i = 0; i < pageCount; i++) {
      const newPdf = await PDFDocument.create();
      const [copiedPage] = await newPdf.copyPages(pdf, [i]);
      newPdf.addPage(copiedPage);
      const pagePath = path.join(outputDir, `page_${i + 1}.pdf`);
      await fs.writeFile(pagePath, await newPdf.save());
      archive.file(pagePath, { name: `page_${i + 1}.pdf` });
    }

    await archive.finalize();

    output.on("close", async () => {
      await cleanUp([pdfPath, outputDir]);
      await downloadFile(res, zipPath, "split_pages.zip");
    });

    output.on("error", (err) => {
      throw err;
    });

  } catch (error) {
    await cleanUp([pdfPath, outputDir, zipPath]);
    res.status(500).json({ error: error.message });
  }
});

// Compress PDF
app.post("/api/compress", upload.single("file"), async (req, res) => {
  let filePath;
  try {
    validatePDFFile(req.file);
    filePath = req.file.path;
    
    const pdfBytes = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    
    // Basic compression using object streams
    const compressedBytes = await pdf.save({ 
      useObjectStreams: true,
      addDefaultPage: false
    });
    
    const outputPath = path.join(TEMP_DIR, `compressed-${Date.now()}.pdf`);
    await fs.writeFile(outputPath, compressedBytes);
    
    const originalSize = (await fs.stat(filePath)).size;
    const compressedSize = (await fs.stat(outputPath)).size;
    const reduction = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    
    console.log(`Compressed: ${originalSize} → ${compressedSize} bytes (${reduction}% reduction)`);
    
    await cleanUp(filePath);
    await downloadFile(res, outputPath, "compressed.pdf");
  } catch (error) {
    await cleanUp(filePath);
    res.status(500).json({ error: error.message });
  }
});

// Rotate PDF
app.post("/api/rotate", upload.single("file"), async (req, res) => {
  let filePath;
  try {
    validatePDFFile(req.file);
    filePath = req.file.path;
    
    const degreesVal = parseInt(req.body.degrees) || 90;
    
    if (![90, 180, 270, 360].includes(degreesVal)) {
      throw new Error('Degrees must be 90, 180, 270, or 360');
    }
    
    const pdfBytes = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    
    pdf.getPages().forEach(page => {
      const currentRotation = page.getRotation().angle;
      page.setRotation(degrees((currentRotation + degreesVal) % 360));
    });
    
    const outputPath = path.join(TEMP_DIR, `rotated-${Date.now()}.pdf`);
    await fs.writeFile(outputPath, await pdf.save());
    
    await cleanUp(filePath);
    await downloadFile(res, outputPath, "rotated.pdf");
  } catch (error) {
    await cleanUp(filePath);
    res.status(500).json({ error: error.message });
  }
});

// Watermark PDF
app.post("/api/watermark", upload.single("file"), async (req, res) => {
  let filePath;
  try {
    validatePDFFile(req.file);
    filePath = req.file.path;
    
    const text = req.body.text || "CONFIDENTIAL";
    const opacity = parseFloat(req.body.opacity) || 0.3;
    
    if (opacity < 0 || opacity > 1) {
      throw new Error('Opacity must be between 0 and 1');
    }
    
    const pdfBytes = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    
    pdf.getPages().forEach(page => {
      const { width, height } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, 50);
      
      page.drawText(text, {
        x: (width - textWidth) / 2,
        y: height / 2,
        size: 50,
        font,
        color: rgb(0.75, 0.75, 0.75),
        opacity,
        rotate: degrees(-45)
      });
    });
    
    const outputPath = path.join(TEMP_DIR, `watermarked-${Date.now()}.pdf`);
    await fs.writeFile(outputPath, await pdf.save());
    
    await cleanUp(filePath);
    await downloadFile(res, outputPath, "watermarked.pdf");
  } catch (error) {
    await cleanUp(filePath);
    res.status(500).json({ error: error.message });
  }
});

// Protect PDF (requires qpdf)
app.post("/api/protect", upload.single("file"), async (req, res) => {
  let filePath;
  try {
    validatePDFFile(req.file);
    filePath = req.file.path;
    
    const password = req.body.password;
    
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    const outputPath = path.join(TEMP_DIR, `protected-${Date.now()}.pdf`);
    
    // Using qpdf for proper encryption
    await execPromise(
      `qpdf --encrypt "${password}" "${password}" 256 -- "${filePath}" "${outputPath}"`
    );
    
    await cleanUp(filePath);
    await downloadFile(res, outputPath, "protected.pdf");
  } catch (error) {
    await cleanUp(filePath);
    res.status(500).json({ 
      error: error.message.includes('qpdf') 
        ? 'PDF protection requires qpdf. Install with: apt-get install qpdf' 
        : error.message 
    });
  }
});

// Unlock PDF
app.post("/api/unlock", upload.single("file"), async (req, res) => {
  let filePath;
  try {
    validatePDFFile(req.file);
    filePath = req.file.path;
    
    const password = req.body.password;
    
    if (!password) {
      throw new Error('Password required');
    }
    
    const outputPath = path.join(TEMP_DIR, `unlocked-${Date.now()}.pdf`);
    
    await execPromise(
      `qpdf --password="${password}" --decrypt "${filePath}" "${outputPath}"`
    );
    
    await cleanUp(filePath);
    await downloadFile(res, outputPath, "unlocked.pdf");
  } catch (error) {
    await cleanUp(filePath);
    res.status(500).json({ error: 'Failed to unlock PDF. Check password or install qpdf.' });
  }
});

// Page Numbers
app.post("/api/page-numbers", upload.single("file"), async (req, res) => {
  let filePath;
  try {
    validatePDFFile(req.file);
    filePath = req.file.path;
    
    const position = req.body.position || 'bottom-right';
    const pdfBytes = await fs.readFile(filePath);
    const pdf = await PDFDocument.load(pdfBytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    
    pdf.getPages().forEach((page, i) => {
      const { width, height } = page.getSize();
      const text = `${i + 1}`;
      const textWidth = font.widthOfTextAtSize(text, 12);
      
      let x, y;
      switch (position) {
        case 'bottom-right':
          x = width - textWidth - 30;
          y = 20;
          break;
        case 'bottom-center':
          x = (width - textWidth) / 2;
          y = 20;
          break;
        case 'bottom-left':
          x = 30;
          y = 20;
          break;
        default:
          x = width - textWidth - 30;
          y = 20;
      }
      
      page.drawText(text, { x, y, size: 12, font, color: rgb(0, 0, 0) });
    });
    
    const outputPath = path.join(TEMP_DIR, `numbered-${Date.now()}.pdf`);
    await fs.writeFile(outputPath, await pdf.save());
    
    await cleanUp(filePath);
    await downloadFile(res, outputPath, "numbered.pdf");
  } catch (error) {
    await cleanUp(filePath);
    res.status(500).json({ error: error.message });
  }
});

// Office to PDF
app.post("/api/office-to-pdf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('=== Office to PDF Conversion ===');
    console.log(`Original name: ${req.file.originalname}`);
    console.log(`Stored at: ${req.file.path}`);
    console.log(`File exists: ${fsSync.existsSync(req.file.path)}`);
    console.log(`File size: ${req.file.size} bytes`);
    
    await convertOffice(req.file.path, ".pdf", res);
  } catch (error) {
    console.error('❌ Office to PDF error:', error.message);
    await cleanUp(req.file?.path);
    res.status(500).json({ error: error.message });
  }
});

// PDF to Office formats
app.post("/api/pdf-to-word", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('=== PDF to Word Conversion ===');
    console.log(`Original name: ${req.file.originalname}`);
    console.log(`Stored at: ${req.file.path}`);
    console.log(`File exists: ${fsSync.existsSync(req.file.path)}`);
    console.log(`File size: ${req.file.size} bytes`);
    
    validatePDFFile(req.file);
    await convertOffice(req.file.path, ".docx", res);
  } catch (error) {
    console.error('❌ PDF to Word error:', error.message);
    console.error('Stack:', error.stack);
    await cleanUp(req.file?.path);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/pdf-to-ppt", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('=== PDF to PowerPoint Conversion ===');
    console.log(`Original name: ${req.file.originalname}`);
    console.log(`Stored at: ${req.file.path}`);
    console.log(`File exists: ${fsSync.existsSync(req.file.path)}`);
    
    validatePDFFile(req.file);
    await convertOffice(req.file.path, ".pptx", res);
  } catch (error) {
    console.error('❌ PDF to PowerPoint error:', error.message);
    await cleanUp(req.file?.path);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/pdf-to-excel", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('=== PDF to Excel Conversion ===');
    console.log(`Original name: ${req.file.originalname}`);
    console.log(`Stored at: ${req.file.path}`);
    console.log(`File exists: ${fsSync.existsSync(req.file.path)}`);
    
    validatePDFFile(req.file);
    await convertOffice(req.file.path, ".xlsx", res);
  } catch (error) {
    console.error('❌ PDF to Excel error:', error.message);
    await cleanUp(req.file?.path);
    res.status(500).json({ error: error.message });
  }
});

// PDF to Images (Windows-compatible)
app.post("/api/pdf-to-images", upload.single("file"), async (req, res) => {
  let filePath, outputDir, zipPath;
  try {
    validatePDFFile(req.file);
    filePath = req.file.path;
    
    outputDir = path.join(TEMP_DIR, `images-${Date.now()}`);
    await fs.mkdir(outputDir, { recursive: true });
    
    // Check if pdftoppm is available (Unix/Linux/Mac)
    try {
      await execPromise('pdftoppm -v');
      // Use pdftoppm
      await execPromise(
        `pdftoppm "${filePath}" "${path.join(outputDir, "page")}" -jpeg -r 150`
      );
    } catch {
      // pdftoppm not available - use pdf-lib as fallback
      console.log('pdftoppm not available, using pdf-lib fallback');
      const pdfBytes = await fs.readFile(filePath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();
      
      // Note: pdf-lib doesn't support image export directly
      // We need to inform the user to install poppler-utils
      throw new Error('PDF to images requires poppler-utils. On Windows, download from: https://github.com/oschwartz10612/poppler-windows/releases');
    }
    
    zipPath = path.join(TEMP_DIR, `pdf-images-${Date.now()}.zip`);
    const output = fsSync.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    
    archive.pipe(output);
    archive.directory(outputDir, false);
    
    await archive.finalize();
    
    output.on("close", async () => {
      await cleanUp([filePath, outputDir]);
      await downloadFile(res, zipPath, "pdf_pages.zip");
    });
    
  } catch (error) {
    await cleanUp([filePath, outputDir, zipPath]);
    res.status(500).json({ 
      error: error.message
    });
  }
});

// Images to PDF
app.post("/api/images-to-pdf", upload.array("files", MAX_FILES), async (req, res) => {
  const uploadedFiles = req.files || [];
  try {
    if (uploadedFiles.length === 0) {
      throw new Error('No images uploaded');
    }
    
    const pdf = await PDFDocument.create();
    
    for (const file of uploadedFiles) {
      const imgBytes = await fs.readFile(file.path);
      let img;
      
      if (file.mimetype === 'image/png') {
        img = await pdf.embedPng(imgBytes);
      } else {
        img = await pdf.embedJpg(imgBytes);
      }
      
      const page = pdf.addPage([img.width, img.height]);
      page.drawImage(img, { 
        x: 0, 
        y: 0, 
        width: img.width, 
        height: img.height 
      });
    }
    
    const outputPath = path.join(TEMP_DIR, `images-to-pdf-${Date.now()}.pdf`);
    await fs.writeFile(outputPath, await pdf.save());
    
    await cleanUp(uploadedFiles.map(f => f.path));
    await downloadFile(res, outputPath, "images.pdf");
  } catch (error) {
    await cleanUp(uploadedFiles.map(f => f.path));
    res.status(500).json({ error: error.message });
  }
});

// OCR PDF
app.post("/api/ocr", upload.single("file"), async (req, res) => {
  let filePath;
  try {
    filePath = req.file.path;
    
    const { data: { text } } = await Tesseract.recognize(filePath, "eng", {
      logger: m => console.log(m)
    });
    
    await cleanUp(filePath);
    res.json({ text, success: true });
  } catch (error) {
    await cleanUp(filePath);
    res.status(500).json({ error: error.message });
  }
});

// Repair PDF
app.post("/api/repair", upload.single("file"), async (req, res) => {
  let filePath;
  try {
    validatePDFFile(req.file);
    filePath = req.file.path;
    
    const outputPath = path.join(TEMP_DIR, `repaired-${Date.now()}.pdf`);
    
    // Try to repair using qpdf
    await execPromise(`qpdf "${filePath}" "${outputPath}"`);
    
    await cleanUp(filePath);
    await downloadFile(res, outputPath, "repaired.pdf");
  } catch (error) {
    await cleanUp(filePath);
    res.status(500).json({ error: 'Failed to repair PDF' });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Test upload endpoint
app.post("/api/test-upload", upload.single("file"), async (req, res) => {
  try {
    console.log('=== TEST UPLOAD ===');
    console.log('File received:', req.file ? 'YES' : 'NO');
    if (req.file) {
      console.log('Original name:', req.file.originalname);
      console.log('Saved to:', req.file.path);
      console.log('File size:', req.file.size, 'bytes');
      console.log('File exists:', fsSync.existsSync(req.file.path));
      
      // List all files in uploads
      const files = await fs.readdir(UPLOAD_DIR);
      console.log('Files in uploads:', files);
      
      res.json({
        success: true,
        file: {
          originalName: req.file.originalname,
          savedPath: req.file.path,
          size: req.file.size,
          exists: fsSync.existsSync(req.file.path)
        },
        allFiles: files
      });
    } else {
      res.status(400).json({ error: 'No file in request' });
    }
  } catch (error) {
    console.error('Test upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cleanup old temp files on startup (Windows-safe)
const cleanupOldFiles = async () => {
  try {
    const dirs = [UPLOAD_DIR, TEMP_DIR];
    const maxAge = 3600000; // 1 hour
    
    for (const dir of dirs) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          const filePath = path.join(dir, file);
          try {
            const stats = await fs.stat(filePath);
            if (Date.now() - stats.mtimeMs > maxAge) {
              if (stats.isDirectory()) {
                await fs.rm(filePath, { recursive: true, force: true });
              } else {
                await retryOperation(() => fs.unlink(filePath), 3);
              }
              console.log(`Cleaned up old file: ${file}`);
            }
          } catch (err) {
            // Skip files that are in use or can't be accessed
            if (err.code !== 'EPERM' && err.code !== 'EBUSY') {
              console.error(`Error processing ${file}:`, err.message);
            }
          }
        }
      } catch (err) {
        console.error(`Error reading directory ${dir}:`, err.message);
      }
    }
  } catch (error) {
    console.error('Cleanup error:', error.message);
  }
};

// Run cleanup every hour
setInterval(cleanupOldFiles, 3600000);
cleanupOldFiles();


// Add this AFTER all your routes, BEFORE app.listen()

// Serve static files from React build
const frontendBuildPath = path.join(__dirname, '../frontend/build');
app.use(express.static(frontendBuildPath));

// Handle React routing - serve index.html for all other routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(frontendBuildPath, 'index.html'));
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ NixPDF Server running on port ${PORT}`);
  console.log(`📁 Upload directory: ${UPLOAD_DIR}`);
  console.log(`📁 Temp directory: ${TEMP_DIR}`);
});