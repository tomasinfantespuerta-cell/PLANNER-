import { mondayOf, today } from '../../lib/dates'
import type { Mutation } from '../../sync/types'
import { seedRecipeId } from '../recipes/logic'
import { nutritionForSlug, withFavorite, withNutrition } from '../recipes/nutrition'
import type { PoolRecipe } from './build'
import { FAMILY_POOL } from './poolFamily'
import { HEALTHY_POOL_1 } from './poolHealthy1'
import { HEALTHY_POOL_2 } from './poolHealthy2'

export const HEALTHY_POOL: PoolRecipe[] = [...HEALTHY_POOL_1, ...HEALTHY_POOL_2]
export { FAMILY_POOL }

export const HEALTHY_PER_WEEK = 4
export const FAMILY_PER_WEEK = 3

export type IdeaKind = 'saludable' | 'familia'

export function findIdea(slug: string): { idea: PoolRecipe; kind: IdeaKind } | null {
  const h = HEALTHY_POOL.find((r) => r.slug === slug)
  if (h) return { idea: h, kind: 'saludable' }
  const f = FAMILY_POOL.find((r) => r.slug === slug)
  return f ? { idea: f, kind: 'familia' } : null
}

/** Número de semana contando desde el lunes 1 de enero de 2024. */
export function weekNumber(monday: string): number {
  return Math.round((Date.parse(monday) - Date.parse('2024-01-01')) / (7 * 86_400_000))
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Barajado siempre igual para la misma semilla (los dos móviles ven las mismas ideas). */
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let a = hashString(seed) || 1
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Ideas de una semana: se recorre la lista barajada de `count` en `count`,
 * así no se repite ninguna hasta haber visto todas (unos 5 meses).
 */
export function ideasForWeek(pool: PoolRecipe[], monday: string, count: number, seed: string): PoolRecipe[] {
  const order = seededShuffle(pool, seed)
  const start = (((weekNumber(monday) * count) % order.length) + order.length) % order.length
  return Array.from({ length: Math.min(count, order.length) }, (_, i) => order[(start + i) % order.length])
}

export function weeklyIdeas(householdId: string, monday = mondayOf(today())) {
  return {
    saludable: ideasForWeek(HEALTHY_POOL, monday, HEALTHY_PER_WEEK, `saludable:${householdId}`),
    familia: ideasForWeek(FAMILY_POOL, monday, FAMILY_PER_WEEK, `familia:${householdId}`),
  }
}

/** Id fijo de una idea guardada: guardarla dos veces (o desde dos móviles) no la duplica. */
export function ideaRecipeId(householdId: string, slug: string): Promise<string> {
  return seedRecipeId(householdId, `idea:${slug}`)
}

export function planSaveIdea(id: string, idea: PoolRecipe, favorite = false): Mutation {
  return {
    table: 'recipes',
    id,
    op: 'insert',
    patch: {
      title: idea.title,
      photo_path: null,
      prep_minutes: idea.prep_minutes,
      difficulty: idea.difficulty,
      servings: idea.servings,
      tags: withFavorite(withNutrition(idea.tags, nutritionForSlug(idea.slug)), favorite),
      ingredients: idea.ingredients,
      steps: idea.steps,
      deleted_at: null,
    },
  }
}
