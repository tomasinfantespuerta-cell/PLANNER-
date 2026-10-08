import { describe, expect, it } from 'vitest'
import { LocalDB } from '../../sync/db'
import { SyncEngine } from '../../sync/engine'
import { FakeRemote } from '../../sync/fakeRemote'
import { filterRecipes, formatMinutes, ingredientsForShopping, planSeed, seedRecipeId, type Recipe } from './logic'
import { SEED_RECIPES } from './seed'

const H = 'casa'
const recipe = (id: string, title: string, tags: string[], ingredients: string[] = []): Recipe => ({
  id, household_id: H, title, photo_path: null, prep_minutes: 30, difficulty: 'facil', servings: 4, tags,
  ingredients: ingredients.map((name) => ({ name })), steps: [], deleted_at: null,
})

describe('recetario', () => {
  it('trae 15 recetas completas', () => {
    expect(SEED_RECIPES).toHaveLength(15)
    for (const r of SEED_RECIPES) {
      expect(r.title.length).toBeGreaterThan(3)
      expect(r.ingredients.length).toBeGreaterThan(3)
      expect(r.steps.length).toBeGreaterThan(3)
    }
    expect(new Set(SEED_RECIPES.map((r) => r.slug)).size).toBe(15)
  })

  it('busca sin tildes, por título o ingrediente, y filtra por etiqueta', () => {
    const all = [
      recipe('1', 'Albóndigas en salsa', ['carne'], ['Carne picada']),
      recipe('2', 'Merluza en salsa verde', ['pescado'], ['Merluza', 'Perejil']),
      recipe('3', 'Lentejas', ['legumbres'], ['Lentejas', 'Chorizo']),
      { ...recipe('4', 'Borrada', ['carne']), deleted_at: 'x' },
    ]
    expect(filterRecipes(all, 'albondigas', null).map((r) => r.id)).toEqual(['1'])
    expect(filterRecipes(all, 'salsa', null).map((r) => r.id)).toEqual(['1', '2'])
    expect(filterRecipes(all, 'chorizo', null).map((r) => r.id)).toEqual(['3'])
    expect(filterRecipes(all, '', 'carne').map((r) => r.id)).toEqual(['1'])
    expect(filterRecipes(all, 'salsa', 'pescado').map((r) => r.id)).toEqual(['2'])
  })

  it('al pasar ingredientes a la compra quita la sal y pone categoría', () => {
    const r = { ...recipe('1', 'X', []), ingredients: [{ name: 'Sal' }, { name: 'Leche', quantity: '1 l' }, { name: 'Sal y pimienta' }] }
    expect(ingredientsForShopping(r)).toEqual([{ name: 'Leche', quantity: '1 l', category: 'lacteos_huevos' }])
  })

  it('formatea tiempos', () => {
    expect(formatMinutes(45)).toBe('45 min')
    expect(formatMinutes(60)).toBe('1 h')
    expect(formatMinutes(150)).toBe('2 h 30 min')
    expect(formatMinutes(null)).toBeNull()
  })

  it('el id de las recetas iniciales es fijo por casa', async () => {
    const a = await seedRecipeId(H, 'tortilla-de-patatas')
    expect(a).toBe(await seedRecipeId(H, 'tortilla-de-patatas'))
    expect(a).not.toBe(await seedRecipeId('otra', 'tortilla-de-patatas'))
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('dos móviles cargando las recetas iniciales a la vez no las duplican, ni resucitan las borradas', async () => {
    const remote = new FakeRemote()
    const dbs = [new LocalDB('seed-a'), new LocalDB('seed-b')]
    const [a, b] = dbs.map((db) => new SyncEngine(db, remote, H, { autoSync: false }))

    for (const dev of [a, b]) {
      await dev.sync()
      const ids = new Set((await dev.db.rows('recipes').toArray()).map((r) => r.id))
      await dev.mutate(await planSeed(SEED_RECIPES, ids, H))
    }
    await a.sync()
    await b.sync()
    expect(remote.all('recipes', H)).toHaveLength(15)

    // a borra una receta; un tercer móvil nuevo no debe volver a crearla.
    const first = remote.all('recipes', H)[0]
    await a.remove('recipes', first.id)
    await a.sync()
    const c = new SyncEngine(new LocalDB('seed-c'), remote, H, { autoSync: false })
    await c.sync()
    const ids = new Set((await c.db.rows('recipes').toArray()).map((r) => r.id))
    expect(await planSeed(SEED_RECIPES, ids, H)).toEqual([])
    expect(remote.all('recipes', H).find((r) => r.id === first.id)?.deleted_at).toBeTruthy()

    for (const e of [a, b, c]) {
      e.db.close()
      await e.db.delete()
    }
  })
})
