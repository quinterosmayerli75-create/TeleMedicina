// Días y horarios de atención del doctor. Se guardan en `profesionales/{uid}.disponibilidad` así:
//   { lunes: { activo: true, franjas: [{ desde: '08:00', hasta: '12:00' }, { desde: '14:00', hasta: '18:00' }] }, martes: {…}, … }
export const DIAS = [
  { clave: 'lunes', etiqueta: 'Lunes' },
  { clave: 'martes', etiqueta: 'Martes' },
  { clave: 'miercoles', etiqueta: 'Miércoles' },
  { clave: 'jueves', etiqueta: 'Jueves' },
  { clave: 'viernes', etiqueta: 'Viernes' },
  { clave: 'sabado', etiqueta: 'Sábado' },
  { clave: 'domingo', etiqueta: 'Domingo' },
]

export const FRANJA_NUEVA = { desde: '08:00', hasta: '12:00' }

// Devuelve siempre los 7 días, aunque en Firestore falte alguno (cuentas nuevas guardan `{}`).
export function normalizarDisponibilidad(disponibilidad) {
  const resultado = {}
  for (const { clave } of DIAS) {
    const dia = disponibilidad?.[clave]
    const franjas = Array.isArray(dia?.franjas)
      ? dia.franjas.filter((f) => f && typeof f.desde === 'string' && typeof f.hasta === 'string').map((f) => ({ desde: f.desde, hasta: f.hasta }))
      : []
    resultado[clave] = { activo: Boolean(dia?.activo) && franjas.length > 0, franjas }
  }
  return resultado
}

export function hayHorarios(disponibilidad) {
  return DIAS.some(({ clave }) => normalizarDisponibilidad(disponibilidad)[clave].activo)
}

// Texto de un día: "08:00 – 12:00 · 14:00 – 18:00", o null si no atiende ese día.
export function resumenDia(dia) {
  if (!dia?.activo || !dia.franjas?.length) return null
  return [...dia.franjas]
    .sort((a, b) => a.desde.localeCompare(b.desde))
    .map((f) => `${f.desde} – ${f.hasta}`)
    .join(' · ')
}

// Revisa lo que eligió el doctor antes de guardar. Devuelve un mensaje de error o null si está bien.
export function validarHorarios(disponibilidad) {
  const normal = normalizarDisponibilidad(disponibilidad)
  let hayActivo = false
  for (const { clave, etiqueta } of DIAS) {
    const dia = normal[clave]
    if (!disponibilidad?.[clave]?.activo) continue
    hayActivo = true
    const franjas = disponibilidad[clave].franjas ?? []
    if (franjas.length === 0) return `${etiqueta}: agrega al menos un horario o desactiva el día.`
    for (const f of franjas) {
      if (!f.desde || !f.hasta) return `${etiqueta}: completa la hora de inicio y de fin.`
      if (f.desde >= f.hasta) return `${etiqueta}: la hora de fin (${f.hasta}) debe ser mayor que la de inicio (${f.desde}).`
    }
    const ordenadas = [...dia.franjas].sort((a, b) => a.desde.localeCompare(b.desde))
    for (let i = 1; i < ordenadas.length; i += 1) {
      if (ordenadas[i].desde < ordenadas[i - 1].hasta) return `${etiqueta}: los horarios ${resumenDia({ activo: true, franjas: ordenadas.slice(i - 1, i + 1) })} se cruzan.`
    }
  }
  if (!hayActivo) return 'Activa al menos un día de atención.'
  return null
}
