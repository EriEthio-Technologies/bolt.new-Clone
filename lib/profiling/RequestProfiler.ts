import { Service } from 'typedi';
import { PerformanceMonitoringService } from '~/services/monitoring/PerformanceMonitoringService';

interface ProfilePoint {
  name: string;
  startTime: number;
  endTime?: number;
  children: ProfilePoint[];
}

@Service()
export class RequestProfiler {
  private readonly activeProfiles = new Map<string, ProfilePoint>();
  
  constructor(private readonly monitoring: PerformanceMonitoringService) {}

  startProfiling(requestId: string, name: string): void {
    const profile: ProfilePoint = {
      name,
      startTime: performance.now(),
      children: []
    };

    this.activeProfiles.set(requestId, profile);
  }

  addProfilePoint(requestId: string, name: string): (() => void) {
    const parentProfile = this.activeProfiles.get(requestId);
    if (!parentProfile) return () => {};

    const point: ProfilePoint = {
      name,
      startTime: performance.now(),
      children: []
    };

    parentProfile.children.push(point);

    return () => {
      point.endTime = performance.now();
      this.recordMetrics(point);
    };
  }

  endProfiling(requestId: string): void {
    const profile = this.activeProfiles.get(requestId);
    if (!profile) return;

    profile.endTime = performance.now();
    this.recordMetrics(profile);
    this.activeProfiles.delete(requestId);
  }

  private recordMetrics(point: ProfilePoint): void {
    const duration = point.endTime! - point.startTime;

    this.monitoring.trackMetric({
      name: 'request.profiling.duration',
      value: duration,
      unit: 'ms',
      tags: { 
        operation: point.name,
        hasChildren: point.children.length > 0 ? 'true' : 'false'
      }
    });

    if (duration > 100) {
      console.warn(`Slow operation detected: ${point.name} took ${duration}ms`);
    }
  }
}