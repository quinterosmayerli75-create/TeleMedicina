import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import FotosDoctorAdmin from '../../components/FotosDoctorAdmin'

export default function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccion, setSeleccion] = useState(null)
  const [modal, setModal] = useState(null)
  const [motivo, setMotivo] = useState('')

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

  async function aprobar(id) {
    await updateDoc(doc(db, 'usuarios', id), { estado: 'activo' })
    await updateDoc(doc(db, 'profesionales', id), { verificado: true })
    setModal(null)
  }

  async function rechazoTemporal(id) {
    await updateDoc(doc(db, 'usuarios', id), { estado: 'rechazado_temporal' })
    await updateDoc(doc(db, 'profesionales', id), { verificado: false, motivoRechazo: motivo })
    setModal(null)
    setMotivo('')
  }

  async function rechazarDefinitivo(id) {
    await updateDoc(doc(db, 'usuarios', id), { estado: 'rechazado_definitivo' })
    await updateDoc(doc(db, 'profesionales', id), { verificado: false, motivoRechazo: motivo })
    setModal(null)
    setMotivo('')
  }

  if (cargando) return <p className="web-sub">Cargando…</p>

  return (
    <div>
      <h1 className="web-h1">Solicitudes de registro</h1>
      {solicitudes.length === 0 && <p className="web-sub">No hay solicitudes pendientes.</p>}

      <div className="web-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {solicitudes.map((s) => (
          <div className="card-plain" key={s.id} style={{ borderColor: 'var(--oro)' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              {s.fotoUrl && <img src={s.fotoUrl} style={{ width: 44, height: 44, objectFit: 'cover' }} alt={s.nombre} />}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 12.5 }}>{s.nombre}</div>
                <div style={{ fontSize: 11, color: 'var(--gris)' }}>{s.profesional?.profesion ?? '—'} · {s.profesional?.especialidad ?? '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--gris)' }}>Carnet {s.profesional?.carnet ?? '—'} · Bs {s.profesional?.costoConsulta ?? '—'} / consulta</div>
              </div>
              <span className="status-pill status-pending">En revisión</span>
            </div>
            <div className="btn-grid-4">
              <button type="button" className="btn btn-ok" onClick={() => aprobar(s.id)}>Aprobar</button>
              <button type="button" className="btn btn-outline" onClick={() => { setSeleccion(s); setModal('detalles') }}>Ver detalles</button>
              <button type="button" className="btn btn-warn" onClick={() => { setSeleccion(s); setModal('rechazo-temp') }}>Rechazo temporal</button>
              <button type="button" className="btn btn-danger" onClick={() => { setSeleccion(s); setModal('rechazo-def') }}>Rechazar definitivo</button>
            </div>
          </div>
        ))}
      </div>

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
              <button type="button" className="btn btn-warn" onClick={() => rechazoTemporal(seleccion.id)}>Enviar rechazo temporal</button>
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
              <button type="button" className="btn btn-danger" onClick={() => rechazarDefinitivo(seleccion.id)}>Rechazar definitivamente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
