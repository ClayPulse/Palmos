const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true }],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1", // <-- This maps '@/...' to the project root
  },
  extensionsToTreatAsEsm: [".ts"],
};

export default config;
