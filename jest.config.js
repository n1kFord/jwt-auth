module.exports = {
    testEnvironment: "node",
    testMatch: ["**/__tests__/**/*.js", "**/?(*.)+(spec|test).js"],
    setupFilesAfterEnv: ["./jest.setup.js"],
    collectCoverageFrom: [
        "src/**/*.js",
        "!src/**/__tests__/**",
        "!src/index.js",
        "!src/config/constants.js",
    ],
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    verbose: true,
    testTimeout: 10000,
};
