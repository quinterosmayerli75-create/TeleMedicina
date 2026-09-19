import { useEffect, useState } from 'react'
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../../firebase/config'

export default function Denuncias() {
  const [denuncias, setDenuncias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [seleccion, setSeleccion] = useState(null)
  const [modal, setModal] = useState(null)
  const [motivo, setMotivo] = useState('')
  const [dias, setDias] = useState(7)

  useEffect(() => {
    const q = query(collection(db, 'reportes'), where('estado', '==', 'pendiente'))
    const unsubscribe = onSnapshot(q, async (snap) => {
      const filas = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const denuncia = { id: docSnap.id, ...docSnap.data() }
          const [denuncianteSnap, denunciadoSnap] = await Promise.all([
            getDoc(doc(db, 'usuarios', denuncia.denuncianteId)),
            getDoc(doc(db, 'usuarios', denuncia.denunciadoId)),
          ])
          return {
            ...denuncia,
            denunciante: denuncianteSnap.exists() ? denuncianteSnap.data() : null,
            denunciado: denunciadoSnap.exists() ? denunciadoSnap.data() : null,
          }
        })
      )
      setDenuncias(filas)
      setCargando(false)
    })
    return unsubscribe
  }, [])

  async function descartar(d) {
    await updateDoc(doc(db, 'reportes', d.id), { estado: 'descartada', notaAdmin: motivo })
    setModal(null)
    setMotivo('')
  }

  async function bloqueoTemporal(d) {
    const hasta = new Date()
    hasta.setDate(hasta.getDate() + Number(dias))
    await updateDoc(doc(db, 'usuarios', d.denunciadoId), { estado: 'bloqueado_temporal', bloqueadoHasta: hasta })
    await updateDoc(doc(db, 'reportes', d.id), { estado: 'resuelta', accion: 'bloqueo_temporal' })
    setModal(null)
  }

  async function bloqueoDefinitivo(d) {
    await updateDoc(doc(db, 'usuarios', d.denunciadoId), { estado: 'bloqueado' })
    await updateDoc(doc(db, 'reportes', d.id), { estado: 'resuelta', accion: 'bloqueo_definitivo', notaAdmin: motivo })
    setModal(null)
    setMotivo('')
  }

  if (cargando) return <p className="web-sub">Cargando…</p>

  return (
    <div>
      <h1 className="web-h1">Denuncias</h1>
      {denuncias.length === 0 && <p className="web-sub">No hay denuncias pendientes.</p>}

      <div className="web-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        {denuncias.map((d) => (
          <div className="card-plain" key={d.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{d.motivo}</div>
              <span className="status-pill status-pending">Pendiente</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--gris)', margin: '4px 0' }}>
              Denunciado: {d.denunciado?.nombre ?? '—'}<br />
              Denunciante: {d.denunciante?.nombre ?? '—'}
            </div>
            <div className="btn-grid-4">
              <button type="button" className="btn btn-outline" onClick={() => { setSeleccion(d); setModal('info') }}>Info de denuncia</button>
              <button type="button" className="btn btn-outline" onClick={() => { setSeleccion(d); setModal('descartar') }}>Descartar</button>
              <button type="button" className="btn btn-warn" onClick={() => { setSeleccion(d); setModal('bloq-temp') }}>Bloqueo temporal</button>
              <button type="button" className="btn btn-danger" onClick={() => { setSeleccion(d); setModal('bloq-def') }}>Bloqueo definitivo</button>
            </div>
          </div>
        ))}
      </div>

      {modal === 'info' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">Información de la denuncia</div>
            <div className="modal-sub">{seleccion.motivo}</div>
            <div className="card-plain" style={{ marginTop: 12 }}>
              <div className="admin-row"><div>Denunciante</div><div style={{ fontWeight: 600 }}>{seleccion.denunciante?.nombre ?? '—'}</div></div>
              <div className="admin-row" style={{ borderBottom: 'none' }}><div>Denunciado</div><div style={{ fontWeight: 600 }}>{seleccion.denunciado?.nombre ?? '—'}</div></div>
            </div>
            <div className="section-title">Descripción del denunciante</div>
            <p style={{ fontSize: 12, lineHeight: 1.7, color: '#3a4750', background: 'var(--marfil)', padding: 12 }}>{seleccion.descripcion}</p>
            <button type="button" className="btn btn-primary" onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {modal === 'descartar' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">¿Descartar esta denuncia?</div>
            <div className="modal-sub">Se archiva y no se toma ninguna acción contra el denunciado.</div>
            <label className="campo-label">Motivo del descarte</label>
            <textarea rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej. Pruebas insuficientes…" />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={() => descartar(seleccion)}>Descartar denuncia</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'bloq-temp' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--ambar)' }}>Bloqueo temporal</div>
            <div className="modal-sub">{seleccion.denunciado?.nombre} — la cuenta se reactiva automáticamente al cumplirse el plazo.</div>
            <label className="campo-label">Duración del bloqueo (días)</label>
            <input type="number" value={dias} onChange={(e) => setDias(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-warn" onClick={() => bloqueoTemporal(seleccion)}>Aplicar bloqueo</button>
            </div>
          </div>
        </div>
      )}

      {modal === 'bloq-def' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>Bloqueo definitivo</div>
            <div className="modal-sub">{seleccion.denunciado?.nombre} — la cuenta se elimina del directorio de forma permanente.</div>
            <label className="campo-label">Motivo (obligatorio)</label>
            <textarea rows="3" value={motivo} onChange={(e) => setMotivo(e.target.value)} required />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={() => bloqueoDefinitivo(seleccion)}>Bloquear definitivamente</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
