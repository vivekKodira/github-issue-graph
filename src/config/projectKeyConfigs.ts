import { PROJECT_KEYS } from './projectKeys';
import { ProjectKeyConfig } from '@/types/projectKeys';

export const PROJECT_KEY_CONFIGS: Record<string, ProjectKeyConfig> = {
  [PROJECT_KEYS.SIZE]: {
    key: PROJECT_KEYS.SIZE,
    label: 'Size',
    required: true,
    type: 'text' as const,
    value: PROJECT_KEYS.SIZE,
    placeholder: 'Size of the task. Values: VS, S, M, C, VC.'
  },
  [PROJECT_KEYS.SPRINT]: {
    key: PROJECT_KEYS.SPRINT,
    label: 'Sprint',
    required: true,
    type: 'text' as const,
    value: PROJECT_KEYS.SPRINT,
    placeholder: 'Sprint number or name. Ex: Sprint 1, Sprint 2.'
  },
  [PROJECT_KEYS.ESTIMATE_DAYS]: {
    key: PROJECT_KEYS.ESTIMATE_DAYS,
    label: 'Estimate (days)',
    required: true,
    type: 'text' as const,
    value: PROJECT_KEYS.ESTIMATE_DAYS,
    placeholder: 'Custom field to store estimated effort for a task. Ex: "Estimate (days)"'
  },
  [PROJECT_KEYS.ACTUAL_DAYS]: {
    key: PROJECT_KEYS.ACTUAL_DAYS,
    label: 'Actual (days)',
    required: true,
    type: 'text' as const,
    value: PROJECT_KEYS.ACTUAL_DAYS,
    placeholder: 'Custom field to store acutal effort for a task. Ex: "Actual (days)"'
  }
}; 