import { Commentary } from './commentary.model';

export const commentaryProviders = [
  {
    provide: 'COMMENTARY_REPOSITORY',
    useValue: Commentary,
  },
];
