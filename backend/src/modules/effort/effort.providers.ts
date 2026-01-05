import { Effort } from './effort.model';

export const effortProviders = [
  {
    provide: 'EFFORT_REPOSITORY',
    useValue: Effort,
  },
];
