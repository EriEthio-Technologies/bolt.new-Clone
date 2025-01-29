import { Request, Response } from 'express';
import { MonitoringService } from '../../services/monitoring.server';
import { AppError } from '../../utils/errorHandler';

interface RequestProfile {
  id: string;
  path: string;
  method: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  statusCode?: number;
  error?: string;
  memory: {
    start: NodeJS.MemoryUsage;
    end?: NodeJS.MemoryUsage;
    diff?: {
      heapUsed: number;
      heapTotal: number;
      external: number;
      rss: number;
    };
  };
  cpu: {
    start: NodeJS.CpuUsage;
    end?: NodeJS.CpuUsage;
    diff?: {
      user: number;
      system: number;
    };
  };
  metadata: Record<string, any>;
}

export class RequestProfiler {
  private static instance: RequestProfiler;
  private readonly monitoring: MonitoringService;
  private activeProfiles: Map<string, RequestProfile>;
  private readonly samplingRate: number;

  private constructor() {
    this.monitoring = MonitoringService.getInstance();
    this.activeProfiles = new Map();
    this.samplingRate = Number(process.env.REQUEST_PROFILING_RATE) || 0.1; // 10% by default
    this.initialize();
  }

  public static getInstance(): RequestProfiler {
    if (!RequestProfiler.instance) {
      RequestProfiler.instance = new RequestProfiler();
    }
    return RequestProfiler.instance;
  }

  private initialize(): void {
    // Clean up stale profiles periodically
    setInterval(() => this.cleanupStaleProfiles(), 60000);

    // Report profiling statistics
    setInterval(() => {
      this.monitoring.emitAlert('profilingStats', {
        activeProfiles: this.activeProfiles.size,
        timestamp: new Date().toISOString()
      });
    }, 30000);
  }

  public startProfiling(req: Request): string | null {
    try {
      // Apply sampling rate
      if (Math.random() > this.samplingRate) {
        return null;
      }

      const id = Math.random().toString(36).substring(7);
      const profile: RequestProfile = {
        id,
        path: req.path,
        method: req.method,
        startTime: Date.now(),
        memory: {
          start: process.memoryUsage()
        },
        cpu: {
          start: process.cpuUsage()
        },
        metadata: {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          correlationId: req.headers['x-correlation-id']
        }
      };

      this.activeProfiles.set(id, profile);
      return id;
    } catch (error) {
      this.handleError('Failed to start profiling', error);
      return null;
    }
  }

  public endProfiling(id: string, res: Response): void {
    try {
      const profile = this.activeProfiles.get(id);
      if (!profile) return;

      profile.endTime = Date.now();
      profile.duration = profile.endTime - profile.startTime;
      profile.statusCode = res.statusCode;
      
      profile.memory.end = process.memoryUsage();
      profile.memory.diff = {
        heapUsed: profile.memory.end.heapUsed - profile.memory.start.heapUsed,
        heapTotal: profile.memory.end.heapTotal - profile.memory.start.heapTotal,
        external: profile.memory.end.external - profile.memory.start.external,
        rss: profile.memory.end.rss - profile.memory.start.rss
      };

      profile.cpu.end = process.cpuUsage(profile.cpu.start);
      profile.cpu.diff = {
        user: profile.cpu.end.user / 1000, // Convert to milliseconds
        system: profile.cpu.end.system / 1000
      };

      this.emitMetrics(profile);
      this.activeProfiles.delete(id);
    } catch (error) {
      this.handleError('Failed to end profiling', error);
    }
  }

  private emitMetrics(profile: RequestProfile): void {
    this.monitoring.emitAlert('requestProfile', {
      id: profile.id,
      path: profile.path,
      method: profile.method,
      duration: profile.duration,
      statusCode: profile.statusCode,
      memoryDiff: profile.memory.diff,
      cpuDiff: profile.cpu.diff,
      metadata: profile.metadata
    });

    // Emit memory-specific alerts if thresholds exceeded
    if (profile.memory.diff && profile.memory.diff.heapUsed > 50 * 1024 * 1024) { // 50MB
      this.monitoring.emitAlert('highMemoryUsage', {
        id: profile.id,
        path: profile.path,
        heapUsed: profile.memory.diff.heapUsed
      });
    }

    // Emit CPU-specific alerts if thresholds exceeded
    if (profile.cpu.diff && profile.cpu.diff.user > 100) { // 100ms
      this.monitoring.emitAlert('highCPUUsage', {
        id: profile.id,
        path: profile.path,
        cpuUsage: profile.cpu.diff
      });
    }
  }

  private cleanupStaleProfiles(): void {
    const now = Date.now();
    const staleTimeout = 5 * 60 * 1000; // 5 minutes
    
    for (const [id, profile] of this.activeProfiles.entries()) {
      if (now - profile.startTime > staleTimeout) {
        this.monitoring.emitAlert('staleProfile', {
          id,
          path: profile.path,
          duration: now - profile.startTime
        });
        this.activeProfiles.delete(id);
      }
    }
  }

  public setSamplingRate(rate: number): void {
    if (rate < 0 || rate > 1) {
      throw new AppError(400, 'Sampling rate must be between 0 and 1');
    }
    this.samplingRate = rate;
  }

  private handleError(message: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.monitoring.emitAlert('profilingError', { message, error: errorMessage });
    throw new AppError(500, `${message}: ${errorMessage}`);
  }
}

export default RequestProfiler.getInstance();