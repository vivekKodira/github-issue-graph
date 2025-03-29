import { createContext, useContext, ReactNode, useState } from 'react';
import { ProjectKeyConfig } from '@/types/projectKeys';
import { PROJECT_KEY_CONFIGS } from '@/config/projectKeyConfigs';

interface ProjectKeysContextType {
  projectKeys: Record<string, ProjectKeyConfig>;
  setProjectKeys: (keys: Record<string, ProjectKeyConfig>) => void;
}

const ProjectKeysContext = createContext<ProjectKeysContextType | undefined>(undefined);

export function ProjectKeysProvider({ children, initialKeys }: { children: ReactNode, initialKeys?: Record<string, ProjectKeyConfig> }) {
  const [projectKeys, setProjectKeys] = useState<Record<string, ProjectKeyConfig>>(initialKeys || PROJECT_KEY_CONFIGS);

  return (
    <ProjectKeysContext.Provider value={{ projectKeys, setProjectKeys }}>
      {children}
    </ProjectKeysContext.Provider>
  );
}

export function useProjectKeys() {
  const context = useContext(ProjectKeysContext);
  if (context === undefined) {
    throw new Error('useProjectKeys must be used within a ProjectKeysProvider');
  }
  return context;
} 