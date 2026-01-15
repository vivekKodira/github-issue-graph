import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDatabase, GitHubIssueGraphDatabase } from '@/db/rxdb';

interface RxDBContextType {
  db: GitHubIssueGraphDatabase | null;
  isReady: boolean;
  error: Error | null;
}

const RxDBContext = createContext<RxDBContextType>({
  db: null,
  isReady: false,
  error: null,
});

export const useRxDB = () => {
  const context = useContext(RxDBContext);
  if (!context) {
    throw new Error('useRxDB must be used within RxDBProvider');
  }
  return context;
};

export const RxDBProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<GitHubIssueGraphDatabase | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initDB = async () => {
      try {
        console.log('Initializing RxDB database...');
        const database = await getDatabase();
        setDb(database);
        setIsReady(true);
        setError(null);
        console.log('RxDB initialized successfully');
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error('Failed to initialize RxDB:', error);
        setError(error);
        setIsReady(false);
      }
    };

    initDB();

    // Cleanup on unmount
    return () => {
      if (db) {
        // Note: In a real app, you might not want to destroy the db on unmount
        // This is just for cleanup during development
        console.log('RxDB context cleanup');
      }
    };
  }, []);

  return (
    <RxDBContext.Provider value={{ db, isReady, error }}>
      {children}
    </RxDBContext.Provider>
  );
};

