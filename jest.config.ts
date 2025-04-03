import type { Config } from 'jest';

export default async (): Promise<Config> => {
  return {
    extensionsToTreatAsEsm: ['.ts', '.mts'],
    clearMocks: true,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: ['/node_modules/'],
    coverageProvider: 'v8',
    moduleDirectories: ['node_modules'],
    moduleFileExtensions: ['ts', 'js'],
    testEnvironment: 'node',
    transform: {
      '^.+\\.ts?$': ['ts-jest', { } ],
    },
    testMatch: ['**/__tests__/**/*.ts'],
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/src/$1',
    },
  };
};
