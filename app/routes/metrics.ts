import { Request, Response } from 'express';
import { MetricsService } from '~/services/MetricsService';

export async function metricsHandler(req: Request, res: Response) {
  try {
    const metrics = await MetricsService.getMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    console.error('Error while generating metrics:', error);
    res.status(500).send('Error generating metrics');
  }
}