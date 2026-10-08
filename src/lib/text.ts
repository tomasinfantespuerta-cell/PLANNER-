/** "  Plátanos de Canarias " → "platanos de canarias" (para comparar sin tildes ni mayúsculas). */
export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Pone en mayúscula la primera letra. */
export function capitalize(s: string): string {
  const t = s.trim()
  return t ? t[0].toLocaleUpperCase('es') + t.slice(1) : t
}

export function newId(): string {
  return crypto.randomUUID()
}
