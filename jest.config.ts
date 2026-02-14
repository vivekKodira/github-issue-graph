export default {
  testTimeout: 10000, // 10 second timeout for all tests
  projects: [
    {
      displayName: 'unit',
      preset: 'ts-jest',
      testEnvironment: 'node',
      testTimeout: 5000, // 5 second timeout for unit tests
      moduleNameMapper: {
        '^.*/db/rxdb$': '<rootDir>/src/test/__mocks__/rxdb.ts',
        '^@/(.*)\\.js$': '<rootDir>/src/$1',
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.\\.?/.*)\\.js$': '$1',
      },
      testMatch: ['<rootDir>/src/**/*.test.ts'],
      transform: {
        '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
          tsconfig: {
            paths: {
              '@/*': ['./src/*']
            },
            allowJs: true,
            module: 'esnext',
            target: 'esnext',
            jsx: 'react',
            jsxFactory: 'React.createElement',
            jsxFragmentFactory: 'React.Fragment',
            esModuleInterop: true,
            isolatedModules: true
          }
        }]
      }
    },
    {
      displayName: 'component',
      preset: 'ts-jest',
      testEnvironment: 'jsdom',
      testTimeout: 10000, // 10 second timeout for component tests
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleNameMapper: {
        '^.*/db/rxdb$': '<rootDir>/src/test/__mocks__/rxdb.ts',
        '^@chakra-ui/react$': '<rootDir>/src/test/__mocks__/chakra.tsx',
        '^@/(.*)\\.js$': '<rootDir>/src/$1',
        '^@/(.*)$': '<rootDir>/src/$1',
        'echarts-wordcloud': '<rootDir>/src/test/__mocks__/emptyModule.ts',
        'echarts-liquidfill': '<rootDir>/src/test/__mocks__/emptyModule.ts',
        '\\.(css|less|scss|sass)$': '<rootDir>/src/test/__mocks__/emptyModule.ts',
      },
      testMatch: ['<rootDir>/src/**/*.test.tsx'],
      setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
      transform: {
        '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
          tsconfig: {
            paths: {
              '@/*': ['./src/*']
            },
            allowJs: true,
            module: 'esnext',
            target: 'esnext',
            jsx: 'react',
            jsxFactory: 'React.createElement',
            jsxFragmentFactory: 'React.Fragment',
            esModuleInterop: true,
            isolatedModules: true
          }
        }]
      }
    },
  ],
  collectCoverageFrom: [
    'src/components/ui/ECharts/**/*.{ts,tsx}',
    'src/components/ui/IssueGraph/**/*.{ts,tsx}',
    'src/util/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!**/*.test.*',
  ],
  coverageReporters: ['text', 'text-summary', 'html'],
  coverageDirectory: 'coverage',
};
