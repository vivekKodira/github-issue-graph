export const PROJECT_KEYS = {
    SIZE: 'Size',
    SPRINT: 'Sprint',
    ACTUAL_DAYS: 'Actual (days)',
    ESTIMATE_DAYS: 'Estimate (days)',
} as const;

// Type for the keys to ensure type safety
export type ProjectKeyType = typeof PROJECT_KEYS[keyof typeof PROJECT_KEYS]; 