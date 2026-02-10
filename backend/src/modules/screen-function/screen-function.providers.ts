import { ScreenFunction } from './screen-function.model';
import { ScreenFunctionDefaultMember } from './screen-function-default-member.model';

export const screenFunctionProviders = [
  {
    provide: 'SCREEN_FUNCTION_REPOSITORY',
    useValue: ScreenFunction,
  },
  {
    provide: 'SCREEN_FUNCTION_DEFAULT_MEMBER_REPOSITORY',
    useValue: ScreenFunctionDefaultMember,
  },
];
