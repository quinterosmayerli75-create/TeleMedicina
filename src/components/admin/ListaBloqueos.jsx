import { useState } from 'react'
import { levantarBloqueo, mensajeErrorBloqueo } from '../../firebase/bloqueos'
import { diasRestantes, formatearFecha } from '../../utils/fechas'

const ETIQUETA_ROL = { profesional: 'Doctor', paciente: 'Paciente', administrador: 'Administrador' }

// Lista de cuentas bloqueadas (temporal o permanentemente) con el motivo, la fecha y el botón para
// levantar el bloqueo. Sale igual en Inicio y estadísticas, Denuncias y Doctores.
// `bloqueados` viene de useBloqueados().
export default function ListaBloqueos({ bloqueados, cargando, temporal = false, soloDoctores = false }) {
  const [confirmando, setConfirmando] = useState(null)
  const [procesando, setProcesando] = useState(null)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  async function levantar(u) {
    setError('')
    setAviso('')
    setProcesando(u.id)
    try {
      await levantarBloqueo(u.id)
      setAviso(`Se levantó el bloqueo de ${[u.nombre, u.apellido].filter(Boolean).join(' ')}: su cuenta vuelve a estar activa.`)
      setConfirmando(null)
    } catch (err) {
      setError(mensajeErrorBloqueo(err))
    } finally {
      setProcesando(null)
    }
  }

  if (cargando) return <p className="web-sub">Cargando…</p>

  const vacio = soloDoctores
    ? (temporal ? 'No hay doctores bloqueados temporalmente.' : 'No hay doctores bloqueados permanentemente.')
    : (temporal ? 'No hay usuarios con bloqueo temporal.' : 'No hay usuarios con bloqueo permanente.')

  return (
    <>
      {aviso && <div className="banner-ok" role="status">{aviso}</div>}
      {error && <div className="banner-error" role="alert">{error}</div>}
      <div className="card-plain" style={{ maxWidth: 960 }} data-testid={temporal ? 'lista-bloqueo-temporal' : 'lista-bloqueo-permanente'}>
        {bloqueados.length === 0 && <p className="web-sub" style={{ marginBottom: 0 }}>{vacio}</p>}
        {bloqueados.map((u) => {
          const dias = diasRestantes(u.bloqueadoHasta)
          const nombre = [u.nombre, u.apellido].filter(Boolean).join(' ')
          const motivo = u.motivoBloqueo || u.denuncia?.notaAdmin
          return (
            <div className="admin-row" key={u.id} style={{ alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div>
                  {nombre}
                  <span className="status-pill status-pending" style={{ marginLeft: 8 }}>{ETIQUETA_ROL[u.rol] ?? u.rol}</span>
                </div>
                <div className="rank-meta">
                  {u.profesional?.especialidad && <>{u.profesional.especialidad} · </>}
                  {motivo ? <>Motivo: {motivo}</> : 'Sin motivo registrado'}
                  {u.denuncia?.motivo && <> · Denuncia: {u.denuncia.motivo}</>}
                  {!u.denuncia && <> · Sin denuncia asociada</>}
                </div>
                {u.bloqueadoEn && <div className="rank-meta">Bloqueado el {formatearFecha(u.bloqueadoEn)}</div>}
              </div>
              <div style={{ textAlign: 'right', minWidth: 190 }}>
                {temporal ? (
                  <>
                    <span className="status-pill status-warn">Hasta {formatearFecha(u.bloqueadoHasta)}</span>
                    <div className="rank-meta" style={{ marginTop: 4 }}>
                      {dias === null ? 'Sin fecha de fin' : dias > 0 ? `Faltan ${dias} día${dias === 1 ? '' : 's'}` : 'Plazo cumplido (se reactiva al volver a entrar)'}
                    </div>
                  </>
                ) : (
                  <span className="status-pill status-blocked">Bloqueado permanentemente</span>
                )}
                <div style={{ marginTop: 8 }}>
                  {confirmando === u.id ? (
                    <span style={{ display: 'inline-flex', gap: 6 }}>
                      <button type="button" className="mini-btn" onClick={() => setConfirmando(null)} disabled={procesando === u.id}>Cancelar</button>
                      <button type="button" className="mini-btn danger" onClick={() => levantar(u)} disabled={procesando === u.id}>
                        {procesando === u.id ? 'Levantando…' : 'Confirmar'}
                      </button>
                    </span>
                  ) : (
                    <button type="button" className="mini-btn" onClick={() => { setError(''); setAviso(''); setConfirmando(u.id) }}>Levantar bloqueo</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
