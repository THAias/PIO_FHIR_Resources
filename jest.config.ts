import type { Config } from "@jest/types";

const config: Config.InitialOptions = {
    rootDir: "./",
    verbose: false,
    transform: {
        "^.+\\.(js|ts)$": "ts-jest",
    },
    testPathIgnorePatterns: ["node_modules", "\\.cache"],
    transformIgnorePatterns: ["node_modules"],
    collectCoverage: true,
    coverageReporters: ["text", "json", "html", ["lcov", { projectRoot: "." }], "cobertura"],
    reporters: ["default", "jest-junit"],
    testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],
    testResultsProcessor: "jest-sonar-reporter",
    setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
};

export default config;
