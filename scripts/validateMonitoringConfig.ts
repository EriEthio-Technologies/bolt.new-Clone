import { readFile } from 'fs/promises';
import { join } from 'path';
import * as z from 'zod';

const MetricSchema = z.object({
  type: z.string().startsWith('custom.googleapis.com/'),
  labels: z.record(z.string()).optional()
});

const TimeSeriesSchema = z.object({
  metric: MetricSchema,
  resource: z.object({
    type: z.string(),
    labels: z.record(z.string())
  }),
  points: z.array(z.object({
    interval: z.object({
      endTime: z.object({
        seconds: z.number()
      })
    }),
    value: z.object({
      doubleValue: z.number()
    })
  }))
});

const DashboardSchema = z.object({
  displayName: z.string(),
  gridLayout: z.object({
    columns: z.string(),
    widgets: z.array(z.object({
      title: z.string(),
      xyChart: z.object({
        dataSets: z.array(z.object({
          timeSeriesQuery: z.object({
            timeSeriesFilter: z.object({
              filter: z.string(),
              aggregation: z.object({
                alignmentPeriod: z.string(),
                perSeriesAligner: z.string()
              })
            })
          }).optional()
        }))
      })
    }))
  }),
  alerts: z.array(z.object({
    displayName: z.string(),
    documentation: z.string(),
    conditions: z.array(z.object({
      displayName: z.string(),
      conditionThreshold: z.object({
        filter: z.string(),
        comparison: z.string(),
        threshold: z.number(),
        duration: z.string()
      })
    }))
  }))
});

async function validateDashboardConfig(path: string): Promise<void> {
  try {
    const content = await readFile(path, 'utf-8');
    const config = JSON.parse(content);
    
    await DashboardSchema.parseAsync(config);
    console.log(`✅ Dashboard config at ${path} is valid`);
  } catch (error) {
    console.error(`❌ Invalid dashboard config at ${path}:`, error);
    process.exit(1);
  }
}

// Validate all monitoring dashboards
async function validateAllDashboards(): Promise<void> {
  const dashboards = [
    'monitoring/dashboards/versioning.json',
    'monitoring/dashboards/persistence.json',
    'monitoring/dashboards/performance.json'
  ];

  for (const dashboard of dashboards) {
    await validateDashboardConfig(join(process.cwd(), dashboard));
  }
}

validateAllDashboards().catch(console.error); 