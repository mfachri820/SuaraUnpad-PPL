import { describe, expect, it } from 'vitest';
import { trimSlashes, trimTrailingSlashes } from '@/lib/slashes';

describe('slash helpers', () => {
  it('trimTrailingSlashes membuang semua slash di akhir saja', () => {
    expect(trimTrailingSlashes('https://a.b/c///')).toBe('https://a.b/c');
    expect(trimTrailingSlashes('/a/b')).toBe('/a/b');
    expect(trimTrailingSlashes('///')).toBe('');
    expect(trimTrailingSlashes('')).toBe('');
  });

  it('trimSlashes membuang slash di awal dan akhir', () => {
    expect(trimSlashes('//suara-mipa/posts//')).toBe('suara-mipa/posts');
    expect(trimSlashes('a/b')).toBe('a/b');
    expect(trimSlashes('/')).toBe('');
  });
});
