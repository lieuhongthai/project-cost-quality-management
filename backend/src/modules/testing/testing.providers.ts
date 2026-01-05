import { Testing } from './testing.model';

export const testingProviders = [
  {
    provide: 'TESTING_REPOSITORY',
    useValue: Testing,
  },
];
