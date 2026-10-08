import { guessCategory } from '../../lib/categories'
import { normalizeName } from '../../lib/text'
import type { Mutation } from '../../sync/types'
import type { NewItemInput } from '../shopping/logic'
import type { PoolRecipe } from '../ideas/build'
import { nutritionForSlug, withNutrition } from './nutrition'

export interface RecipeIngredient {
  name: string
  quantity?: string | null
  category?: string | null
}

export type Difficulty = 'facil' | 'media' | 'dificil'

export interface Recipe {
  id: string
  household_id: string
  title: string
  /** Foto reducida guardada como data URL (image/jpeg), o null. */
  photo_path: string | null
  prep_minutes: number | null
  difficulty: Difficulty | null
  servings: number | null
  tags: string[]
  ingredients: RecipeIngredient[]
  steps: string[]
  notes?: string | null
  deleted_at?: string | null
  updated_at?: string | null
}

export const FILTERS: Array<{ id: string; label: string; emoji: string }> = [
  { id: 'saludable', label: 'Saludable', emoji: '🥗' },
  { id: 'rapida', label: 'Rápidas', emoji: '⏱️' },
  { id: 'carne', label: 'Carne', emoji: '🍗' },
  { id: 'pescado', label: 'Pescado', emoji: '🐟' },
  { id: 'legumbres', label: 'Legumbres', emoji: '🫘' },
  { id: 'verdura', label: 'Verdura', emoji: '🥦' },
]

export const DIFFICULTIES: Array<{ id: Difficulty; label: string }> = [
  { id: 'facil', label: 'Fácil' },
  { id: 'media', label: 'Media' },
  { id: 'dificil', label: 'Difícil' },
]

export function difficultyLabel(d: Difficulty | null | undefined): string | null {
  return DIFFICULTIES.find((x) => x.id === d)?.label ?? null
}

export function formatMinutes(min: number | null | undefined): string | null {
  if (!min || min <= 0) return null
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

/** Buscar por título o ingrediente (sin importar tildes) y filtrar por etiqueta. */
export function filterRecipes(all: Recipe[], query: string, tag: string | null): Recipe[] {
  const q = normalizeName(query)
  return all
    .filter((r) => !r.deleted_at)
    .filter((r) => !tag || (r.tags ?? []).includes(tag))
    .filter(
      (r) =>
        !q ||
        normalizeName(r.title).includes(q) ||
        (r.ingredients ?? []).some((i) => normalizeName(i.name).includes(q)),
    )
    .sort((a, b) => a.title.localeCompare(b.title, 'es'))
}

/** Ingredientes de una receta listos para la lista de la compra. */
export function ingredientsForShopping(recipe: Recipe): NewItemInput[] {
  return (recipe.ingredients ?? [])
    .filter((i) => i.name?.trim())
    .filter((i) => normalizeName(i.name) !== 'sal' && !/^sal y pimienta$/.test(normalizeName(i.name)))
    .map((i) => ({ name: i.name.trim(), quantity: i.quantity || null, category: i.category || guessCategory(i.name) }))
}

/**
 * Id fijo para cada receta de ejemplo de cada casa. Si dos móviles cargan las
 * recetas iniciales a la vez, escriben la misma fila y no se duplican.
 */
export async function seedRecipeId(householdId: string, slug: string): Promise<string> {
  const data = new TextEncoder().encode(`comidas-casa:receta:${householdId}:${slug}`)
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', data)).slice(0, 16)
  hash[6] = (hash[6] & 0x0f) | 0x50 // versión 5 (derivado de un nombre)
  hash[8] = (hash[8] & 0x3f) | 0x80
  const hex = [...hash].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Recetas iniciales que faltan. Solo se llama cuando la copia local ya está
 * completa (tras descargar del servidor), así nunca se "resucita" una receta
 * que alguien borró o se pisa una que alguien editó.
 */
export async function planSeed(
  seeds: PoolRecipe[],
  existingIds: Set<string>,
  householdId: string,
): Promise<Mutation[]> {
  const out: Mutation[] = []
  for (const s of seeds) {
    const id = await seedRecipeId(householdId, s.slug)
    if (existingIds.has(id)) continue
    out.push({
      table: 'recipes',
      id,
      op: 'insert',
      patch: {
        title: s.title,
        photo_path: null,
        prep_minutes: s.prep_minutes,
        difficulty: s.difficulty,
        servings: s.servings,
        tags: withNutrition(s.tags, nutritionForSlug(s.slug)),
        ingredients: s.ingredients,
        steps: s.steps,
        deleted_at: null,
      },
    })
  }
  return out
}
