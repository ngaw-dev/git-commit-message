// Example file to test code analysis
const fs = require('fs');

// New function for file processing
function processFiles(files) {
  return files.map(file => {
    console.log(`Processing file: ${file}`);
    return fs.readFileSync(file, 'utf8');
  });
}

// TODO: Add error handling
class FileProcessor {
  constructor() {
    this.files = [];
  }

  // Add async method
  async processAsync(file) {
    try {
      const content = await fs.promises.readFile(file, 'utf8');
      return content;
    } catch (error) {
      throw new Error(`Failed to process ${file}: ${error.message}`);
    }
  }

  // Test method
  test() {
    console.log('Testing file processor');
  }
}

module.exports = { processFiles, FileProcessor };