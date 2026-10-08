import { guessCategory } from '../../lib/categories'
import type { RecipeIngredient } from '../recipes/logic'

/** Receta escrita en el código (recetario inicial o ideas de la semana). */
export interface PoolRecipe {
  slug: string
  title: string
  prep_minutes: number
  difficulty: 'facil' | 'media' | 'dificil'
  servings: number
  tags: string[]
  ingredients: RecipeIngredient[]
  steps: string[]
}

type Diff = PoolRecipe['difficulty']

/**
 * Forma corta de escribir recetas. Cada ingrediente es "Nombre|cantidad"; la
 * categoría para la lista de la compra se deduce del nombre.
 */
export function r(
  slug: string,
  title: string,
  minutes: number,
  difficulty: Diff,
  servings: number,
  tags: string[],
  ingredients: string[],
  steps: string[],
): PoolRecipe {
  return {
    slug,
    title,
    prep_minutes: minutes,
    difficulty,
    servings,
    tags,
    ingredients: ingredients.map((s) => {
      const [name, quantity = ''] = s.split('|')
      return { name: name.trim(), quantity: quantity.trim() || null, category: guessCategory(name) }
    }),
    steps,
  }
}
