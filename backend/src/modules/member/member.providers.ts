import { Member } from './member.model';

export const memberProviders = [
  {
    provide: 'MEMBER_REPOSITORY',
    useValue: Member,
  },
];
