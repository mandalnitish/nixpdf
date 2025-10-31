
// ============================================
// FILE: utils/cleanup.js
// ============================================
const fs = require('fs').promises;
const path = require('path');

async function cleanupOldFiles() {
  try {
    const uploadDir = path.join(__dirname, '../uploads');
    const files = await fs.readdir(uploadDir);
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    let cleaned = 0;
    for (const file of files) {
      const filepath = path.join(uploadDir, file);
      const stats = await fs.stat(filepath);
      
      if (now - stats.mtimeMs > oneHour) {
        await fs.unlink(filepath);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old files`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

module.exports = { cleanupOldFiles };