import { describe, expect, it } from '@jest/globals';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { setDotEnvOption } from '../src/utils.ts';

function tempFile(): string {
  return path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-tracker-server-')),
    '.env',
  );
}

describe('setDotEnvOption', () => {
  it('updates existing keys without trimming surrounding blank lines', () => {
    const filename = tempFile();
    fs.writeFileSync(filename, '\r\nFOO=old\r\n\r\nBAR=value\r\n', 'utf8');

    setDotEnvOption(filename, 'FOO', 'new');

    expect(fs.readFileSync(filename, 'utf8')).toBe('\nFOO=new\n\nBAR=value\n');
  });

  it('appends keys to empty files', () => {
    const filename = tempFile();
    fs.writeFileSync(filename, '', 'utf8');

    setDotEnvOption(filename, 'FOO', 'bar');

    expect(fs.readFileSync(filename, 'utf8')).toBe('FOO=bar\n');
  });
});
