import { Service } from 'typedi';
import { BertTokenizer, BertModel } from '@xenova/transformers';
import { NERProcessor } from './NERProcessor';
import type { NLPResult, Entity, Intent, IntentContext } from '~/types/ai';
import { IntentClassifier } from './IntentClassifier';
import { ProcessingError } from '~/errors/ProcessingError';

@Service()
export class NLPProcessor {
  private tokenizer: BertTokenizer;
  private model: BertModel;
  private nerProcessor: NERProcessor;
  private intentClassifier: IntentClassifier;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    try {
      this.tokenizer = await BertTokenizer.from_pretrained('bert-base-uncased');
      this.model = await BertModel.from_pretrained('bert-base-uncased');
      this.nerProcessor = new NERProcessor();
      this.intentClassifier = new IntentClassifier();
    } catch (error) {
      throw new ProcessingError('Failed to initialize NLP processor', error);
    }
  }

  async process(text: string, context: IntentContext): Promise<NLPResult> {
    try {
      // Get tokens and embeddings
      const tokens = await this.tokenizer.tokenize(text);
      const embeddings = await this.model.encode(tokens);
      
      // Extract entities
      const { entities, entityGroups } = await this.nerProcessor.extractEntities(text);
      
      // Classify intent
      const intent = await this.intentClassifier.classifyIntent(text, {
        ...context,
        entities,
        entityGroups
      });

      return {
        tokens,
        embeddings,
        entities,
        entityGroups,
        intent
      };
    } catch (error) {
      throw new ProcessingError('NLP processing failed', error);
    }
  }
} 