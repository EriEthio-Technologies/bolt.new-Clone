import { Monitoring as GCPMonitoring } from '@google-cloud/monitoring'
import { MetricDescriptor } from '@google-cloud/monitoring/build/protos/protos'

export class Monitoring {
    private client: GCPMonitoring.MetricServiceClient
    private projectId: string
    private namespace: string

    constructor(config: { projectId: string, namespace: string }) {
        this.client = new GCPMonitoring.MetricServiceClient()
        this.projectId = config.projectId
        this.namespace = config.namespace
    }

    private createMetricPath(name: string): string {
        return `custom.googleapis.com/${this.namespace}/${name}`
    }

    counter(name: string) {
        const metricType = this.createMetricPath(name)
        
        return {
            inc: async (labels: Record<string, string> = {}) => {
                const dataPoint = {
                    interval: {
                        endTime: {
                            seconds: Date.now() / 1000,
                        },
                    },
                    value: {
                        int64Value: 1,
                    },
                }

                const timeSeriesData = {
                    metric: {
                        type: metricType,
                        labels,
                    },
                    resource: {
                        type: 'global',
                        labels: {
                            project_id: this.projectId,
                        },
                    },
                    points: [dataPoint],
                }

                const request = {
                    name: this.client.projectPath(this.projectId),
                    timeSeries: [timeSeriesData],
                }

                await this.client.createTimeSeries(request)
            },
        }
    }

    gauge(name: string, getValue: () => number) {
        const metricType = this.createMetricPath(name)
        
        return {
            set: async (labels: Record<string, string> = {}) => {
                const value = getValue()
                
                const dataPoint = {
                    interval: {
                        endTime: {
                            seconds: Date.now() / 1000,
                        },
                    },
                    value: {
                        doubleValue: value,
                    },
                }

                const timeSeriesData = {
                    metric: {
                        type: metricType,
                        labels,
                    },
                    resource: {
                        type: 'global',
                        labels: {
                            project_id: this.projectId,
                        },
                    },
                    points: [dataPoint],
                }

                const request = {
                    name: this.client.projectPath(this.projectId),
                    timeSeries: [timeSeriesData],
                }

                await this.client.createTimeSeries(request)
            },
        }
    }

    histogram(name: string) {
        const metricType = this.createMetricPath(name)
        
        return {
            observe: async (value: number, labels: Record<string, string> = {}) => {
                const dataPoint = {
                    interval: {
                        endTime: {
                            seconds: Date.now() / 1000,
                        },
                    },
                    value: {
                        distributionValue: {
                            count: 1,
                            mean: value,
                            sumOfSquaredDeviation: 0,
                            bucketOptions: {
                                exponentialBuckets: {
                                    numFiniteBuckets: 10,
                                    growthFactor: 2,
                                    scale: 1,
                                },
                            },
                            bucketCounts: [value],
                        },
                    },
                }

                const timeSeriesData = {
                    metric: {
                        type: metricType,
                        labels,
                    },
                    resource: {
                        type: 'global',
                        labels: {
                            project_id: this.projectId,
                        },
                    },
                    points: [dataPoint],
                }

                const request = {
                    name: this.client.projectPath(this.projectId),
                    timeSeries: [timeSeriesData],
                }

                await this.client.createTimeSeries(request)
            },
        }
    }
} 