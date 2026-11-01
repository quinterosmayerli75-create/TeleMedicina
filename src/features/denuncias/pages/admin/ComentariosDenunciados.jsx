import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { MessageSquareWarning } from 'lucide-react'
import { db } from '@/services/firebase/config'
import { bloquearUsuario, mensajeErrorBloqueo } from '@/features/bloqueos/services/bloqueos'
import ModalBloqueo from '@/features/bloqueos/components/ModalBloqueo'
import { ocultarComentario, resolverDenunciaComentario } from '@/features/profesionales/services/calificaciones'
import { crearNotificacion } from '@/features/notificaciones/services/notificaciones'
import { formatearFecha } from '@/shared/utils/fechas'

const PESTANAS = [
  { clave: 'pendiente', etiqueta: 'Pendientes' },
  { clave: 'resuelta', etiqueta: 'Resueltas' },
]

const ETIQUETA_ACCION = {
  oculto: 'Comentario ocultado',
  aviso: 'Aviso enviado',
  bloqueo_temporal: 'Paciente suspendido temporalmente',
  bloqueo_definitivo: 'Paciente suspendido definitivamente',
}

async function leerUsuario(id) {
  if (!id) return null
  try {
    const snap = await getDoc(doc(db, 'usuarios', id))
    return snap.exists() ? { id, ...snap.data() } : null
  } catch {
    return null
  }
}

// Denuncias de comentarios (el doctor denuncia, nunca puede borrar él mismo — ver
// ResenasDoctor.jsx). El admin decide: ocultar el comentario (no se borra de la base de datos),
// mandar un aviso al paciente, o suspenderlo temporal o definitivamente.
export default function ComentariosDenunciados() {
  const [denuncias, setDenuncias] = useState([])
  const [personas, setPersonas] = useState({})
  const [cargando, setCargando] = useState(true)
  const [pestana, setPestana] = useState('pendiente')
  const [aviso, setAviso] = useState('')
  const [errorAccion, setErrorAccion] = useState('')
  const [modal, setModal] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [mensajeAviso, setMensajeAviso] = useState('')
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query(collection(db, 'reportes'), where('tipoDenuncia', '==', 'comentario')),
      async (snap) => {
        const filas = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.fecha?.toMillis?.() ?? 0) - (a.fecha?.toMillis?.() ?? 0))
        setDenuncias(filas)
        setCargando(false)

        const idsFaltantes = [...new Set(filas.flatMap((f) => [f.denuncianteId, f.denunciadoId]))]
          .filter((id) => id && !personas[id])
        if (idsFaltantes.length > 0) {
          const nuevos = await Promise.all(idsFaltantes.map(async (id) => [id, await leerUsuario(id)]))
          setPersonas((prev) => ({ ...prev, ...Object.fromEntries(nuevos) }))
        }
      },
      () => setCargando(false)
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtradas = denuncias.filter((d) => d.estado === pestana)
  const conteoPendientes = denuncias.filter((d) => d.estado === 'pendiente').length

  async function ocultar(d) {
    setAviso('')
    setErrorAccion('')
    setProcesando(true)
    try {
      await ocultarComentario(d.calificacionId)
      await resolverDenunciaComentario(d.id, { accion: 'oculto', notaAdmin: 'El comentario se ocultó del perfil público.' })
      setAviso('El comentario quedó oculto (no se borró de la base de datos).')
    } catch (err) {
      setErrorAccion(mensajeErrorBloqueo(err))
    } finally {
      setProcesando(false)
    }
  }

  async function enviarAviso() {
    if (!mensajeAviso.trim()) return
    setProcesando(true)
    setErrorAccion('')
    try {
      await crearNotificacion({
        paraUid: seleccion.denunciadoId,
        tipo: 'aviso_moderacion',
        texto: mensajeAviso.trim(),
        enlace: '',
      })
      await resolverDenunciaComentario(seleccion.id, { accion: 'aviso', notaAdmin: mensajeAviso.trim() })
      setAviso('Se le envió el aviso al paciente.')
      setModal(null)
      setMensajeAviso('')
    } catch (err) {
      setErrorAccion(mensajeErrorBloqueo(err))
    } finally {
      setProcesando(false)
    }
  }

  async function suspender({ tipo, dias, motivo }) {
    await bloquearUsuario({ usuarioId: seleccion.denunciadoId, tipo, dias, motivo, reporteId: seleccion.id })
    setAviso(`Se suspendió ${tipo === 'temporal' ? 'temporalmente' : 'definitivamente'} al paciente.`)
    setModal(null)
  }

  return (
    <div>
      <div className="admin-eyebrow">
        MODERACIÓN DE COMENTARIOS
        <span className="vivo"><span className="punto" /> Sincronización en vivo</span>
      </div>
      <h1 className="web-h1">Comentarios denunciados</h1>
      <p className="web-sub">Comentarios que un doctor marcó como indebidos. El doctor no puede borrarlos: solo tú decides qué hacer.</p>

      {aviso && <div className="banner-ok" role="status">{aviso}</div>}
      {errorAccion && <div className="banner-error" role="alert">{errorAccion}</div>}

      <div className="admin-metric-grid" style={{ gridTemplateColumns: 'repeat(1, 260px)', marginBottom: 16 }}>
        <div className="admin-metric-card c-ambar">
          <div className="icono"><MessageSquareWarning size={16} strokeWidth={2} /></div>
          <div className="overline">Por revisar</div>
          <div className="numero">{conteoPendientes}</div>
          <div className="caption">Comentario{conteoPendientes === 1 ? '' : 's'} denunciado{conteoPendientes === 1 ? '' : 's'}</div>
        </div>
      </div>

      <div className="admin-subtabs" role="tablist">
        {PESTANAS.map((p) => (
          <button
            type="button"
            role="tab"
            key={p.clave}
            aria-selected={pestana === p.clave}
            className={`admin-subtab${pestana === p.clave ? ' on' : ''}`}
            onClick={() => setPestana(p.clave)}
          >
            {p.etiqueta} <span className="admin-subtab-count">{denuncias.filter((d) => d.estado === p.clave).length}</span>
          </button>
        ))}
      </div>

      {cargando && <p className="web-sub">Cargando…</p>}
      {!cargando && filtradas.length === 0 && <p className="web-sub">No hay denuncias de comentarios en esta categoría.</p>}

      {filtradas.map((d) => {
        const denunciante = personas[d.denuncianteId]
        const denunciado = personas[d.denunciadoId]
        return (
          <div className="card-plain admin-list-card" key={d.id} style={{ maxWidth: 720 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Comentario de {denunciado?.nombre ?? 'Paciente'} {denunciado?.apellido ?? ''}</div>
                <div className="rank-meta">Denunciado por Dr./Dra. {denunciante?.nombre ?? '—'} · {formatearFecha(d.fecha)}</div>
              </div>
              {d.estado === 'resuelta' && (
                <span className="status-pill status-active">{ETIQUETA_ACCION[d.accion] ?? 'Resuelta'}</span>
              )}
            </div>
            <p className="resena-texto" style={{ fontStyle: 'italic', margin: '10px 0' }}>"{d.comentarioTexto}"</p>
            <div className="rank-meta">Motivo: {d.motivo}</div>
            {d.estado === 'resuelta' && d.notaAdmin && <div className="rank-meta">Nota: {d.notaAdmin}</div>}

            {d.estado === 'pendiente' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button type="button" className="mini-btn" disabled={procesando} onClick={() => ocultar(d)}>Ocultar comentario</button>
                <button type="button" className="mini-btn" disabled={procesando} onClick={() => { setSeleccion(d); setMensajeAviso(''); setModal('aviso') }}>Enviar aviso</button>
                <button type="button" className="mini-btn danger" disabled={procesando} onClick={() => { setSeleccion(d); setModal('suspender') }}>Suspender paciente</button>
              </div>
            )}
          </div>
        )
      })}

      {modal === 'aviso' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">Enviar aviso al paciente</div>
            <div className="modal-sub">Le llegará como notificación dentro de la app.</div>
            <label className="campo-label">Mensaje</label>
            <textarea rows="3" value={mensajeAviso} onChange={(e) => setMensajeAviso(e.target.value)} placeholder="Ej. Tu comentario no respetó las normas de la comunidad. Evita este tipo de lenguaje." />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" disabled={procesando || !mensajeAviso.trim()} onClick={enviarAviso}>
                {procesando ? 'Enviando…' : 'Enviar aviso'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'suspender' && seleccion && (
        <ModalBloqueo
          nombre={personas[seleccion.denunciadoId]?.nombre ?? 'Este paciente'}
          onCerrar={() => setModal(null)}
          onConfirmar={suspender}
        />
      )}
    </div>
  )
}
