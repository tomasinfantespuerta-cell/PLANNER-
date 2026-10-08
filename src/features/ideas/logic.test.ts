import { describe, expect, it } from 'vitest'
import { addDays } from '../../lib/dates'
import { SEED_RECIPES } from '../recipes/seed'
import { HEALTHY_SEED_RECIPES } from '../recipes/seedHealthy'
import { FAMILY_POOL, HEALTHY_POOL, HEALTHY_PER_WEEK, ideasForWeek, weeklyIdeas } from './logic'

const all = [...SEED_RECIPES, ...HEALTHY_SEED_RECIPES, ...HEALTHY_POOL, ...FAMILY_POOL]

describe('recetas escritas', () => {
  it('hay suficientes y no se repite ninguna', () => {
    expect(HEALTHY_POOL.length).toBeGreaterThanOrEqual(80)
    expect(FAMILY_POOL.length).toBeGreaterThanOrEqual(40)
    expect(new Set(all.map((r) => r.slug)).size).toBe(all.length)
    expect(new Set(all.map((r) => r.title)).size).toBe(all.length)
  })

  it('todas están completas', () => {
    for (const r of all) {
      expect(r.ingredients.length, r.title).toBeGreaterThanOrEqual(3)
      expect(r.steps.length, r.title).toBeGreaterThanOrEqual(3)
      expect(r.prep_minutes, r.title).toBeGreaterThan(0)
      for (const i of r.ingredients) expect(i.name.trim(), r.title).not.toBe('')
    }
  })

  it('hay equilibrio: no todo es pollo con arroz', () => {
    const count = (tag: string) => HEALTHY_POOL.filter((r) => r.tags.includes(tag)).length
    expect(count('pescado')).toBeGreaterThanOrEqual(15)
    expect(count('legumbres')).toBeGreaterThanOrEqual(12)
    expect(count('verdura')).toBeGreaterThanOrEqual(12)
    const pastaPizza = HEALTHY_POOL.filter((r) => /pasta|espaguetis|macarrones|pizza|ñoquis|lasaña/i.test(r.title)).length
    expect(pastaPizza).toBeGreaterThanOrEqual(8)
  })
})

describe('ideas de la semana', () => {
  it('son siempre las mismas para la misma casa y semana', () => {
    expect(weeklyIdeas('casa', '2026-09-28')).toEqual(weeklyIdeas('casa', '2026-09-28'))
    expect(weeklyIdeas('casa', '2026-09-28').saludable).toHaveLength(4)
    expect(weeklyIdeas('casa', '2026-09-28').familia).toHaveLength(3)
  })

  it('cambian cada semana y no se repiten hasta haberlas visto todas', () => {
    const weeks = Math.floor(HEALTHY_POOL.length / HEALTHY_PER_WEEK)
    const seen = new Set<string>()
    let monday = '2026-09-28'
    for (let w = 0; w < weeks; w++) {
      for (const idea of ideasForWeek(HEALTHY_POOL, monday, HEALTHY_PER_WEEK, 'x')) {
        expect(seen.has(idea.slug)).toBe(false)
        seen.add(idea.slug)
      }
      monday = addDays(monday, 7)
    }
    expect(seen.size).toBe(weeks * HEALTHY_PER_WEEK)
  })
})
