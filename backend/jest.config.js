export default {
    testEnvironment: 'node',
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    testMatch: [
        '**/tests/**/*.test.js',
        '**/src/**/*.test.js'
    ],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
        '!src/**/*.test.js'
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
    testTimeout: 10000,
    clearMocks: true,
    resetMocks: true,
    restoreMocks: true
};