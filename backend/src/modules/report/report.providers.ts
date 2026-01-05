import { Report } from './report.model';

export const reportProviders = [
  {
    provide: 'REPORT_REPOSITORY',
    useValue: Report,
  },
];
