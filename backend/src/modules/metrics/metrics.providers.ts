import { Metrics } from './metrics.model';

export const metricsProviders = [
  {
    provide: 'METRICS_REPOSITORY',
    useValue: Metrics,
  },
];
