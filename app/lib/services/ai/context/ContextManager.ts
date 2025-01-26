import { Service } from 'typedi';
import { MemoryManager } from './MemoryManager';
import { AttentionMechanism } from './AttentionMechanism';
import type { ContextData, EnrichedContext } from '~/types/ai';
import type { Memory, MemoryType } from '~/types/memory';
import { ProcessingError } from '~/errors/ProcessingError';
import { v4 as uuidv4 } from 'uuid';

@Service()
export class ContextManager {
  constructor(
    private readonly memoryManager: MemoryManager,
    private readonly attentionMechanism: AttentionMechanism
  ) {}

  async enrichContext(context: ContextData): Promise<EnrichedContext> {
    try {
      // Store current context as memory
      await this.storeContextMemory(context);

      // Retrieve relevant memories
      const memories = await this.retrieveRelevantMemories(context);

      // Apply attention mechanism
      const focusedContext = await this.attentionMechanism.focus({
        context,
        memories
      });

      // Enrich with additional context
      const enrichedContext = {
        ...focusedContext,
        temporalContext: await this.getTemporalContext(memories),
        spatialContext: await this.getSpatialContext(memories),
        domainContext: await this.getDomainContext(context, memories)
      };

      // Update memory importance based on usage
      await this.updateMemoryImportance(memories, context);

      return enrichedContext;
    } catch (error) {
      throw new ProcessingError('Context enrichment failed', error);
    }
  }

  private async storeContextMemory(context: ContextData): Promise<void> {
    const memory: Memory = {
      id: uuidv4(),
      type: 'conversation',
      content: {
        query: context.query,
        entities: context.entities,
        intent: context.intent
      },
      importance: this.calculateInitialImportance(context),
      created: new Date(),
      lastAccessed: new Date(),
      metadata: {
        projectContext: context.projectContext,
        userContext: context.userContext
      }
    };

    await this.memoryManager.storeMemory(memory);
  }

  private async retrieveRelevantMemories(context: ContextData): Promise<Memory[]> {
    // Define memory types to search based on context
    const memoryTypes = this.getRelevantMemoryTypes(context);

    return await this.memoryManager.retrieveMemories({
      types: memoryTypes,
      query: context.query,
      limit: 20,
      minImportance: 0.3
    });
  }

  private getRelevantMemoryTypes(context: ContextData): MemoryType[] {
    const types: MemoryType[] = ['conversation', 'project_context'];
    
    if (context.intent.type === 'code_generation') {
      types.push('code_context');
    }
    
    if (context.projectContext) {
      types.push('workflow_state');
    }

    return types;
  }

  private calculateInitialImportance(context: ContextData): number {
    let importance = 0.5; // Base importance

    // Adjust based on intent confidence
    importance += context.intent.confidence * 0.2;

    // Adjust based on entity count
    importance += Math.min(context.entities.length * 0.1, 0.2);

    // Cap importance between 0 and 1
    return Math.max(0, Math.min(1, importance));
  }

  private async updateMemoryImportance(
    memories: Memory[],
    context: ContextData
  ): Promise<void> {
    for (const memory of memories) {
      const importanceIncrease = this.calculateImportanceIncrease(memory, context);
      const newImportance = Math.min(1, memory.importance + importanceIncrease);

      await this.memoryManager.updateMemoryImportance(
        memory.type,
        memory.id,
        newImportance
      );
    }
  }

  private calculateImportanceIncrease(
    memory: Memory,
    context: ContextData
  ): number {
    // Base increase for being relevant
    let increase = 0.1;

    // Increase more if memory is recent
    const ageInHours = (Date.now() - memory.created.getTime()) / (1000 * 60 * 60);
    increase += Math.max(0, 0.1 - (ageInHours / 240) * 0.1); // Decay over 10 days

    // Increase if memory is related to current intent
    if (memory.content.intent?.type === context.intent.type) {
      increase += 0.1;
    }

    return increase;
  }

  private async getTemporalContext(memories: Memory[]): Promise<any> {
    // Implement temporal context extraction using memories
    return {
      recentActivities: memories
        .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime())
        .slice(0, 5)
        .map(m => m.content)
    };
  }

  private async getSpatialContext(memories: Memory[]): Promise<any> {
    // Implement spatial context extraction
    return {
      projectStructure: memories
        .filter(m => m.type === 'project_context')
        .map(m => m.content)
        .reduce((acc, curr) => ({ ...acc, ...curr }), {})
    };
  }

  private async getDomainContext(
    context: ContextData,
    memories: Memory[]
  ): Promise<any> {
    // Implement domain-specific context extraction
    return {
      domainKnowledge: memories
        .filter(m => m.type === 'code_context')
        .map(m => m.content),
      userPreferences: memories
        .filter(m => m.type === 'user_preference')
        .reduce((acc, curr) => ({ ...acc, ...curr.content }), {})
    };
  }
} 