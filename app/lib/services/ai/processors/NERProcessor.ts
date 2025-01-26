import { Service } from 'typedi';
import { pipeline } from '@xenova/transformers';
import { validateEnv } from '~/config/env.server';
import type { Entity, NERResult } from '~/types/ai';
import { ProcessingError } from '~/errors/ProcessingError';

@Service()
export class NERProcessor {
  private model: any; // Type will be specified by transformers
  private readonly confidenceThreshold: number = 0.85;
  private readonly specialEntities = new Set([
    'FUNCTION',
    'CLASS',
    'VARIABLE',
    'METHOD',
    'PACKAGE',
    'FRAMEWORK',
    'LANGUAGE',
    'DATABASE',
    'API',
    'PROTOCOL'
  ]);

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      this.model = await pipeline('token-classification', 'Xenova/code-bert-base');
    } catch (error) {
      throw new ProcessingError('Failed to initialize NER model', error);
    }
  }

  async extractEntities(text: string): Promise<NERResult> {
    try {
      // Get base entities from model
      const baseEntities = await this.model(text, {
        aggregation_strategy: 'simple'
      });

      // Extract code-specific entities
      const codeEntities = await this.extractCodeEntities(text);

      // Combine and normalize entities
      const entities = this.normalizeEntities([
        ...baseEntities,
        ...codeEntities
      ]);

      // Group related entities
      const entityGroups = this.groupRelatedEntities(entities);

      return {
        entities,
        entityGroups,
        confidence: this.calculateOverallConfidence(entities)
      };
    } catch (error) {
      throw new ProcessingError('Entity extraction failed', error);
    }
  }

  private async extractCodeEntities(text: string): Promise<Entity[]> {
    const entities: Entity[] = [];
    
    // Extract function declarations
    const functionRegex = /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g;
    let match;
    while ((match = functionRegex.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'FUNCTION',
        start: match.index,
        end: match.index + match[1].length,
        confidence: 1.0
      });
    }

    // Extract class declarations
    const classRegex = /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    while ((match = classRegex.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'CLASS',
        start: match.index,
        end: match.index + match[1].length,
        confidence: 1.0
      });
    }

    // Extract imports and packages
    const importRegex = /import\s+(?:{[^}]+}|[^;]+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((match = importRegex.exec(text)) !== null) {
      entities.push({
        text: match[1],
        type: 'PACKAGE',
        start: match.index,
        end: match.index + match[1].length,
        confidence: 1.0
      });
    }

    return entities;
  }

  private normalizeEntities(entities: Entity[]): Entity[] {
    return entities
      .filter(entity => entity.confidence >= this.confidenceThreshold)
      .map(entity => ({
        ...entity,
        type: this.normalizeEntityType(entity.type)
      }))
      .sort((a, b) => a.start - b.start);
  }

  private normalizeEntityType(type: string): string {
    // Convert model-specific types to our standardized types
    if (this.specialEntities.has(type)) {
      return type;
    }

    const typeMap: Record<string, string> = {
      'PERSON': 'USER',
      'ORG': 'ORGANIZATION',
      'GPE': 'LOCATION',
      'DATE': 'TEMPORAL',
      'CARDINAL': 'NUMBER'
    };

    return typeMap[type] || type;
  }

  private groupRelatedEntities(entities: Entity[]): Entity[][] {
    const groups: Entity[][] = [];
    let currentGroup: Entity[] = [];

    for (const entity of entities) {
      if (currentGroup.length === 0) {
        currentGroup.push(entity);
        continue;
      }

      const lastEntity = currentGroup[currentGroup.length - 1];
      const distance = entity.start - lastEntity.end;

      if (distance <= 3 && this.areEntitiesRelated(lastEntity, entity)) {
        currentGroup.push(entity);
      } else {
        if (currentGroup.length > 0) {
          groups.push([...currentGroup]);
        }
        currentGroup = [entity];
      }
    }

    if (currentGroup.length > 0) {
      groups.push(currentGroup);
    }

    return groups;
  }

  private areEntitiesRelated(entity1: Entity, entity2: Entity): boolean {
    // Check if entities are part of the same semantic unit
    const relatedTypes = new Map([
      ['FUNCTION', new Set(['METHOD', 'VARIABLE', 'PARAMETER'])],
      ['CLASS', new Set(['METHOD', 'PROPERTY', 'CONSTRUCTOR'])],
      ['PACKAGE', new Set(['VERSION', 'DEPENDENCY'])]
    ]);

    return (
      entity1.type === entity2.type ||
      relatedTypes.get(entity1.type)?.has(entity2.type) ||
      relatedTypes.get(entity2.type)?.has(entity1.type)
    );
  }

  private calculateOverallConfidence(entities: Entity[]): number {
    if (entities.length === 0) return 0;
    
    const totalConfidence = entities.reduce(
      (sum, entity) => sum + entity.confidence,
      0
    );
    
    return totalConfidence / entities.length;
  }
} 