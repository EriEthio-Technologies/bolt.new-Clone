import { Service } from 'typedi';
import { UIMonitor } from './UIMonitor';
import { DebugService } from '../debug/DebugService';
import { AnalyticsService } from './AnalyticsService';

interface Experiment {
  id: string;
  name: string;
  variants: {
    id: string;
    name: string;
    weight: number;
  }[];
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
}

interface ExperimentAssignment {
  userId: string;
  experimentId: string;
  variantId: string;
  assignedAt: Date;
}

@Service()
export class ABTestingService {
  private uiMonitor: UIMonitor;
  private debug: DebugService;
  private analytics: AnalyticsService;
  private experiments: Map<string, Experiment> = new Map();
  private assignments: Map<string, ExperimentAssignment> = new Map();

  constructor() {
    this.uiMonitor = new UIMonitor();
    this.debug = new DebugService();
    this.analytics = new AnalyticsService();
  }

  async createExperiment(params: {
    name: string;
    variants: Omit<Experiment['variants'][0], 'id'>[];
    startDate?: Date;
    endDate?: Date;
  }): Promise<Experiment> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'ABTestingService', 'Creating experiment', params);

      const experiment: Experiment = {
        id: `exp_${Date.now()}`,
        name: params.name,
        variants: params.variants.map(v => ({
          ...v,
          id: `var_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        })),
        startDate: params.startDate || new Date(),
        endDate: params.endDate,
        isActive: true
      };

      this.experiments.set(experiment.id, experiment);

      await this.analytics.trackEvent({
        category: 'experiment',
        action: 'create',
        label: experiment.name
      });

      await this.uiMonitor.trackLoadingState({
        component: 'ABTestingService',
        duration: Date.now() - startTime,
        variant: 'createExperiment',
        hasOverlay: false
      });

      return experiment;
    } catch (error) {
      this.debug.log('error', 'ABTestingService', 'Failed to create experiment', { error });
      throw error;
    }
  }

  async assignVariant(params: {
    userId: string;
    experimentId: string;
  }): Promise<string> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'ABTestingService', 'Assigning variant', params);

      const experiment = this.experiments.get(params.experimentId);
      if (!experiment || !experiment.isActive) {
        throw new Error(`Experiment ${params.experimentId} not found or inactive`);
      }

      const assignmentKey = `${params.userId}_${params.experimentId}`;
      const existing = this.assignments.get(assignmentKey);
      if (existing) {
        return existing.variantId;
      }

      // Weighted random selection
      const totalWeight = experiment.variants.reduce((sum, v) => sum + v.weight, 0);
      let random = Math.random() * totalWeight;
      let selectedVariant = experiment.variants[0];

      for (const variant of experiment.variants) {
        random -= variant.weight;
        if (random <= 0) {
          selectedVariant = variant;
          break;
        }
      }

      const assignment: ExperimentAssignment = {
        userId: params.userId,
        experimentId: params.experimentId,
        variantId: selectedVariant.id,
        assignedAt: new Date()
      };

      this.assignments.set(assignmentKey, assignment);

      await this.analytics.trackEvent({
        category: 'experiment',
        action: 'assign',
        label: experiment.name,
        metadata: {
          variantId: selectedVariant.id,
          variantName: selectedVariant.name
        }
      });

      await this.uiMonitor.trackLoadingState({
        component: 'ABTestingService',
        duration: Date.now() - startTime,
        variant: 'assignVariant',
        hasOverlay: false
      });

      return selectedVariant.id;
    } catch (error) {
      this.debug.log('error', 'ABTestingService', 'Failed to assign variant', { error });
      throw error;
    }
  }

  async trackConversion(params: {
    userId: string;
    experimentId: string;
    conversionValue?: number;
  }): Promise<void> {
    const startTime = Date.now();

    try {
      this.debug.log('info', 'ABTestingService', 'Tracking conversion', params);

      const assignmentKey = `${params.userId}_${params.experimentId}`;
      const assignment = this.assignments.get(assignmentKey);
      if (!assignment) {
        throw new Error(`No variant assignment found for user ${params.userId} in experiment ${params.experimentId}`);
      }

      await this.analytics.trackEvent({
        category: 'experiment',
        action: 'conversion',
        label: this.experiments.get(params.experimentId)?.name,
        value: params.conversionValue,
        metadata: {
          variantId: assignment.variantId
        }
      });

      await this.uiMonitor.trackLoadingState({
        component: 'ABTestingService',
        duration: Date.now() - startTime,
        variant: 'trackConversion',
        hasOverlay: false
      });
    } catch (error) {
      this.debug.log('error', 'ABTestingService', 'Failed to track conversion', { error });
      throw error;
    }
  }
} 