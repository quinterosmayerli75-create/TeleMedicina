import { aFecha } from './fechas'

// Quita tildes y mayúsculas para buscar "maria" y encontrar "María".
export function normalizarTexto(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

// "2026-09-20" (input type=date) -> Date a las 12:00 locales. Al mediodía, la fecha no cambia de día por
// diferencias de zona horaria.
export function fechaDesdeInput(valor) {
  if (!valor) return null
  const [a, m, d] = valor.split('-').map(Number)
  if (!a || !m || !d) return null
  return new Date(a, m - 1, d, 12, 0, 0)
}

// Date -> "2026-09-20" para un input type=date.
export function fechaAInput(valor) {
  const fecha = aFecha(valor)
  if (!fecha) return ''
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${fecha.getFullYear()}-${mes}-${dia}`
}

export const hoyInput = () => fechaAInput(new Date())

// Filtros de la lista de informes: por nombre del paciente y por rango de fechas (ambos extremos incluidos).
export function filtrarInformes(informes, { nombre = '', desde = '', hasta = '' } = {}) {
  const buscado = normalizarTexto(nombre)
  const inicio = desde ? fechaDesdeInput(desde) : null
  const fin = hasta ? fechaDesdeInput(hasta) : null
  if (inicio) inicio.setHours(0, 0, 0, 0)
  if (fin) fin.setHours(23, 59, 59, 999)

  return informes.filter((informe) => {
    if (buscado && !normalizarTexto(informe.pacienteNombre).includes(buscado)) return false
    const fecha = aFecha(informe.fecha)
    if ((inicio || fin) && !fecha) return false
    if (inicio && fecha < inicio) return false
    if (fin && fecha > fin) return false
    return true
  })
}

export const CAMPOS_INFORME = [
  { clave: 'motivo', etiqueta: 'Motivo de la consulta' },
  { clave: 'diagnostico', etiqueta: 'Diagnóstico' },
  { clave: 'tratamiento', etiqueta: 'Tratamiento e indicaciones' },
  { clave: 'observaciones', etiqueta: 'Observaciones' },
]
