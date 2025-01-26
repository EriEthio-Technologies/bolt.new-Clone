import { Container } from 'typedi';
import { NLPProcessor } from './processors/NLPProcessor';
import { KnowledgeGraph } from './knowledge/KnowledgeGraph';
import { InferenceEngine } from './reasoning/InferenceEngine';
import { ContextManager } from './context/ContextManager';
import { EmotionalProcessor } from './emotional/EmotionalProcessor';
import { CausalReasoner } from './reasoning/CausalReasoner';
import { WorkflowEngine } from './workflow/WorkflowEngine';
import { ErrorHandler } from '~/utils/ErrorHandler';
import { RetryManager } from '~/utils/RetryManager';
import { CircuitBreaker } from '~/utils/CircuitBreaker';
import type { 
  AIResponse, 
  ContextData, 
  ReasoningChain,
  ProcessingStage,
  ErrorMetadata
} from '~/types/ai';
import { AIServiceError } from '~/errors/AIServiceError';

@Service()
export class AIService {
  private readonly retryManager: RetryManager;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly errorHandler: ErrorHandler;

  constructor(
    private readonly nlpProcessor: NLPProcessor,
    private readonly knowledgeGraph: KnowledgeGraph,
    private readonly inferenceEngine: InferenceEngine,
    private readonly contextManager: ContextManager,
    private readonly emotionalProcessor: EmotionalProcessor,
    private readonly causalReasoner: CausalReasoner,
    private readonly workflowEngine: WorkflowEngine
  ) {
    this.retryManager = new RetryManager({
      maxRetries: 3,
      backoffFactor: 1.5,
      initialDelay: 1000
    });

    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000
    });

    this.errorHandler = new ErrorHandler();
  }

  async processQuery(query: string, context: ContextData): Promise<AIResponse> {
    const processingStages: ProcessingStage[] = [];
    
    try {
      // Circuit breaker check
      await this.circuitBreaker.ensureAvailable();

      // 1. Process natural language and extract entities
      const nlpResult = await this.executeWithRetry(
        'nlp_processing',
        async () => this.nlpProcessor.process(query, context),
        { critical: true }
      );
      processingStages.push({ stage: 'nlp', result: nlpResult });

      // 2. Build context understanding
      const enrichedContext = await this.executeWithRetry(
        'context_enrichment',
        async () => this.contextManager.enrichContext({
          query,
          ...nlpResult,
          ...context
        })
      );
      processingStages.push({ stage: 'context', result: enrichedContext });

      // 3. Perform causal and abductive reasoning
      const reasoningChain = await this.executeWithRetry(
        'reasoning',
        async () => this.causalReasoner.analyze({
          context: enrichedContext,
          knowledgeGraph: this.knowledgeGraph
        })
      );
      processingStages.push({ stage: 'reasoning', result: reasoningChain });

      // 4. Generate workflow plan
      const workflowPlan = await this.executeWithRetry(
        'workflow_planning',
        async () => this.workflowEngine.createPlan(reasoningChain)
      );
      processingStages.push({ stage: 'workflow', result: workflowPlan });

      // 5. Execute workflow and gather results
      const executionResults = await this.executeWithRetry(
        'workflow_execution',
        async () => this.workflowEngine.execute(workflowPlan)
      );
      processingStages.push({ stage: 'execution', result: executionResults });

      // 6. Process emotional context
      const emotionalContext = await this.executeWithRetry(
        'emotional_processing',
        async () => this.emotionalProcessor.analyze(query)
      );
      processingStages.push({ stage: 'emotional', result: emotionalContext });

      // 7. Generate final response
      return await this.executeWithRetry(
        'response_generation',
        async () => this.generateResponse({
          results: executionResults,
          reasoning: reasoningChain,
          emotional: emotionalContext
        })
      );

    } catch (error) {
      // Handle errors with context
      const errorMetadata: ErrorMetadata = {
        query,
        processingStages,
        lastStage: processingStages[processingStages.length - 1]?.stage,
        context: enrichedContext
      };

      // Record failure in circuit breaker
      this.circuitBreaker.recordFailure();

      // Handle error and generate fallback response
      return this.handleProcessingError(error, errorMetadata);
    }
  }

  private async executeWithRetry<T>(
    operation: string,
    fn: () => Promise<T>,
    options: { critical?: boolean } = {}
  ): Promise<T> {
    try {
      return await this.retryManager.execute(fn);
    } catch (error) {
      if (options.critical) {
        throw new AIServiceError(
          `Critical operation failed: ${operation}`,
          error,
          'CRITICAL_FAILURE'
        );
      }
      // For non-critical failures, log and return fallback
      this.errorHandler.handle(error, { operation });
      return this.getFallbackResult(operation);
    }
  }

  private async generateResponse(data: {
    results: any;
    reasoning: ReasoningChain;
    emotional: any;
  }): Promise<AIResponse> {
    try {
      return await this.inferenceEngine.generateResponse(data);
    } catch (error) {
      throw new AIServiceError('Response generation failed', error);
    }
  }

  private async handleProcessingError(
    error: Error,
    metadata: ErrorMetadata
  ): Promise<AIResponse> {
    // Log error with context
    this.errorHandler.handle(error, metadata);

    // Generate graceful fallback response
    return {
      text: this.getErrorResponse(error, metadata),
      reasoning: this.getFallbackReasoning(metadata),
      confidence: 0.5,
      suggestedActions: this.getFallbackActions(metadata)
    };
  }

  private getErrorResponse(error: Error, metadata: ErrorMetadata): string {
    // Generate user-friendly error message based on context
    const stage = metadata.lastStage;
    const templates = {
      nlp: "I'm having trouble understanding your request. Could you rephrase it?",
      context: "I'm missing some context. Could you provide more details?",
      reasoning: "I'm having trouble reasoning about this problem.",
      workflow: "I couldn't create a plan to handle your request.",
      execution: "I encountered an error while processing your request.",
      emotional: "I couldn't properly analyze the context of your request.",
      default: "An unexpected error occurred. Please try again."
    };

    return templates[stage] || templates.default;
  }

  private getFallbackReasoning(metadata: ErrorMetadata): ReasoningChain {
    return {
      steps: [{
        type: 'deductive',
        description: 'Fallback reasoning due to error',
        evidence: [],
        confidence: 0.5
      }],
      confidence: 0.5,
      alternatives: []
    };
  }

  private getFallbackActions(metadata: ErrorMetadata): Action[] {
    return [{
      type: 'error_recovery',
      description: 'Try alternative approach',
      parameters: {
        suggestedAction: 'rephrase_request',
        context: metadata.lastStage
      }
    }];
  }

  private getFallbackResult(operation: string): any {
    // Provide sensible defaults for different operations
    const fallbacks = {
      nlp_processing: { entities: [], intent: { type: 'unknown', confidence: 0.5 } },
      context_enrichment: { context: {}, confidence: 0.5 },
      reasoning: { steps: [], confidence: 0.5 },
      workflow_planning: { steps: [], fallback: true },
      workflow_execution: { success: false, fallback: true },
      emotional_processing: { sentiment: 'neutral', confidence: 0.5 }
    };

    return fallbacks[operation] || {};
  }
} 