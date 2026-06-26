/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: './environment',
  testRunner: 'jest-circus/runner',
  testTimeout: 120000,
  globalSetup: './setup.ts',
  globalTeardown: './teardown.ts',
  testMatch: ['**/*.spec.ts'],
  reporters: ['detox/runners/jest/reporter'],
  verbose: true,
};
