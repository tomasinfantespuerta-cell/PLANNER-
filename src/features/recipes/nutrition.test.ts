import { describe, expect, it } from 'vitest'
import { FAMILY_POOL, HEALTHY_POOL, planSaveIdea } from '../ideas/logic'
import { planSeed } from './logic'
import {
  isFavorite,
  isMine,
  kcalFromMacros,
  knownNutritionSlugs,
  nutritionForSlug,
  nutritionFromTags,
  visibleTags,
  withFavorite,
  withMine,
  withNutrition,
} from './nutrition'
import { SEED_RECIPES } from './seed'
import { HEALTHY_SEED_RECIPES } from './seedHealthy'

const written = [...SEED_RECIPES, ...HEALTHY_SEED_RECIPES, ...HEALTHY_POOL, ...FAMILY_POOL]

describe('calorías y macros', () => {
  it('todas las recetas escritas tienen su estimación (y no sobra ninguna)', () => {
    for (const r of written) expect(nutritionForSlug(r.slug), r.slug).not.toBeNull()
    expect(new Set(knownNutritionSlugs())).toEqual(new Set(written.map((r) => r.slug)))
  })

  it('los valores son razonables para un plato', () => {
    for (const r of written) {
      const n = nutritionForSlug(r.slug)!
      expect(n.kcal, r.title).toBeGreaterThanOrEqual(150)
      expect(n.kcal, r.title).toBeLessThanOrEqual(1100)
      expect(n.kcal).toBe(kcalFromMacros(n.protein, n.carbs, n.fat))
    }
  })

  it('las saludables son, de media, más ligeras y con más proteína que las familiares', () => {
    const avg = (list: typeof written, f: (n: NonNullable<ReturnType<typeof nutritionForSlug>>) => number) =>
      list.reduce((s, r) => s + f(nutritionForSlug(r.slug)!), 0) / list.length
    const healthy = [...HEALTHY_SEED_RECIPES, ...HEALTHY_POOL.filter((r) => r.tags.includes('saludable'))]
    expect(avg(healthy, (n) => n.kcal)).toBeLessThan(avg(FAMILY_POOL, (n) => n.kcal))
    expect(avg(healthy, (n) => n.kcal)).toBeLessThan(600)
    expect(avg(healthy, (n) => (n.protein * 4) / n.kcal)).toBeGreaterThan(avg(FAMILY_POOL, (n) => (n.protein * 4) / n.kcal))
  })

  it('se guardan en las etiquetas sin tocar las demás', () => {
    const tags = withNutrition(['saludable', 'carne'], { kcal: 520, protein: 42, carbs: 58, fat: 11 })
    expect(nutritionFromTags(tags)).toEqual({ kcal: 520, protein: 42, carbs: 58, fat: 11 })
    expect(visibleTags(tags)).toEqual(['saludable', 'carne'])
    const again = withNutrition(tags, { kcal: 400, protein: 30, carbs: 40, fat: 10 })
    expect(again.filter((t) => t.startsWith('nutri:'))).toHaveLength(1)
    expect(nutritionFromTags(withNutrition(tags, null))).toBeNull()
    expect(nutritionFromTags(['saludable'])).toBeNull()
  })

  it('favoritas', () => {
    const t = withFavorite(['carne'], true)
    expect(isFavorite(t)).toBe(true)
    expect(withFavorite(t, true)).toEqual(t)
    expect(isFavorite(withFavorite(t, false))).toBe(false)
    expect(visibleTags(t)).toEqual(['carne'])
  })

  it('Mis recetas', () => {
    const t = withMine(['saludable', 'favorita'], true)
    expect(isMine(t)).toBe(true)
    expect(visibleTags(t)).toEqual(['saludable'])
    expect(isMine(withMine(t, false))).toBe(false)
    expect(withMine(t, true)).toEqual(t)
  })

  it('al cargar recetas o guardar ideas ya llevan sus macros', async () => {
    const muts = await planSeed(HEALTHY_SEED_RECIPES.slice(0, 1), new Set(), 'casa')
    expect(nutritionFromTags(muts[0].patch.tags as string[])).not.toBeNull()
    const m = planSaveIdea('id', HEALTHY_POOL[0], true)
    expect(nutritionFromTags(m.patch.tags as string[])).not.toBeNull()
    expect(isFavorite(m.patch.tags as string[])).toBe(true)
  })
})
