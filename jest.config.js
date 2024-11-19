module.exports = {
    testEnvironment: 'node',
    testTimeout: 30000,
    testMatch: [
        "**/tests/**/*.test.js"
    ],
    verbose: true,
    collectCoverage: true,
    coverageDirectory: "coverage",
    coverageReporters: [
        "text",
        "lcov"
    ]
} 