// Firestore guarda las fechas como Timestamp; estos helpers las convierten a Date y las muestran.
export function aFecha(valor) {
  if (!valor) return null
  if (typeof valor.toDate === 'function') return valor.toDate()
  const fecha = valor instanceof Date ? valor : new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export function formatearFecha(valor) {
  const fecha = aFecha(valor)
  return fecha ? fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'
}

// Días que faltan hasta `valor` (redondeado hacia arriba). Negativo o 0 = ya venció.
export function diasRestantes(valor) {
  const fecha = aFecha(valor)
  if (!fecha) return null
  return Math.ceil((fecha.getTime() - Date.now()) / 86400000)
}
