import { useEffect, useMemo, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { crearNotificacion } from '@/features/notificaciones/services/notificaciones'
import { aFecha, formatearFecha } from '@/shared/utils/fechas'
import FotosDoctorAdmin from '../components/FotosDoctorAdmin'

const ORDENES = [
  { clave: 'reciente', etiqueta: 'Más recientes primero' },
  { clave: 'antigua', etiqueta: 'Más antiguas primero' },
  { clave: 'nombre', etiqueta: 'Nombre (A-Z)' },
]

const POR_PAGINA = 6

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccion, setSeleccion] = useState(null)
  const [modal, setModal] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [orden, setOrden] = useState('reciente')
  const [pagina, setPagina] = useState(1)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), where('rol', '==', 'profesional'), where('estado', '==', 'pendiente'))
    const unsubscribe = onSnapshot(q, async (snap) => {
      const filas = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const usuario = { id: docSnap.id, ...docSnap.data() }
          const profSnap = await getDoc(doc(db, 'profesionales', docSnap.id))
          return { ...usuario, profesional: profSnap.exists() ? profSnap.data() : null }
        })
      )
      setSolicitudes(filas)
      setCargando(false)
    })
    return unsubscribe
  }, [])

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase()
    const resultado = termino
      ? solicitudes.filter((s) =>
          s.nombre?.toLowerCase().includes(termino) ||
          s.profesional?.especialidad?.toLowerCase().includes(termino) ||
          s.profesional?.profesion?.toLowerCase().includes(termino)
        )
      : [...solicitudes]

    if (orden === 'nombre') {
      resultado.sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? '', 'es'))
    } else {
      resultado.sort((a, b) => {
        const diferencia = (aFecha(a.fechaRegistro)?.getTime() ?? 0) - (aFecha(b.fechaRegistro)?.getTime() ?? 0)
        return orden === 'antigua' ? diferencia : -diferencia
      })
    }
    return resultado
  }, [solicitudes, busqueda, orden])

  useEffect(() => setPagina(1), [busqueda, orden])

  const totalPaginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA))
  const paginadas = filtradas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA)

  async function aprobar(s) {
    await updateDoc(doc(db, 'usuarios', s.id), { estado: 'activo' })
    await updateDoc(doc(db, 'profesionales', s.id), { verificado: true })
    crearNotificacion({ paraUid: s.id, tipo: 'cuenta_verificada', texto: '¡Tu cuenta de profesional fue verificada! Ya apareces disponible para los pacientes.', enlace: '/doctor/panel' }).catch(() => {})
    setModal(null)
    setAviso(`Se aprobó la solicitud de ${s.nombre}.`)
  }

  async function rechazoTemporal(s) {
    await updateDoc(doc(db, 'usuarios', s.id), { estado: 'rechazado_temporal' })
    await updateDoc(doc(db, 'profesionales', s.id), { verificado: false, motivoRechazo: motivo })
    crearNotificacion({ paraUid: s.id, tipo: 'cuenta_rechazada', texto: `Tu registro fue rechazado: ${motivo}. Puedes corregirlo y volver a enviarlo.`, enlace: '/doctor/panel' }).catch(() => {})
    setModal(null)
    setMotivo('')
    setAviso(`Se envió un rechazo temporal a ${s.nombre}.`)
  }

  async function rechazarDefinitivo(s) {
    await updateDoc(doc(db, 'usuarios', s.id), { estado: 'rechazado_definitivo' })
    await updateDoc(doc(db, 'profesionales', s.id), { verificado: false, motivoRechazo: motivo })
    crearNotificacion({ paraUid: s.id, tipo: 'cuenta_rechazada', texto: `Tu registro fue rechazado definitivamente: ${motivo}`, enlace: '/doctor/panel' }).catch(() => {})
    setModal(null)
    setMotivo('')
    setAviso(`Se rechazó definitivamente la solicitud de ${s.nombre}.`)
  }

  if (cargando) return <p className="web-sub">Cargando…</p>

  return (
    <div>
      <h1 className="web-h1" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Solicitudes de registro</span>
        <span style={{ fontSize: 14, color: 'var(--gris)', fontWeight: 400 }}>{solicitudes.length} en total</span>
      </h1>

      {aviso && <div className="banner-ok" role="status">{aviso}</div>}

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por nombre, profesión o especialidad…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 360, margin: 0 }}
        />
        <select value={orden} onChange={(e) => setOrden(e.target.value)} style={{ maxWidth: 220 }}>
          {ORDENES.map((o) => (
            <option key={o.clave} value={o.clave}>{o.etiqueta}</option>
          ))}
        </select>
      </div>

      {solicitudes.length === 0 && <p className="web-sub">No hay solicitudes pendientes.</p>}

      {solicitudes.length > 0 && filtradas.length === 0 && (
        <p className="web-sub">No hay solicitudes que coincidan con la búsqueda.</p>
      )}

      <div className="web-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {paginadas.map((s) => (
          <div className="card-plain" key={s.id} style={{ borderColor: 'var(--oro)' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {s.fotoUrl && <img src={s.fotoUrl} style={{ width: 44, height: 44, objectFit: 'cover' }} alt={s.nombre} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--gris)' }}>{s.profesional?.profesion ?? '—'} · {s.profesional?.especialidad ?? '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--gris)' }}>Carnet {s.profesional?.carnet ?? '—'} · Bs {s.profesional?.costoConsulta ?? '—'} / consulta</div>
                <div style={{ fontSize: 11, color: 'var(--gris)' }}>Solicitado el {formatearFecha(s.fechaRegistro)}</div>
              </div>
              <span className="status-pill status-pending">En revisión</span>
            </div>
            <div className="btn-grid-4">
              <button type="button" className="btn btn-ok" onClick={() => aprobar(s)}>Aprobar</button>
              <button type="button" className="btn btn-outline" onClick={() => { setSeleccion(s); setModal('detalles') }}>Ver detalles</button>
              <button type="button" className="btn btn-warn" onClick={() => { setSeleccion(s); setModal('rechazo-temp') }}>Rechazo temporal</button>
              <button type="button" className="btn btn-danger" onClick={() => { setSeleccion(s); setModal('rechazo-def') }}>Rechazar definitivo</button>
            </div>
          </div>
        ))}
      </div>

      {filtradas.length > POR_PAGINA && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button type="button" className="mini-btn" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>← Anterior</button>
          <span className="rank-meta">Página {pagina} de {totalPaginas}</span>
          <button type="button" className="mini-btn" disabled={pagina >= totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente →</button>
        </div>
      )}

      {modal === 'detalles' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">Detalles de la solicitud</div>
            <div className="modal-sub">{seleccion.nombre}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12, marginTop: 12 }}>
              <div><div style={{ color: 'var(--gris)' }}>Correo</div><div style={{ fontWeight: 600 }}>{seleccion.email}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Profesión</div><div style={{ fontWeight: 600 }}>{seleccion.profesional?.profesion ?? '—'}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Especialidad</div><div style={{ fontWeight: 600 }}>{seleccion.profesional?.especialidad ?? '—'}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Carnet profesional</div><div style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{seleccion.profesional?.carnet ?? '—'}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Experiencia</div><div style={{ fontWeight: 600 }}>{seleccion.profesional?.experiencia ?? '—'}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Celular</div><div style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{seleccion.telefono}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Costo de consulta</div><div style={{ fontWeight: 600 }}>Bs {seleccion.profesional?.costoConsulta ?? '—'}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Edad</div><div style={{ fontWeight: 600 }}>{seleccion.edad ? `${seleccion.edad} años` : '—'}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Estatura · Peso</div><div style={{ fontWeight: 600 }}>{seleccion.estatura || '—'} · {seleccion.peso || '—'}</div></div>
              <div style={{ gridColumn: '1/3' }}><div style={{ color: 'var(--gris)' }}>Descripción</div><div style={{ fontWeight: 600 }}>{seleccion.profesional?.descripcion || '—'}</div></div>
            </div>
            <FotosDoctorAdmin doctor={seleccion} />
            <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {modal === 'rechazo-temp' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--ambar)' }}>Rechazo temporal</div>
            <div className="modal-sub">{seleccion.nombre} podrá corregir y volver a solicitar revisión.</div>
            <label className="campo-label">Detalle para el profesional</label>
            <textarea rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Explique qué debe corregir…" />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-warn" onClick={() => rechazoTemporal(seleccion)}>Enviar rechazo temporal</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'rechazo-def' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>Rechazar definitivamente</div>
            <div className="modal-sub">La cuenta se anula y no podrá volver a solicitarse con el mismo carnet.</div>
            <label className="campo-label">Motivo detallado (obligatorio)</label>
            <textarea rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={() => rechazarDefinitivo(seleccion)}>Rechazar definitivamente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
