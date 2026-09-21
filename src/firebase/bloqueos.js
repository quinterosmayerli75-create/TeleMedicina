import { deleteField, doc, getDoc, serverTimestamp, updateDoc, writeBatch } from 'firebase/firestore'
import { auth, db } from './config'
import { esBloqueo } from '../utils/bloqueos'

// Mensajes pensados para mostrarse tal cual en pantalla.
export class ErrorBloqueo extends Error {}

export const MAX_DIAS_BLOQUEO = 365

// Texto legible para cualquier error de estas acciones (propio o de Firestore).
export function mensajeErrorBloqueo(err) {
  if (err instanceof ErrorBloqueo) return err.message
  if (err?.code === 'permission-denied') {
    return 'Firebase no permitió la operación. Verifica que publicaste el firestore.rules más reciente y que tu cuenta es de administrador.'
  }
  if (err?.code === 'not-found') return 'Esa cuenta ya no existe.'
  return `No se pudo completar la acción${err?.code ? ` (${err.code})` : ''}. Intenta de nuevo.`
}

async function leerCuenta(usuarioId) {
  if (!usuarioId) throw new ErrorBloqueo('No se indica a qué cuenta aplicar la acción.')
  const snap = await getDoc(doc(db, 'usuarios', usuarioId))
  if (!snap.exists()) {
    throw new ErrorBloqueo('Esa cuenta ya no existe (puede haberse eliminado), así que no hay nada que bloquear.')
  }
  return snap.data()
}

/**
 * Bloquea una cuenta.
 * @param {object} p
 * @param {string} p.usuarioId  uid de la cuenta a bloquear
 * @param {'temporal'|'permanente'} p.tipo
 * @param {number|string} [p.dias]  duración (solo temporal)
 * @param {string} p.motivo  se le muestra a la persona bloqueada
 * @param {string} [p.reporteId]  denuncia que se resuelve con este bloqueo
 */
export async function bloquearUsuario({ usuarioId, tipo, dias, motivo, reporteId }) {
  const motivoLimpio = String(motivo ?? '').trim()
  if (!motivoLimpio) throw new ErrorBloqueo('Escribe el motivo del bloqueo: la persona lo verá al entrar.')

  let hasta = null
  if (tipo === 'temporal') {
    const n = Number(dias)
    if (!Number.isInteger(n) || n < 1 || n > MAX_DIAS_BLOQUEO) {
      throw new ErrorBloqueo(`La duración debe ser un número entero de días entre 1 y ${MAX_DIAS_BLOQUEO}.`)
    }
    hasta = new Date(Date.now() + n * 86400000)
  } else if (tipo !== 'permanente') {
    throw new ErrorBloqueo('Elige si el bloqueo es temporal o permanente.')
  }

  const cuenta = await leerCuenta(usuarioId)
  if (cuenta.rol === 'administrador') {
    throw new ErrorBloqueo('No se puede bloquear una cuenta de administrador desde aquí.')
  }

  // Si ya estaba bloqueada se conserva el estado que tenía antes del primer bloqueo.
  const estadoPrevio = esBloqueo(cuenta.estado) ? (cuenta.estadoPrevio || 'activo') : (cuenta.estado || 'activo')
  const lote = writeBatch(db)
  lote.update(doc(db, 'usuarios', usuarioId), {
    estado: tipo === 'temporal' ? 'bloqueado_temporal' : 'bloqueado',
    bloqueadoHasta: hasta ?? deleteField(),
    motivoBloqueo: motivoLimpio,
    bloqueadoEn: serverTimestamp(),
    bloqueadoPor: auth.currentUser?.uid ?? null,
    estadoPrevio,
  })
  if (reporteId) {
    lote.update(doc(db, 'reportes', reporteId), {
      estado: 'resuelta',
      accion: tipo === 'temporal' ? 'bloqueo_temporal' : 'bloqueo_definitivo',
      ...(tipo === 'temporal' ? { diasBloqueo: Number(dias) } : {}),
      notaAdmin: motivoLimpio,
      resueltaEn: serverTimestamp(),
    })
  }
  await lote.commit()
  return { hasta }
}

const CAMPOS_BLOQUEO_FUERA = {
  bloqueadoHasta: deleteField(),
  motivoBloqueo: deleteField(),
  bloqueadoEn: deleteField(),
  bloqueadoPor: deleteField(),
  estadoPrevio: deleteField(),
}

// Levanta el bloqueo (temporal o permanente): la cuenta vuelve al estado que tenía antes de bloquearse.
export async function levantarBloqueo(usuarioId) {
  const cuenta = await leerCuenta(usuarioId)
  await updateDoc(doc(db, 'usuarios', usuarioId), {
    estado: cuenta.estadoPrevio || 'activo',
    ...CAMPOS_BLOQUEO_FUERA,
    desbloqueadoEn: serverTimestamp(),
  })
}

// La propia persona reactiva su cuenta cuando su bloqueo temporal ya venció (lo permite firestore.rules).
export async function reactivarBloqueoVencido(usuarioId, cuenta) {
  await updateDoc(doc(db, 'usuarios', usuarioId), {
    estado: cuenta.estadoPrevio || 'activo',
    ...CAMPOS_BLOQUEO_FUERA,
  })
}
