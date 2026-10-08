import { useSyncExternalStore } from 'react'

/**
 * La pestaña «Yo» (menú y compra personales) solo aparece en los móviles
 * donde se active desde Ajustes. Es una preferencia de este dispositivo.
 */
const KEY = 'comidas-casa.seccion-yo'
const listeners = new Set<() => void>()

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setPersonalEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? '1' : '0')
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((fn) => fn())
}

export function usePersonalEnabled(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    read,
    () => false,
  )
}
