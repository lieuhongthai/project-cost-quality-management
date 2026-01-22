import { Review } from './review.model';

export const reviewProviders = [
  {
    provide: 'REVIEW_REPOSITORY',
    useValue: Review,
  },
];
