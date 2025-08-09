module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests/integration'],
    testMatch: ['**/*.integration.ts'],
    transform: {
        '^.+\\.ts$': 'ts-jest',
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts'],
    moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^@client/(.*)$': '<rootDir>/client/$1',
        '^@tests/(.*)$': '<rootDir>/tests/$1',
        '^@scripts/(.*)$': '<rootDir>/scripts/$1',
    },
    testTimeout: 60000,
    testSequencer: '<rootDir>/tests/integration/sequencer.js',
};
