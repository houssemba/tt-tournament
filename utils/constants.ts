// Category constants and matching utilities

import type { Category, CategoryId } from '~/types/player'

export const CATEGORIES: Category[] = [
  {
    id: '500-799',
    label: '500-799',
    pattern: /500[- ]?799|tableau\s*1/i,
    sortOrder: 1,
  },
  {
    id: '500-999',
    label: '500-999',
    pattern: /500[- ]?999|tableau\s*2/i,
    sortOrder: 2,
  },
  {
    id: '500-1199',
    label: '500-1199',
    pattern: /500[- ]?1199|tableau\s*3/i,
    sortOrder: 3,
  },
  {
    id: '500-1399',
    label: '500-1399',
    pattern: /500[- ]?1399|tableau\s*4/i,
    sortOrder: 4,
  },
  {
    id: '500-1799',
    label: '500-1799',
    pattern: /500[- ]?1799|tableau\s*5/i,
    sortOrder: 5,
  },
  {
    id: 'tc-feminin',
    label: 'TC Féminin',
    pattern: /f[eé]minin|tc\s*f|women/i,
    sortOrder: 6,
  },
]

/**
 * Match a HelloAsso product name to a category ID
 * @param productName - The product name from HelloAsso
 * @returns The matching CategoryId or null if no match
 */
export function matchCategory(productName: string): CategoryId | null {
  for (const category of CATEGORIES) {
    if (category.pattern.test(productName)) {
      return category.id
    }
  }
  return null
}

/**
 * Get category by ID
 * @param id - The category ID
 * @returns The category or undefined if not found
 */
export function getCategoryById(id: CategoryId): Category | undefined {
  return CATEGORIES.find(c => c.id === id)
}

/**
 * Get all category IDs sorted by sortOrder
 * @returns Array of category IDs
 */
export function getSortedCategoryIds(): CategoryId[] {
  return CATEGORIES.sort((a, b) => a.sortOrder - b.sortOrder).map(c => c.id)
}
