
// ============================================
// FILE: utils/fileUtils.js
// ============================================
const fs = require('fs').promises;

async function cleanupFile(filepath) {
  try {
    await fs.unlink(filepath);
    console.log(`Cleaned up: ${filepath}`);
  } catch (error) {
    console.error('Error cleaning up file:', error);
  }
}

async function getFileSize(filepath) {
  try {
    const stats = await fs.stat(filepath);
    return stats.size;
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
}

module.exports = {
  cleanupFile,
  getFileSize
};