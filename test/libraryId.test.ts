import { describe, expect, it } from 'vitest';
import { libraryId } from '../src/index.js';

describe('libraryId', () => {
  it('returns the library identifier', () => {
    expect(libraryId()).toBe('blog-pipeline');
  });
});
