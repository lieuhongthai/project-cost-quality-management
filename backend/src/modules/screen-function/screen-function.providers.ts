import { ScreenFunction } from './screen-function.model';

export const screenFunctionProviders = [
  {
    provide: 'SCREEN_FUNCTION_REPOSITORY',
    useValue: ScreenFunction,
  },
];
