import { describe, expect, it } from 'vitest'
import { addDays, formatWeekRange, mondayOf, weekDates, weekdayName } from '../../lib/dates'
import { daysByDate, dishLabel, menuDayId, parseMenuDayId, pastWeeksWithDishes, planCopyWeek, planSetDay, type MenuDay } from './logic'

const H = 'casa'
const day = (id: string, dish_text: string | null, recipe_id: string | null = null, extra: Partial<MenuDay> = {}): MenuDay => ({
  id, household_id: H, dish_text, recipe_id, deleted_at: null, ...extra,
})

describe('fechas', () => {
  it('calcula el lunes de cada semana', () => {
    expect(mondayOf('2026-09-27')).toBe('2026-09-21') // domingo
    expect(mondayOf('2026-09-28')).toBe('2026-09-28') // lunes
    expect(mondayOf('2026-10-01')).toBe('2026-09-28')
    expect(mondayOf('2027-01-01')).toBe('2026-12-28')
  })

  it('no se lía con el cambio de hora', () => {
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
    expect(weekDates('2026-10-19')).toEqual([
      '2026-10-19', '2026-10-20', '2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25',
    ])
  })

  it('nombres en español', () => {
    expect(weekdayName('2026-09-28')).toBe('Lunes')
    expect(weekdayName('2026-10-04')).toBe('Domingo')
    expect(formatWeekRange('2026-09-28')).toMatch(/^28 sep – 4 oct/)
    expect(formatWeekRange('2026-10-05')).toMatch(/^5 – 11 oct/)
  })
})

describe('menú', () => {
  it('muestra el título actual de la receta o lo escrito a mano', () => {
    const recipes = new Map([['r1', { id: 'r1', title: 'Lentejas con chorizo' }]])
    expect(dishLabel(day('2026-09-28', 'Lentejas', 'r1'), recipes)).toBe('Lentejas con chorizo')
    expect(dishLabel(day('2026-09-28', 'Sobras'), recipes)).toBe('Sobras')
    expect(dishLabel(day('2026-09-28', '  '), recipes)).toBeNull()
    // Si la receta se borró, queda el texto guardado.
    expect(dishLabel(day('2026-09-28', 'Cocido', 'r9'), recipes)).toBe('Cocido')
  })

  it('poner y quitar plato usa la fecha como id (nunca duplica)', () => {
    expect(planSetDay('familia', '2026-09-28', { dish_text: ' Paella ', recipe_id: null })).toEqual({
      table: 'menu_days', id: '2026-09-28', op: 'insert', patch: { dish_text: 'Paella', recipe_id: null, deleted_at: null },
    })
    expect(planSetDay('familia', '2026-09-28', null).patch).toEqual({ dish_text: null, recipe_id: null, deleted_at: null })
  })

  it('copiar una semana deja la nueva exactamente igual (también los días vacíos)', () => {
    const byDate = new Map([
      ['2026-09-21', day('2026-09-21', 'Lentejas', 'r1')],
      ['2026-09-23', day('2026-09-23', 'Pollo asado')],
    ])
    const muts = planCopyWeek('familia', '2026-09-21', '2026-09-28', byDate)
    expect(muts).toHaveLength(7)
    expect(muts.map((m) => m.id)).toEqual(weekDates('2026-09-28'))
    expect(muts[0].patch).toMatchObject({ dish_text: 'Lentejas', recipe_id: 'r1' })
    expect(muts[1].patch).toMatchObject({ dish_text: null, recipe_id: null })
    expect(muts[2].patch).toMatchObject({ dish_text: 'Pollo asado' })
  })

  it('lista las semanas pasadas con platos, de la más reciente a la más antigua', () => {
    const days = [
      day('2026-09-01', 'A'), day('2026-09-02', 'B'), day('2026-09-15', 'C'),
      day('2026-09-22', null), day('2026-09-29', 'Futuro'),
    ]
    expect(pastWeeksWithDishes(daysByDate(days, 'familia'), '2026-09-28')).toEqual([
      { monday: '2026-09-14', count: 1 },
      { monday: '2026-08-31', count: 2 },
    ])
  })
})

describe('menú familiar y menú personal', () => {
  it('cada menú tiene su propia clave y se puede leer de vuelta', () => {
    expect(menuDayId('familia', '2026-09-28')).toBe('2026-09-28')
    expect(menuDayId('yo', '2026-09-28')).toBe('7026-09-28')
    expect(parseMenuDayId('7026-09-28')).toEqual({ scope: 'yo', date: '2026-09-28' })
    expect(parseMenuDayId('2026-09-28')).toEqual({ scope: 'familia', date: '2026-09-28' })
    // La clave personal sigue cumpliendo el formato que exige la base de datos.
    expect(/^\d{4}-\d{2}-\d{2}$/.test(menuDayId('yo', '2026-12-31'))).toBe(true)
  })

  it('los dos menús no se mezclan', () => {
    const days = [
      day('2026-09-28', 'Lentejas (familia)'),
      day(menuDayId('yo', '2026-09-28'), 'Pollo con boniato (yo)'),
    ]
    const fam = daysByDate(days, 'familia')
    const yo = daysByDate(days, 'yo')
    expect(fam.get('2026-09-28')?.dish_text).toBe('Lentejas (familia)')
    expect(yo.get('2026-09-28')?.dish_text).toBe('Pollo con boniato (yo)')
    expect(planSetDay('yo', '2026-09-29', { dish_text: 'Ensalada', recipe_id: null }).id).toBe('7026-09-29')
    const copy = planCopyWeek('yo', '2026-09-28', '2026-10-05', yo)
    expect(copy.every((m) => m.id.startsWith('7026-10-') || m.id.startsWith('7026-09-'))).toBe(true)
    expect(copy[0]).toMatchObject({ id: '7026-10-05', patch: { dish_text: 'Pollo con boniato (yo)' } })
    // La semana personal no aparece como semana pasada del menú familiar.
    expect(pastWeeksWithDishes(fam, '2026-10-05')).toEqual([{ monday: '2026-09-28', count: 1 }])
  })
})
