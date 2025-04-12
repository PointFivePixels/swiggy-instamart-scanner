export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }],
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/types.ts'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  setupFiles: ['dotenv/config'],
};
