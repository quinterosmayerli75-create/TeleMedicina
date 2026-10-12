import { useState } from 'react'
import { useSuscripcionesAdmin } from '../../hooks/useSuscripciones'
import { ESTADOS_SUSCRIPCION, PLANES, validarSuscripcion } from '../../services/suscripciones'
import { crearNotificacion } from '@/features/notificaciones/services/notificaciones'
import { formatearFecha } from '@/shared/utils/fechas'
import VisorImagen from '@/shared/components/VisorImagen'

const PESTANAS = [
  { clave: 'pago_en_revision', etiqueta: 'Por validar' },
  { clave: 'activa', etiqueta: 'Activas' },
  { clave: 'rechazada', etiqueta: 'Rechazadas' },
  { clave: 'pendiente_pago', etiqueta: 'Pendientes de pago' },
]

export default function ValidacionSuscripciones() {
  const { suscripciones, cargando } = useSuscripcionesAdmin()
  const [pestana, setPestana] = useState('pago_en_revision')
  const [visor, setVisor] = useState(null)
  const [modal, setModal] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [aviso, setAviso] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [guardando, setGuardando] = useState(false)

  const conteos = Object.fromEntries(PESTANAS.map((p) => [p.clave, suscripciones.filter((s) => s.estado === p.clave).length]))
  const filtradas = suscripciones.filter((s) => s.estado === pestana)

  async function aprobar(s) {
    setAviso('')
    setErrorAccion('')
    setGuardando(true)
    try {
      await validarSuscripcion(s, { aprobado: true })
      crearNotificacion({
        paraUid: s.doctorId,
        tipo: 'suscripcion_aprobada',
        texto: `Tu suscripción ${PLANES[s.plan]?.etiqueta.toLowerCase()} fue aprobada. Ya apareces disponible para los pacientes.`,
        enlace: '/doctor/suscripcion',
      }).catch(() => {})
      setAviso('Suscripción aprobada: el doctor ya está activo.')
    } catch {
      setErrorAccion('No se pudo aprobar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function rechazar() {
    setAviso('')
    setErrorAccion('')
    setGuardando(true)
    try {
      await validarSuscripcion(seleccion, { aprobado: false, motivoRechazo: motivo })
      crearNotificacion({
        paraUid: seleccion.doctorId,
        tipo: 'suscripcion_rechazada',
        texto: `Tu comprobante de suscripción fue rechazado: ${motivo}`,
        enlace: '/doctor/suscripcion',
      }).catch(() => {})
      setModal(null)
      setMotivo('')
      setAviso('Suscripción rechazada: se avisó al doctor.')
    } catch {
      setErrorAccion('No se pudo rechazar. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <h1 className="web-h1">Suscripciones de doctores</h1>
      <p className="web-sub">Revisa los comprobantes de pago de la suscripción mensual o anual y habilita a cada doctor.</p>
      {aviso && <div className="banner-ok" role="status">{aviso}</div>}
      {errorAccion && <div className="banner-error" role="alert">{errorAccion}</div>}

      <div className="subtabs" role="tablist">
        {PESTANAS.map((p) => (
          <button
            type="button"
            role="tab"
            key={p.clave}
            aria-selected={pestana === p.clave}
            className={`subtab${pestana === p.clave ? ' on' : ''}`}
            onClick={() => setPestana(p.clave)}
          >
            {p.etiqueta} <span className="subtab-count">{conteos[p.clave]}</span>
          </button>
        ))}
      </div>

      {cargando && <p className="web-sub">Cargando…</p>}
      {!cargando && filtradas.length === 0 && <p className="web-sub">No hay suscripciones en esta categoría.</p>}

      <div className="web-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {filtradas.map((s) => {
          const estado = ESTADOS_SUSCRIPCION[s.estado] ?? ESTADOS_SUSCRIPCION.pendiente_pago
          return (
            <div className="card-plain" key={s.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{s.doctorNombre}</div>
                <span className={`status-pill ${estado.clase}`}>{estado.etiqueta}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--gris)', margin: '4px 0 10px' }}>
                {PLANES[s.plan]?.etiqueta} · Bs {s.precio} · Solicitada el {formatearFecha(s.fechaSolicitud)}
              </div>

              {s.comprobanteUrl ? (
                <div className="doc-thumbs" style={{ marginBottom: 12 }}>
                  <a className="doc-thumb" href={s.comprobanteUrl} onClick={(e) => { e.preventDefault(); setVisor({ imagenes: [{ url: s.comprobanteUrl, etiqueta: 'Comprobante de suscripción' }], indice: 0 }) }}>
                    <img src={s.comprobanteUrl} alt="Comprobante" />Ver comprobante
                  </a>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--gris)' }}>Todavía no subió comprobante.</p>
              )}

              {s.estado === 'rechazada' && s.motivoRechazo && (
                <div className="registro-error" style={{ marginTop: 0, marginBottom: 8 }}>Motivo del rechazo: {s.motivoRechazo}</div>
              )}

              {s.estado === 'pago_en_revision' && (
                <div className="btn-grid-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <button type="button" className="btn btn-ok" disabled={guardando} onClick={() => aprobar(s)}>Aprobar</button>
                  <button type="button" className="btn btn-danger" disabled={guardando} onClick={() => { setSeleccion(s); setMotivo(''); setModal('rechazar') }}>Rechazar</button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {modal === 'rechazar' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>Rechazar comprobante</div>
            <div className="modal-sub">El doctor podrá subir otro comprobante.</div>
            <label className="campo-label">Motivo del rechazo</label>
            <textarea rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. El monto no coincide con el plan elegido…" />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" disabled={guardando} onClick={rechazar}>Rechazar comprobante</button>
            </div>
          </div>
        </div>
      )}

      {visor && (
        <VisorImagen imagenes={visor.imagenes} indice={visor.indice} onCerrar={() => setVisor(null)} onCambiar={(indice) => setVisor({ ...visor, indice })} />
      )}
    </div>
  )
}
