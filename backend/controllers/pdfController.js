// ============================================
// FILE: controllers/pdfController.js
// Location: backend/controllers/pdfController.js
// ============================================

const fs = require('fs').promises;
const path = require('path');
const { PDFDocument, rgb } = require('pdf-lib');
const { cleanupFile } = require('../utils/fileUtils');

// Merge multiple PDFs into one
exports.mergePDFs = async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: 'At least 2 PDF files are required' });
    }

    const mergedPdf = await PDFDocument.create();

    // Load and merge each PDF
    for (const file of req.files) {
      const pdfBytes = await fs.readFile(file.path);
      const pdf = await PDFDocument.load(pdfBytes);
      const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    // Save merged PDF
    const mergedPdfBytes = await mergedPdf.save();
    const outputPath = path.join(__dirname, '../uploads', `merged-${Date.now()}.pdf`);
    await fs.writeFile(outputPath, mergedPdfBytes);

    // Cleanup uploaded files
    for (const file of req.files) {
      await cleanupFile(file.path);
    }

    // Send file to user
    res.download(outputPath, 'merged.pdf', async (err) => {
      if (err) console.error('Download error:', err);
      await cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Merge error:', error);
    res.status(500).json({ error: 'Failed to merge PDFs' });
  }
};

// Split PDF into specific pages
exports.splitPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const { pages } = req.body;
    const pdfBytes = await fs.readFile(req.file.path);
    const pdf = await PDFDocument.load(pdfBytes);
    const totalPages = pdf.getPageCount();

    const newPdf = await PDFDocument.create();
    let pageIndices = [];

    // Parse page ranges (e.g., "1,3,5" or "1-3,5-7")
    if (pages) {
      const ranges = pages.split(',');
      for (const range of ranges) {
        if (range.includes('-')) {
          const [start, end] = range.split('-').map(n => parseInt(n.trim()) - 1);
          for (let i = start; i <= end && i < totalPages; i++) {
            pageIndices.push(i);
          }
        } else {
          const pageNum = parseInt(range.trim()) - 1;
          if (pageNum >= 0 && pageNum < totalPages) {
            pageIndices.push(pageNum);
          }
        }
      }
    } else {
      // If no pages specified, include all pages
      pageIndices = Array.from({ length: totalPages }, (_, i) => i);
    }

    // Copy selected pages to new PDF
    const copiedPages = await newPdf.copyPages(pdf, pageIndices);
    copiedPages.forEach(page => newPdf.addPage(page));

    // Save split PDF
    const splitPdfBytes = await newPdf.save();
    const outputPath = path.join(__dirname, '../uploads', `split-${Date.now()}.pdf`);
    await fs.writeFile(outputPath, splitPdfBytes);

    await cleanupFile(req.file.path);

    res.download(outputPath, 'split.pdf', async (err) => {
      if (err) console.error('Download error:', err);
      await cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Split error:', error);
    res.status(500).json({ error: 'Failed to split PDF' });
  }
};

// Compress PDF to reduce file size
exports.compressPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const pdfBytes = await fs.readFile(req.file.path);
    const pdf = await PDFDocument.load(pdfBytes);
    
    // Save with compression options
    const compressedPdfBytes = await pdf.save({
      useObjectStreams: true,
      addDefaultPage: false,
      objectsPerTick: 50
    });

    const outputPath = path.join(__dirname, '../uploads', `compressed-${Date.now()}.pdf`);
    await fs.writeFile(outputPath, compressedPdfBytes);

    await cleanupFile(req.file.path);

    const originalSize = req.file.size;
    const compressedSize = compressedPdfBytes.length;
    const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);

    console.log(`Compression: ${savings}% size reduction`);

    res.download(outputPath, 'compressed.pdf', async (err) => {
      if (err) console.error('Download error:', err);
      await cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Compress error:', error);
    res.status(500).json({ error: 'Failed to compress PDF' });
  }
};

// Rotate PDF pages
exports.rotatePDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const { degrees } = req.body;
    const rotation = parseInt(degrees) || 90;

    const pdfBytes = await fs.readFile(req.file.path);
    const pdf = await PDFDocument.load(pdfBytes);
    
    const pages = pdf.getPages();
    pages.forEach(page => {
      const currentRotation = page.getRotation().angle;
      page.setRotation({ angle: (currentRotation + rotation) % 360, type: 'degrees' });
    });

    const rotatedPdfBytes = await pdf.save();
    const outputPath = path.join(__dirname, '../uploads', `rotated-${Date.now()}.pdf`);
    await fs.writeFile(outputPath, rotatedPdfBytes);

    await cleanupFile(req.file.path);

    res.download(outputPath, 'rotated.pdf', async (err) => {
      if (err) console.error('Download error:', err);
      await cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Rotate error:', error);
    res.status(500).json({ error: 'Failed to rotate PDF' });
  }
};

// Protect PDF with password (placeholder - requires additional library)
exports.protectPDF = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    // Note: pdf-lib doesn't support encryption directly
    // You would need libraries like node-qpdf or hummus for encryption
    // This is a placeholder implementation
    
    const pdfBytes = await fs.readFile(req.file.path);
    const pdf = await PDFDocument.load(pdfBytes);
    
    // Add metadata to indicate protection (not actual encryption)
    pdf.setTitle('Protected Document');
    pdf.setAuthor('NixPdf');
    
    const protectedPdfBytes = await pdf.save();
    const outputPath = path.join(__dirname, '../uploads', `protected-${Date.now()}.pdf`);
    await fs.writeFile(outputPath, protectedPdfBytes);

    await cleanupFile(req.file.path);

    res.download(outputPath, 'protected.pdf', async (err) => {
      if (err) console.error('Download error:', err);
      await cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Protect error:', error);
    res.status(500).json({ error: 'Failed to protect PDF' });
  }
};

// Add watermark to PDF
exports.addWatermark = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const { text, opacity } = req.body;
    const watermarkText = text || 'CONFIDENTIAL';
    const watermarkOpacity = parseFloat(opacity) || 0.3;

    const pdfBytes = await fs.readFile(req.file.path);
    const pdf = await PDFDocument.load(pdfBytes);
    
    const pages = pdf.getPages();

    // Add watermark to each page
    for (const page of pages) {
      const { width, height } = page.getSize();
      
      // Draw watermark text diagonally across the page
      page.drawText(watermarkText, {
        x: width / 4,
        y: height / 2,
        size: 60,
        color: rgb(0.7, 0.7, 0.7),
        opacity: watermarkOpacity,
        rotate: { angle: 45, type: 'degrees' }
      });
    }

    const watermarkedPdfBytes = await pdf.save();
    const outputPath = path.join(__dirname, '../uploads', `watermarked-${Date.now()}.pdf`);
    await fs.writeFile(outputPath, watermarkedPdfBytes);

    await cleanupFile(req.file.path);

    res.download(outputPath, 'watermarked.pdf', async (err) => {
      if (err) console.error('Download error:', err);
      await cleanupFile(outputPath);
    });
  } catch (error) {
    console.error('Watermark error:', error);
    res.status(500).json({ error: 'Failed to add watermark' });
  }
};

// Get PDF information
exports.getPDFInfo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    const pdfBytes = await fs.readFile(req.file.path);
    const pdf = await PDFDocument.load(pdfBytes);
    
    const info = {
      pages: pdf.getPageCount(),
      title: pdf.getTitle() || 'Untitled',
      author: pdf.getAuthor() || 'Unknown',
      subject: pdf.getSubject() || 'N/A',
      creator: pdf.getCreator() || 'Unknown',
      producer: pdf.getProducer() || 'Unknown',
      creationDate: pdf.getCreationDate()?.toString() || 'Unknown',
      modificationDate: pdf.getModificationDate()?.toString() || 'Unknown',
      fileSize: req.file.size,
      fileSizeMB: (req.file.size / 1024 / 1024).toFixed(2)
    };

    await cleanupFile(req.file.path);

    res.json(info);
  } catch (error) {
    console.error('Info error:', error);
    res.status(500).json({ error: 'Failed to get PDF info' });
  }
};

// Convert PDF to images (placeholder - requires additional library)
exports.convertToImages = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required' });
    }

    // This feature requires additional libraries like:
    // - pdf-poppler (requires poppler-utils installed)
    // - pdf2pic (requires graphicsmagick/imagemagick)
    // - pdf-to-png-converter
    
    // Placeholder response
    res.status(501).json({ 
      error: 'PDF to image conversion requires additional setup',
      message: 'Install pdf-poppler or pdf2pic library for this feature',
      instructions: 'npm install pdf-poppler or npm install pdf2pic'
    });

    await cleanupFile(req.file.path);
  } catch (error) {
    console.error('Convert error:', error);
    res.status(500).json({ error: 'Failed to convert PDF' });
  }
};