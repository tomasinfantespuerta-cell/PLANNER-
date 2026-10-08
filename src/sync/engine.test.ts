import { afterEach, describe, expect, it } from 'vitest'
import { LocalDB } from './db'
import { SyncEngine } from './engine'
import { FakeRemote } from './fakeRemote'
import { keyAfterLast, sortByPosition } from './order'
import type { AnyRow } from './types'

const H = 'casa-1'
let dbCounter = 0
const opened: LocalDB[] = []

function newDb(name = `test-${++dbCounter}`) {
  const db = new LocalDB(name)
  opened.push(db)
  return db
}

function device(remote: FakeRemote, db = newDb()) {
  return new SyncEngine(db, remote, H, { autoSync: false })
}

function item(id: string, name: string, position: string, extra: Record<string, unknown> = {}) {
  return { id, name, name_norm: name.toLowerCase(), quantity: null, category: 'otros', checked: false, checked_at: null, position, deleted_at: null, ...extra }
}

async function localItems(engine: SyncEngine): Promise<AnyRow[]> {
  return engine.db.rows('shopping_items').toArray()
}

async function visibleNames(engine: SyncEngine): Promise<string[]> {
  const rows = (await localItems(engine)).filter((r) => !r.deleted_at) as unknown as Array<{ id: string; position: string; name: string }>
  return sortByPosition(rows).map((r) => r.name)
}

afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close()
    await db.delete()
  }
})

describe('guardado local inmediato', () => {
  it('cada cambio queda guardado en IndexedDB y en la cola al instante', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    await a.insert('shopping_items', item('1', 'Leche', 'a0'))
    expect(await visibleNames(a)).toEqual(['Leche'])
    expect(await a.db.outbox.count()).toBe(1)
    expect(remote.calls).toBe(0) // aún no se ha enviado nada
    await a.sync()
    expect(await a.db.outbox.count()).toBe(0)
    expect(remote.all('shopping_items', H)).toHaveLength(1)
  })

  it('los cambios pendientes sobreviven a cerrar y reabrir la app', async () => {
    const remote = new FakeRemote()
    remote.offline = true
    const name = 'persist-test'
    const db1 = newDb(name)
    const a1 = device(remote, db1)
    await a1.insert('shopping_items', item('1', 'Pan', 'a0'))
    await a1.update('shopping_items', '1', { quantity: '2 barras' })
    await a1.sync()
    expect(await db1.outbox.count()).toBe(1)
    a1.dispose()
    db1.close()

    // "Reabrimos" la app: nueva conexión a la misma base de datos.
    remote.offline = false
    const a2 = device(remote, newDb(name))
    expect(await visibleNames(a2)).toEqual(['Pan'])
    await a2.sync()
    const server = remote.all('shopping_items', H)
    expect(server).toHaveLength(1)
    expect(server[0]).toMatchObject({ name: 'Pan', quantity: '2 barras' })
  })
})

describe('sin conexión', () => {
  it('acumula cambios sin conexión y los envía al volver, sin duplicar', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    remote.offline = true
    const rows: Array<{ id: string; position: string }> = []
    for (const n of ['Huevos', 'Tomates', 'Arroz', 'Aceite']) {
      const r = item(n, n, keyAfterLast(rows))
      rows.push(r)
      await a.insert('shopping_items', r)
    }
    await a.update('shopping_items', 'Tomates', { checked: true, checked_at: '2026-01-01T00:00:00Z' })
    await a.update('shopping_items', 'Tomates', { quantity: '1 kg' })
    await a.sync()
    expect(a.getStatus().online).toBe(false)
    // Una sola entrada por fila, aunque haya varios cambios.
    expect(await a.db.outbox.count()).toBe(4)

    remote.offline = false
    await a.sync()
    await a.sync() // repetir no debe duplicar nada
    const server = remote.all('shopping_items', H)
    expect(server).toHaveLength(4)
    expect(server.find((r) => r.id === 'Tomates')).toMatchObject({ checked: true, quantity: '1 kg' })
    expect(a.getStatus()).toMatchObject({ online: true, pending: 0 })
  })

  it('si se pierde la respuesta del servidor, reintentar no duplica', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    remote.loseNextResponses = 1
    await a.insert('shopping_items', item('1', 'Leche', 'a0'))
    await a.sync()
    expect(await a.db.outbox.count()).toBe(1) // el cliente cree que falló
    await a.sync()
    expect(remote.all('shopping_items', H)).toHaveLength(1)
    expect(await a.db.outbox.count()).toBe(0)
  })

  it('un cambio hecho mientras se envía otro no se pierde', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    await a.insert('shopping_items', item('1', 'Leche', 'a0'))
    remote.afterApply = () => a.update('shopping_items', '1', { quantity: '6 bricks' })
    await a.sync()
    await a.sync()
    expect(remote.all('shopping_items', H)[0]).toMatchObject({ name: 'Leche', quantity: '6 bricks' })
    expect((await localItems(a))[0]).toMatchObject({ quantity: '6 bricks' })
    expect(await a.db.outbox.count()).toBe(0)
  })

  it('un cambio rechazado por el servidor se aparta y no bloquea el resto', async () => {
    const remote = new FakeRemote()
    remote.required.shopping_items = ['name']
    const a = device(remote)
    await a.insert('shopping_items', item('1', '', 'a0'))
    await a.insert('shopping_items', item('2', 'Pan', 'a1'))
    await a.sync()
    expect(remote.all('shopping_items', H).map((r) => r.name)).toEqual(['Pan'])
    expect(a.getStatus()).toMatchObject({ pending: 0, dead: 1 })
    expect((await a.listDead())[0].rowId).toBe('1')
  })
})

describe('orden', () => {
  it('el orden guardado se reproduce exactamente en otro móvil y al reinstalar', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const rows: Array<{ id: string; position: string }> = []
    for (const n of ['A', 'B', 'C', 'D', 'E']) {
      const r = item(n, n, keyAfterLast(rows))
      rows.push(r)
      await a.insert('shopping_items', r)
    }
    // Mover E al segundo lugar.
    const between = (await import('fractional-indexing')).generateKeyBetween(rows[0].position, rows[1].position)
    await a.update('shopping_items', 'E', { position: between })
    await a.sync()
    expect(await visibleNames(a)).toEqual(['A', 'E', 'B', 'C', 'D'])

    const b = device(remote) // móvil nuevo, base de datos vacía
    await b.sync()
    expect(await visibleNames(b)).toEqual(['A', 'E', 'B', 'C', 'D'])
  })
})

describe('dos móviles', () => {
  it('los cambios de campos distintos se combinan (uno tacha sin conexión, el otro edita)', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const b = device(remote)
    await a.insert('shopping_items', item('1', 'Leche', 'a0'))
    await a.sync()
    await b.sync()

    remote.offline = true
    await a.update('shopping_items', '1', { checked: true, checked_at: '2026-01-01T00:00:00Z' })
    await a.sync() // falla, queda pendiente
    remote.offline = false
    await b.update('shopping_items', '1', { quantity: '6 bricks' })
    await b.sync()
    await a.sync()
    await b.sync()

    for (const dev of [a, b]) {
      expect((await localItems(dev))[0]).toMatchObject({ checked: true, quantity: '6 bricks' })
    }
  })

  it('lo borrado no reaparece aunque el otro móvil lo edite sin conexión', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const b = device(remote)
    await a.insert('shopping_items', item('1', 'Leche', 'a0'))
    await a.sync()
    await b.sync()

    await a.remove('shopping_items', '1')
    await a.sync()
    await b.update('shopping_items', '1', { quantity: '2' }) // b aún no sabe que se borró
    await b.sync()
    await a.sync()
    expect(remote.all('shopping_items', H)[0].deleted_at).toBeTruthy()
    expect(await visibleNames(a)).toEqual([])
    expect(await visibleNames(b)).toEqual([])
  })

  it('Realtime: el otro móvil recibe los cambios al momento', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const b = device(remote)
    const received: Promise<void>[] = []
    remote.onChange((table, row) => received.push(b.applyRemote(table, row)))
    await a.insert('shopping_items', item('1', 'Leche', 'a0'))
    await a.sync({ pull: false })
    await Promise.all(received)
    expect(await visibleNames(b)).toEqual(['Leche'])
  })

  it('una versión antigua que llega tarde no pisa a una más nueva', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    await a.insert('shopping_items', item('1', 'Leche', 'a0'))
    await a.sync()
    const old = { ...remote.all('shopping_items', H)[0] }
    await a.update('shopping_items', '1', { name: 'Leche entera' })
    await a.sync()
    await a.applyRemote('shopping_items', old)
    expect((await localItems(a))[0].name).toBe('Leche entera')
  })

  it('los datos del servidor no deshacen un cambio local aún no enviado', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const b = device(remote)
    await a.insert('shopping_items', item('1', 'Leche', 'a0'))
    await a.sync()
    await b.sync()

    remote.offline = true
    await b.update('shopping_items', '1', { checked: true })
    remote.offline = false
    await a.update('shopping_items', '1', { name: 'Leche sin lactosa' })
    await a.sync()
    await b.pull() // llega el nombre nuevo, pero b mantiene su tachado pendiente
    expect((await localItems(b))[0]).toMatchObject({ name: 'Leche sin lactosa', checked: true })
    await b.sync()
    expect(remote.all('shopping_items', H)[0]).toMatchObject({ name: 'Leche sin lactosa', checked: true })
  })
})

describe('borrar y deshacer', () => {
  it('deshacer antes de sincronizar deja el producto como estaba', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    await a.insert('shopping_items', item('1', 'Leche', 'a0'))
    await a.sync()
    await a.remove('shopping_items', '1')
    expect(await visibleNames(a)).toEqual([])
    await a.restore('shopping_items', '1')
    await a.sync()
    expect(await visibleNames(a)).toEqual(['Leche'])
    expect(remote.all('shopping_items', H)[0].deleted_at).toBeNull()
  })

  it('deshacer después de sincronizar también funciona en el otro móvil', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const b = device(remote)
    await a.insert('shopping_items', item('1', 'Leche', 'a0'))
    await a.remove('shopping_items', '1')
    await a.sync()
    await b.sync()
    expect(await visibleNames(b)).toEqual([])
    await a.restore('shopping_items', '1')
    await a.sync()
    await b.sync()
    expect(await visibleNames(b)).toEqual(['Leche'])
  })

  it('los cambios en bloque (limpiar tachados) son atómicos', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    await a.mutate([
      { table: 'shopping_items', id: '1', op: 'insert', patch: item('1', 'A', 'a0') },
      { table: 'shopping_items', id: '2', op: 'insert', patch: item('2', 'B', 'a1') },
    ])
    await a.mutate([
      { table: 'shopping_items', id: '1', op: 'update', patch: { deleted_at: 'x' } },
      { table: 'shopping_items', id: '2', op: 'update', patch: { deleted_at: 'x' } },
    ])
    expect(await visibleNames(a)).toEqual([])
    expect(await a.db.outbox.count()).toBe(2)
  })
})

describe('descarga incremental', () => {
  it('solo pide lo nuevo, con margen para no perder nada', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    const b = device(remote)
    await a.insert('shopping_items', item('1', 'A', 'a0'))
    await a.sync()
    await b.sync()
    const cursor = await b.db.getMeta<string>('cursor:shopping_items')
    expect(cursor).toBeTruthy()
    await a.insert('shopping_items', item('2', 'B', 'a1'))
    await a.sync()
    await b.sync()
    expect(await visibleNames(b)).toEqual(['A', 'B'])
  })

  it('ignora filas de otra casa', async () => {
    const remote = new FakeRemote()
    const a = device(remote)
    await a.applyRemote('shopping_items', { ...item('x', 'Intruso', 'a0'), household_id: 'otra', updated_at: '2026-01-01T00:00:00Z' })
    expect(await visibleNames(a)).toEqual([])
  })
})
