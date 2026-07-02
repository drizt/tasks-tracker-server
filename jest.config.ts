// @ts-check

import { createDefaultEsmPreset } from 'ts-jest';

const preset = createDefaultEsmPreset();

const config = {
  ...preset,
  transform: {
    '^.+\\.m?tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          allowImportingTsExtensions: true,
          rewriteRelativeImportExtensions: false,
        },
      },
    ],
  },
};

export default config;
