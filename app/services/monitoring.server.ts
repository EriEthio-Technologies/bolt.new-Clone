import { Request, Response } from 'express';
import { EventEmitter } from 'events';

export class MonitoringService {
  private static instance: MonitoringService;
  private eventEmitter: EventEmitter;
  private alertThresholds: Map<string, number>;

  private constructor() {
    this.eventEmitter = new EventEmitter();
    this.alertThresholds = new Map();
    this.setupDefaultThresholds();
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  private setupDefaultThresholds() {
    this.alertThresholds.set('errorRate', 0.05); // 5% error rate threshold
    this.alertThresholds.set('responseTime', 1000); // 1 second response time threshold
    this.alertThresholds.set('memoryUsage', 0.9); // 90% memory usage threshold
  }

  public monitorRequest(req: Request, res: Response): void {
    const startTime = Date.now();

    res.on('finish', () => {
      const responseTime = Date.now() - startTime;
      const statusCode = res.statusCode;

      this.recordMetric('responseTime', responseTime);
      this.recordMetric('statusCode', statusCode);

      // Check thresholds and emit alerts if necessary
      if (responseTime > this.alertThresholds.get('responseTime')!) {
        this.emitAlert('highResponseTime', {
          path: req.path,
          responseTime,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  private recordMetric(name: string, value: number): void {
    // TODO: Implement metric recording logic (e.g., to Prometheus or CloudWatch)
    console.log(`Metric: ${name} = ${value}`);
  }

  public emitAlert(type: string, data: any): void {
    this.eventEmitter.emit('alert', {
      type,
      data,
      timestamp: new Date().toISOString()
    });
  }

  public onAlert(callback: (alert: any) => void): void {
    this.eventEmitter.on('alert', callback);
  }
}

export default MonitoringService.getInstance();