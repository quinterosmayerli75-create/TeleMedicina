import { aFecha } from './fechas'

// Estados de cuenta (`usuarios.estado`) que significan "bloqueada":
//   bloqueado_temporal -> hasta `bloqueadoHasta`; después la cuenta vuelve sola a `estadoPrevio` (normalmente 'activo')
//   bloqueado          -> bloqueo permanente: solo un admin lo levanta (o al aceptar una apelación)
// Campos que acompañan al bloqueo: motivoBloqueo, bloqueadoEn, bloqueadoPor, estadoPrevio, (bloqueadoHasta).
export const ESTADOS_BLOQUEO = ['bloqueado', 'bloqueado_temporal']

export const esBloqueo = (estado) => ESTADOS_BLOQUEO.includes(estado)

// ¿Es un bloqueo temporal cuyo plazo ya se cumplió?
export function bloqueoVencido(usuario) {
  if (usuario?.estado !== 'bloqueado_temporal') return false
  const hasta = aFecha(usuario.bloqueadoHasta)
  return Boolean(hasta) && hasta.getTime() <= Date.now()
}

// Estado real de la cuenta hoy: un bloqueo temporal vencido cuenta como activo aunque el documento
// todavía no se haya actualizado (eso ocurre cuando el usuario vuelve a entrar o un admin lo levanta).
export function estadoEfectivo(usuario) {
  if (!usuario) return null
  return bloqueoVencido(usuario) ? (usuario.estadoPrevio || 'activo') : (usuario.estado ?? null)
}
