import { Phase } from './phase.model';

export const phaseProviders = [
  {
    provide: 'PHASE_REPOSITORY',
    useValue: Phase,
  },
];
