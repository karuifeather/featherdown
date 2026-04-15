import { describe, expect, it } from 'vitest';
import { runtimeLabel } from '../src/index.js';

describe('runtimeLabel', () => {
  it('returns the package wiring identifier', () => {
    expect(runtimeLabel()).toBe('blog-pipeline');
  });
});
