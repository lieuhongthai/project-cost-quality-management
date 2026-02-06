import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { createContext } from 'react';
import { createContextualCan, useAbility } from '@casl/react';

export type Actions = 'manage' | 'read' | 'create' | 'update' | 'delete';
export type Subjects =
  | 'project'
  | 'phase'
  | 'effort'
  | 'testing'
  | 'report'
  | 'metrics'
  | 'settings'
  | 'user'
  | 'role'
  | 'position'
  | 'member'
  | 'all';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export const createAppAbility = () => createMongoAbility<[Actions, Subjects]>([]);

export const buildAbilityRules = (permissions: string[]) => {
  const { can, rules } = new AbilityBuilder<AppAbility>(createMongoAbility);

  permissions.forEach((permission) => {
    const [subject, action] = permission.split('.');
    if (!subject || !action) return;
    const normalizedSubject = subject as Subjects;
    const normalizedAction = action as Actions;
    if (normalizedSubject && normalizedAction) {
      can(normalizedAction, normalizedSubject);
    }
  });

  return rules;
};

export const AbilityContext = createContext<AppAbility>(createAppAbility());
export const Can = createContextualCan(AbilityContext.Consumer);
export const useAppAbility = () => useAbility(AbilityContext);
