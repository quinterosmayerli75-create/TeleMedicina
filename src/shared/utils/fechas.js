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

// Edad en años a partir de una fecha de nacimiento (string "aaaa-mm-dd", Date o Timestamp).
export function calcularEdad(fechaNacimiento) {
  const fecha = aFecha(fechaNacimiento)
  if (!fecha) return null
  const hoy = new Date()
  let edad = hoy.getFullYear() - fecha.getFullYear()
  const noCumplioAun = hoy.getMonth() < fecha.getMonth() || (hoy.getMonth() === fecha.getMonth() && hoy.getDate() < fecha.getDate())
  if (noCumplioAun) edad -= 1
  return edad
}

// Edad a mostrar para un usuario: calculada desde fechaNacimiento si existe, o el número viejo
// guardado en "edad" para las cuentas registradas antes de este cambio (compatibilidad hacia atrás).
export function edadDe(datos) {
  if (!datos) return null
  const calculada = calcularEdad(datos.fechaNacimiento)
  return calculada ?? datos.edad ?? null
}
