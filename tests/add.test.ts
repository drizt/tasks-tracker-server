import { describe, expect, it } from '@jest/globals';

async function sum(a: number, b: number) {
  return a + b;
}

describe('add', () => {
  it('check add function', async () => {
    await expect(sum(1, 2)).resolves.toBe(3);
  });
});
