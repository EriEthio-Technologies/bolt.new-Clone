import { NERProcessor } from '../NERProcessor';

describe('NERProcessor', () => {
  let processor: NERProcessor;

  beforeEach(() => {
    processor = new NERProcessor();
  });

  it('should extract function entities correctly', async () => {
    const text = `
      function processData(input) {
        return input.map(x => x * 2);
      }
    `;

    const result = await processor.extractEntities(text);
    
    expect(result.entities).toContainEqual(
      expect.objectContaining({
        text: 'processData',
        type: 'FUNCTION'
      })
    );
  });

  it('should extract class entities correctly', async () => {
    const text = `
      class DataProcessor {
        constructor() {}
      }
    `;

    const result = await processor.extractEntities(text);
    
    expect(result.entities).toContainEqual(
      expect.objectContaining({
        text: 'DataProcessor',
        type: 'CLASS'
      })
    );
  });

  it('should group related entities correctly', async () => {
    const text = `
      class UserService {
        constructor(private userRepository: UserRepository) {}
      }
    `;

    const result = await processor.extractEntities(text);
    
    expect(result.entityGroups).toHaveLength(1);
    expect(result.entityGroups[0]).toHaveLength(2);
  });

  it('should filter out low confidence entities', async () => {
    const text = 'some ambiguous text';
    const result = await processor.extractEntities(text);
    
    expect(result.entities.every(e => e.confidence >= 0.85)).toBe(true);
  });

  it('should handle errors gracefully', async () => {
    const processor = new NERProcessor();
    processor['model'] = null; // Force an error

    await expect(processor.extractEntities('test')).rejects.toThrow(ProcessingError);
  });
}); 