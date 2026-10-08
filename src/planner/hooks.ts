import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect } from 'react'
import { ahora, getAjuste, pdb, setAjuste, uid, type Fila, type Mes, type Subbloque } from './db'
import { MESES_IMPORTADOS, PLANTILLA_IMPORTADA } from './dineroImportado'
import { checkId, esMesActualOFuturo } from './logic'

export const useTareas = () => useLiveQuery(() => pdb.tareas.toArray(), [])
export const useComprar = () => useLiveQuery(() => pdb.comprar.toArray(), [])
export const useNotas = () => useLiveQuery(() => pdb.notas.orderBy('editada').reverse().toArray(), [])
export const useExamenes = () => useLiveQuery(() => pdb.examenes.toArray(), [])
export const useSubbloques = () => useLiveQuery(() => pdb.subbloques.toArray(), [])
export const useChecks = () => useLiveQuery(() => pdb.checks.toArray(), [])

/* ---------- tareas ---------- */

export function nuevaTarea(texto: string, fecha: string | null) {
  return pdb.tareas.add({ id: uid(), texto: texto.trim(), fecha, hecha: false, creada: ahora(), hechaEn: null })
}

export function marcarTarea(id: string, hecha: boolean) {
  return pdb.tareas.update(id, { hecha, hechaEn: hecha ? ahora() : null })
}

/* ---------- subbloques ---------- */

export async function nuevoSubbloque(bloques: string[], texto: string, habito: boolean) {
  const todos = await pdb.subbloques.toArray()
  await pdb.subbloques.bulkAdd(
    bloques.map((bloque) => ({
      id: uid(),
      bloque,
      texto: texto.trim(),
      habito,
      orden: Math.max(0, ...todos.filter((s) => s.bloque === bloque).map((s) => s.orden)) + 1,
    })),
  )
}

export async function marcarSubbloque(sub: Subbloque, fecha: string, hecho: boolean) {
  const id = checkId(sub.id, fecha)
  if (hecho) await pdb.checks.put({ id, subId: sub.id, fecha })
  else await pdb.checks.delete(id)
}

export async function borrarSubbloque(id: string) {
  await pdb.transaction('rw', pdb.subbloques, pdb.checks, async () => {
    await pdb.subbloques.delete(id)
    await pdb.checks.where('subId').equals(id).delete()
  })
}

/* ---------- dinero ---------- */

const IMPORT_FLAG = 'dinero-importado'

/** Carga una sola vez los datos que había en «Cuentas Claras». */
export function useImportarDinero() {
  useEffect(() => {
    void (async () => {
      if (await getAjuste(IMPORT_FLAG, false)) return
      await pdb.transaction('rw', pdb.meses, pdb.ajustes, async () => {
        for (const m of MESES_IMPORTADOS) if (!(await pdb.meses.get(m.key))) await pdb.meses.put(m)
        if (!(await pdb.ajustes.get('plantilla'))) await setAjuste('plantilla', PLANTILLA_IMPORTADA)
        await setAjuste(IMPORT_FLAG, ahora())
      })
    })()
  }, [])
}

const clonar = (filas: Fila[]): Fila[] => filas.map((f) => ({ id: uid(), concepto: f.concepto || '', importe: f.importe || 0 }))

/** Un mes nuevo empieza con los gastos fijos de la plantilla. */
export async function cargarMes(key: string): Promise<Mes> {
  const m = await pdb.meses.get(key)
  if (m) return m
  const plantilla = await getAjuste<Fila[]>('plantilla', [])
  const nuevo: Mes = { key, ingresos: [], gastosFijos: clonar(plantilla), gastosVariables: [] }
  await pdb.meses.put(nuevo)
  return nuevo
}

/** Guarda el mes; si cambian los fijos del mes actual o futuros, se actualiza la plantilla. */
export async function guardarMes(mes: Mes, fijosCambiados: boolean) {
  await pdb.meses.put(mes)
  if (fijosCambiados && esMesActualOFuturo(mes.key)) {
    await setAjuste('plantilla', mes.gastosFijos.map((f) => ({ ...f })))
  }
}
