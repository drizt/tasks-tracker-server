// @ts-check

import { createDefaultEsmPreset } from 'ts-jest';

const config = {
  ...createDefaultEsmPreset(),
  moduleNameMapper: {
    '^\\.\\./src/(.*)\\.js$': '<rootDir>/src/$1.ts',
  },
};

export default config;
