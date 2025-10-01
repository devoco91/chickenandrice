// jest.config.mjs (project root)
import nextJest from 'next/jest.js';
const createJestConfig = nextJest({ dir: './' });

const customJestConfig = {
  testEnvironment: 'jsdom',
  testMatch: ['**/__tests__/**/*.(test|spec).{js,jsx,ts,tsx}'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
  transform: { '^.+\\.(js|jsx|ts|tsx)$': 'babel-jest' },
};

export default createJestConfig(customJestConfig);
