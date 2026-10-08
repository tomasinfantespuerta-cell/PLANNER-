import { useSyncExternalStore } from 'react'

/* «Mi semana de Tomi», tal cual estaba: bloques grandes, el detalle lo decides cada día. */

export type TipoBloque =
  | 'manana'
  | 'gym'
  | 'estudio'
  | 'trabajo'
  | 'campo'
  | 'comida'
  | 'insti'
  | 'noche'
  | 'ocio'
  | 'compra'
  | 'actividad'

export const TIPOS: Record<TipoBloque, { label: string; bg: string; ink: string }> = {
  manana: { label: 'Mañana', bg: '#fff2d6', ink: '#8a5a00' },
  gym: { label: 'Gimnasio', bg: '#ffe1dc', ink: '#a3392a' },
  estudio: { label: 'Estudio', bg: '#dde9ff', ink: '#2952a3' },
  trabajo: { label: 'Trabajo', bg: '#ece2ff', ink: '#6337b5' },
  campo: { label: 'Campo', bg: '#ddf3e1', ink: '#2b7a3d' },
  comida: { label: 'Comida y descanso', bg: '#fde8d4', ink: '#9a5418' },
  insti: { label: 'Instituto', bg: '#e6ebee', ink: '#465661' },
  noche: { label: 'Noche', bg: '#e3e4f7', ink: '#43458f' },
  ocio: { label: 'Ocio', bg: '#ffe0ee', ink: '#a32e66' },
  compra: { label: 'Compra', bg: '#d8f2f2', ink: '#1c6e70' },
  actividad: { label: 'Actividad física', bg: '#e5f5cf', ink: '#4d7a12' },
}

export interface Bloque {
  t: string
  type: TipoBloque
  name: string
  note: string
  /** Bloques «según semana»: con el modo exámenes pasan a estudio. */
  flex?: TipoBloque
}

export interface Dia {
  s: string
  name: string
  tag: string
  blocks: Bloque[]
}

const B = (t: string, type: TipoBloque, name: string, note: string, flex?: TipoBloque): Bloque => ({ t, type, name, note, flex })

const tarde = [
  B('12:30', 'comida', 'Comida y descanso', 'Hacer la comida, comer tranquilo, tumbarse un rato'),
  B('15:00', 'insti', 'Instituto', '15:00 – 21:00'),
  B('21:00', 'noche', 'Noche', 'Descanso, ducha y lectura'),
]

export const DIAS: Dia[] = [
  { s: 'L', name: 'Lunes', tag: 'Día de gimnasio', blocks: [
    B('7:00', 'manana', 'Bloque de mañana', 'Café, lectura y rutina'),
    B('8:15', 'gym', 'Gimnasio', ''),
    B('9:30', 'compra', 'Compra', '30 min: súper, frutería o lo que haga falta'),
    B('10:00', 'comida', 'Desayuno', ''),
    B('10:30', 'estudio', 'Estudio', 'Hasta las 12:00 – 12:30'),
    ...tarde] },
  { s: 'M', name: 'Martes', tag: 'Mañana larga', blocks: [
    B('7:00', 'manana', 'Bloque de mañana', 'Café, lectura y rutina'),
    B('8:15', 'estudio', 'Estudio', 'Primero estudio, siempre'),
    B('9:00', 'comida', 'Desayuno', ''),
    B('9:30', 'estudio', 'Estudio', 'Otra media hora'),
    B('10:15', 'trabajo', 'Trabajo', '1 – 1,5 h en tu proyecto', 'estudio'),
    ...tarde] },
  { s: 'X', name: 'Miércoles', tag: 'Día de gimnasio', blocks: [
    B('7:00', 'manana', 'Bloque de mañana', 'Café, lectura y rutina'),
    B('8:15', 'gym', 'Gimnasio', ''),
    B('10:00', 'comida', 'Desayuno', ''),
    B('10:30', 'trabajo', 'Trabajo', 'Proyectos si no hay exámenes', 'estudio'),
    ...tarde] },
  { s: 'J', name: 'Jueves', tag: 'Día de gimnasio', blocks: [
    B('7:00', 'manana', 'Bloque de mañana', 'Café, lectura y rutina'),
    B('8:15', 'gym', 'Gimnasio', ''),
    B('10:00', 'comida', 'Desayuno', ''),
    B('10:30', 'trabajo', 'Trabajo', 'Proyectos si no hay exámenes ni tareas', 'estudio'),
    ...tarde] },
  { s: 'V', name: 'Viernes', tag: 'Mañana larga', blocks: [
    B('7:00', 'manana', 'Bloque de mañana', 'Café, lectura y rutina'),
    B('8:15', 'estudio', 'Estudio', 'Aunque sea un rato, siempre'),
    B('9:00', 'comida', 'Desayuno', ''),
    B('9:30', 'trabajo', 'Trabajo', '1 – 1,5 h en tu proyecto', 'estudio'),
    B('11:00', 'campo', 'Campo o lo que surja', 'Mañana más tranquila'),
    B('12:30', 'comida', 'Comida y descanso', 'Hacer la comida, comer tranquilo, tumbarse un rato'),
    B('15:00', 'insti', 'Instituto', '15:00 – 21:00'),
    B('21:00', 'ocio', 'Noche libre', 'Serie o YouTube, que es viernes')] },
  { s: 'S', name: 'Sábado', tag: 'Campo y desconexión', blocks: [
    B('8:30', 'comida', 'Despertar y desayuno', 'Entre 8:30 y 9:00, sin prisa'),
    B('9:30', 'campo', 'Campo', 'Pintar, carcha, plantas…'),
    B('13:30', 'comida', 'Comida', ''),
    B('16:00', 'ocio', 'Ocio', 'Play, fútbol, amigos, lo que surja')] },
  { s: 'D', name: 'Domingo', tag: 'Actividad y desconexión', blocks: [
    B('8:00', 'manana', 'Bloque de mañana', 'Café y desayuno'),
    B('9:00', 'actividad', 'Actividad física', 'Salir a caminar'),
    B('11:00', 'campo', 'Campo', ''),
    B('13:30', 'comida', 'Comida', ''),
    B('16:00', 'ocio', 'Ocio', 'Despejar la mente')] },
]

export const GYM_URL = 'https://gym-seven-plum.vercel.app'

/** Identificador estable de un bloque: día (0 = lunes) + hora. */
export function bloqueKey(dia: number, b: Bloque): string {
  return `${dia}-${b.t}`
}

/** Cómo se ve un bloque según el modo exámenes. */
export function vistaBloque(b: Bloque, examenes: boolean): { type: TipoBloque; name: string; note: string } {
  if (b.flex && examenes) return { type: b.flex, name: 'Estudio', note: 'Semana de exámenes: toca estudiar' }
  return { type: b.type, name: b.name, note: b.note }
}

export function esDiaDeGym(dia: number): boolean {
  return DIAS[dia].blocks.some((b) => b.type === 'gym')
}

/** Día de la semana (0 = lunes) de una fecha ISO. */
export function diaDeFecha(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return (new Date(y, m - 1, d).getDay() + 6) % 7
}

/* Modo exámenes: preferencia del móvil, igual que antes. */
const EXAM_KEY = 'examMode'
const listeners = new Set<() => void>()

function leerExamen(): boolean {
  try {
    return localStorage.getItem(EXAM_KEY) === '1'
  } catch {
    return false
  }
}

export function setModoExamenes(on: boolean) {
  try {
    localStorage.setItem(EXAM_KEY, on ? '1' : '0')
  } catch {
    /* sin almacenamiento */
  }
  listeners.forEach((fn) => fn())
}

export function useModoExamenes(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    leerExamen,
    () => false,
  )
}
