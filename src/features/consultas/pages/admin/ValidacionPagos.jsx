import { useState } from 'react'
import { useConsultasAdmin } from '../../hooks/useConsultas'
import { ESTADOS_CONSULTA, MODALIDADES, validarPago } from '../../services/consultas'
import { crearNotificacion } from '@/features/notificaciones/services/notificaciones'
import { descargarCSV } from '@/shared/utils/exportar'
import { formatearFecha } from '@/shared/utils/fechas'
import VisorImagen from '@/shared/components/VisorImagen'

const COLUMNAS_EXPORTAR = [
  { clave: 'paciente', etiqueta: 'Paciente' },
  { clave: 'doctor', etiqueta: 'Doctor' },
  { clave: 'modalidad', etiqueta: 'Modalidad' },
  { clave: 'costoConsulta', etiqueta: 'Costo (Bs)' },
  { clave: 'fecha', etiqueta: 'Fecha agendada' },
  { clave: 'hora', etiqueta: 'Hora agendada' },
  { clave: 'estado', etiqueta: 'Estado' },
  { clave: 'fechaSolicitud', etiqueta: 'Solicitada el' },
]

const PESTANAS = [
  { clave: 'pago_en_revision', etiqueta: 'Por validar' },
  { clave: 'habilitada', etiqueta: 'Habilitadas' },
  { clave: 'rechazada', etiqueta: 'Rechazadas' },
  { clave: 'finalizada', etiqueta: 'Finalizadas' },
]

export default function ValidacionPagos() {
  const { consultas, cargando } = useConsultasAdmin()
  const [pestana, setPestana] = useState('pago_en_revision')
  const [visor, setVisor] = useState(null)
  const [modal, setModal] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [aviso, setAviso] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [guardando, setGuardando] = useState(false)

  const conteos = Object.fromEntries(PESTANAS.map((p) => [p.clave, consultas.filter((c) => c.estado === p.clave).length]))
  const filtradas = consultas.filter((c) => c.estado === pestana)
  const filasExportar = filtradas.map((c) => ({
    paciente: c.paciente?.nombre ?? c.pacienteNombre,
    doctor: c.doctor?.nombre ?? c.doctorNombre,
    modalidad: MODALIDADES[c.modalidad]?.etiqueta,
    costoConsulta: c.costoConsulta,
    fecha: c.fecha,
    hora: c.hora,
    estado: (ESTADOS_CONSULTA[c.estado] ?? ESTADOS_CONSULTA.pendiente_pago).etiqueta,
    fechaSolicitud: formatearFecha(c.fechaSolicitud),
  }))

  async function aprobar(c) {
    setAviso('')
    setErrorAccion('')
    setGuardando(true)
    try {
      await validarPago(c.id, { aprobado: true })
      crearNotificacion({
        paraUid: c.pacienteId,
        tipo: 'pago_aprobado',
        texto: `Tu pago para la consulta con ${c.doctorNombre} fue aprobado. ¡Ya puedes iniciarla!`,
        enlace: `/paciente/consultas/${c.id}`,
      }).catch(() => {})
      setAviso('Pago aprobado: la consulta quedó habilitada.')
    } catch {
      setErrorAccion('No se pudo aprobar el pago. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  async function rechazar() {
    setAviso('')
    setErrorAccion('')
    setGuardando(true)
    try {
      await validarPago(seleccion.id, { aprobado: false, motivoRechazo: motivo })
      crearNotificacion({
        paraUid: seleccion.pacienteId,
        tipo: 'pago_rechazado',
        texto: `Tu comprobante para la consulta con ${seleccion.doctorNombre} fue rechazado: ${motivo}`,
        enlace: `/paciente/consultas/${seleccion.id}`,
      }).catch(() => {})
      setModal(null)
      setMotivo('')
      setAviso('Pago rechazado: se avisó al paciente para que vuelva a intentarlo.')
    } catch {
      setErrorAccion('No se pudo rechazar el pago. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div>
      <h1 className="web-h1">Validación de pagos</h1>
      <p className="web-sub">Revisa los comprobantes de pago que suben los pacientes y habilita o rechaza cada consulta.</p>
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

      {filtradas.length > 0 && (
        <button type="button" className="btn btn-outline btn-auto" style={{ marginBottom: 14 }} onClick={() => descargarCSV(`consultas-${pestana}-doctop`, COLUMNAS_EXPORTAR, filasExportar)}>
          📊 Exportar esta lista a Excel
        </button>
      )}

      {cargando && <p className="web-sub">Cargando…</p>}
      {!cargando && filtradas.length === 0 && <p className="web-sub">No hay consultas en esta categoría.</p>}

      <div className="web-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {filtradas.map((c) => {
          const estado = ESTADOS_CONSULTA[c.estado] ?? ESTADOS_CONSULTA.pendiente_pago
          return (
            <div className="card-plain" key={c.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600 }}>{c.paciente?.nombre ?? c.pacienteNombre} → {c.doctor?.nombre ?? c.doctorNombre}</div>
                <span className={`status-pill ${estado.clase}`}>{estado.etiqueta}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--gris)', margin: '4px 0 10px' }}>
                {MODALIDADES[c.modalidad]?.icono} {MODALIDADES[c.modalidad]?.etiqueta} · Bs {c.costoConsulta}
                {c.fecha && ` · 📅 ${c.fecha} ${c.hora ?? ''}`}
              </div>

              {c.comprobanteUrl ? (
                <div className="doc-thumbs" style={{ marginBottom: 12 }}>
                  <a className="doc-thumb" href={c.comprobanteUrl} onClick={(e) => { e.preventDefault(); setVisor({ imagenes: [{ url: c.comprobanteUrl, etiqueta: 'Comprobante de pago' }], indice: 0 }) }}>
                    <img src={c.comprobanteUrl} alt="Comprobante de pago" />Ver comprobante
                  </a>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: 'var(--gris)' }}>Todavía no subió comprobante.</p>
              )}

              {c.estado === 'rechazada' && c.motivoRechazo && (
                <div className="registro-error" style={{ marginTop: 0, marginBottom: 8 }}>Motivo del rechazo: {c.motivoRechazo}</div>
              )}

              {c.estado === 'pago_en_revision' && (
                <div className="btn-grid-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <button type="button" className="btn btn-ok" disabled={guardando} onClick={() => aprobar(c)}>Aprobar</button>
                  <button type="button" className="btn btn-danger" disabled={guardando} onClick={() => { setSeleccion(c); setMotivo(''); setModal('rechazar') }}>Rechazar</button>
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
            <div className="modal-sub">El paciente podrá subir otro comprobante.</div>
            <label className="campo-label">Motivo del rechazo</label>
            <textarea rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. El monto no coincide con el costo de la consulta…" />
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
