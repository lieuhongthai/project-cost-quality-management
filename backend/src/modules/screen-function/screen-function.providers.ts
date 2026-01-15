import { ScreenFunction } from './screen-function.model';
import { PhaseScreenFunction } from './phase-screen-function.model';

export const screenFunctionProviders = [
  {
    provide: 'SCREEN_FUNCTION_REPOSITORY',
    useValue: ScreenFunction,
  },
  {
    provide: 'PHASE_SCREEN_FUNCTION_REPOSITORY',
    useValue: PhaseScreenFunction,
  },
];
