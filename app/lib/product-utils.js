// FILE: app/lib/product-utils.js
/**
 * Pure, reusable helpers for products.
 * Use across components and tests to avoid duplication.
 */

/** @param {unknown} v */
export function toBool(v) {
  if (typeof v === 'string') return ['1', 'true', 'yes'].includes(v.toLowerCase());
  return v === true || v === 1;
}

/** @param {{isPopular?:unknown;popular?:unknown;featured?:unknown;tags?:unknown[]}} item */
export function isPopularItem(item = {}) {
  if (toBool(item.isPopular) || toBool(item.popular) || toBool(item.featured)) return true;
  const tags = Array.isArray(item.tags) ? item.tags : [];
  return tags.some((t) => String(t).trim().toLowerCase() === 'popular');
}

/** @template T @param {T[]|null|undefined} arr @param {number} page @param {number} per */
export function paginate(arr, page, per) {
  if (!Array.isArray(arr) || page < 1 || per < 1) return [];
  const start = (page - 1) * per;
  if (start >= arr.length) return [];
  return arr.slice(start, start + per);
}
