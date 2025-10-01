// FILE: __tests__/fastFoodProducts.test.js
// Import from utils (preferred) or keep your existing import from the component
import { toBool, isPopularItem, paginate } from '@/app/lib/product-utils';

describe('toBool', () => {
  test.each([
    [true, true], [1, true], ['1', true], ['true', true], ['TRUE', true],
    [false, false], [0, false], ['0', false], ['false', false], [null, false], [undefined, false],
  ])('toBool(%p) === %p', (input, expected) => {
    expect(toBool(input)).toBe(expected);
  });
});

describe('isPopularItem', () => {
  it('detects flags', () => {
    expect(isPopularItem({ isPopular: true })).toBe(true);
    expect(isPopularItem({ popular: '1' })).toBe(true);
    expect(isPopularItem({ featured: 1 })).toBe(true);
  });
  it('detects tags (case-insensitive)', () => {
    expect(isPopularItem({ tags: ['Popular'] })).toBe(true);
    expect(isPopularItem({ tags: ['promo', 'POPULAR'] })).toBe(true);
  });
  it('false when no signals', () => {
    expect(isPopularItem({})).toBe(false);
    expect(isPopularItem({ tags: ['new'] })).toBe(false);
  });
});

describe('paginate', () => {
  const arr = Array.from({ length: 10 }, (_, i) => i + 1);
  it('first page', () => {
    expect(paginate(arr, 1, 3)).toEqual([1, 2, 3]);
  });
  it('middle page', () => {
    expect(paginate(arr, 2, 4)).toEqual([5, 6, 7, 8]);
  });
  it('last partial page', () => {
    expect(paginate(arr, 4, 3)).toEqual([10]);
  });
  it('out of range => empty', () => {
    expect(paginate(arr, 5, 3)).toEqual([]);
  });
  it('invalid args => empty', () => {
    expect(paginate(arr, 0, 3)).toEqual([]);
    expect(paginate(arr, 1, 0)).toEqual([]);
    expect(paginate(null, 1, 3)).toEqual([]);
  });
});
