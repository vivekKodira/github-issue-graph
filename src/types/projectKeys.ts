export interface ProjectKeyConfig {
  key: string;
  label: string;
  required: boolean;
  type: 'text' | 'number';
  value: string;
  placeholder: string;
} 