// Test file to demonstrate test analysis
const { processFiles, FileProcessor } = require('./test-example');

describe('FileProcessor', () => {
  it('should process files correctly', () => {
    const files = ['test.txt'];
    const result = processFiles(files);
    expect(result).toBeDefined();
  });

  it('should handle async processing', async () => {
    const processor = new FileProcessor();
    const result = await processor.processAsync('test.txt');
    expect(result).toBeDefined();
  });

  describe('FileProcessor class', () => {
    it('should create instance', () => {
      const processor = new FileProcessor();
      expect(processor).toBeInstanceOf(FileProcessor);
    });

    it('should have test method', () => {
      const processor = new FileProcessor();
      expect(typeof processor.test).toBe('function');
    });
  });
});