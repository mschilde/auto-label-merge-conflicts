module.exports = {
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  testRegex: '__tests__.*\\.(ts|js)$',
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/migration/',
    '/helpers/'
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true,
      tsConfig: './tsconfig.json'
    }
  },
  preset: 'ts-jest',
  testResultsProcessor: 'jest-sonar-reporter'
};
