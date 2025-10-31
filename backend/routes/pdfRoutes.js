// ============================================
// FILE: routes/pdfRoutes.js
// Location: backend/routes/pdfRoutes.js
// ============================================

const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfController');
const upload = require('../config/multer');

// Merge multiple PDFs into one
router.post('/merge', upload.array('pdfs', 10), pdfController.mergePDFs);

// Split PDF into specific pages
router.post('/split', upload.single('pdf'), pdfController.splitPDF);

// Compress PDF to reduce file size
router.post('/compress', upload.single('pdf'), pdfController.compressPDF);

// Rotate PDF pages
router.post('/rotate', upload.single('pdf'), pdfController.rotatePDF);

// Protect PDF with password
router.post('/protect', upload.single('pdf'), pdfController.protectPDF);

// Add watermark to PDF
router.post('/watermark', upload.single('pdf'), pdfController.addWatermark);

// Get PDF information
router.post('/info', upload.single('pdf'), pdfController.getPDFInfo);

// Convert PDF to images
router.post('/convert-to-images', upload.single('pdf'), pdfController.convertToImages);

module.exports = router;