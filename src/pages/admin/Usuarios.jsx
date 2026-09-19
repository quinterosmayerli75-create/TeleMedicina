import { useEffect, useMemo, useState } from 'react'
import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../../firebase/config'

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')

  const [modal, setModal] = useState(null)
  const [seleccion, setSeleccion] = useState(null)
  const [edicion, setEdicion] = useState(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), where('rol', '==', 'paciente'))
    const unsubscribe = onSnapshot(q, (snap) => {
      setUsuarios(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      setCargando(false)
    })
    return unsubscribe
  }, [])

  const filtrados = useMemo(() => {
    if (!busqueda) return usuarios
    const termino = busqueda.toLowerCase()
    return usuarios.filter((u) => `${u.nombre} ${u.apellido}`.toLowerCase().includes(termino) || u.email?.toLowerCase().includes(termino))
  }, [usuarios, busqueda])

  async function alternarBloqueo(u) {
    const nuevoEstado = u.estado === 'activo' ? 'bloqueado' : 'activo'
    await updateDoc(doc(db, 'usuarios', u.id), { estado: nuevoEstado })
  }

  function abrirEditar(u) {
    setSeleccion(u)
    setEdicion({
      nombre: u.nombre ?? '',
      apellido: u.apellido ?? '',
      telefono: u.telefono ?? '',
      edad: u.edad ?? '',
      lugar: u.lugar ?? '',
    })
    setModal('editar')
  }

  async function guardarEdicion(e) {
    e.preventDefault()
    setEnviando(true)
    try {
      await updateDoc(doc(db, 'usuarios', seleccion.id), {
        nombre: edicion.nombre,
        apellido: edicion.apellido,
        telefono: edicion.telefono,
        edad: edicion.edad ? Number(edicion.edad) : null,
        lugar: edicion.lugar,
      })
      setModal(null)
    } finally {
      setEnviando(false)
    }
  }

  async function eliminarUsuario() {
    await deleteDoc(doc(db, 'usuarios', seleccion.id))
    setModal(null)
  }

  if (cargando) return <p className="web-sub">Cargando…</p>

  return (
    <div>
      <h1 className="web-h1" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Usuarios registrados</span>
        <span style={{ fontSize: 14, color: 'var(--gris)', fontWeight: 400 }}>{usuarios.length} en total</span>
      </h1>

      <input
        type="text"
        placeholder="Buscar por nombre o correo…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ maxWidth: 420, marginBottom: 20 }}
      />

      <div className="card-plain" style={{ maxWidth: 960 }}>
        {filtrados.map((u) => (
          <div className="admin-row" key={u.id}>
            <div>{u.nombre} {u.apellido}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className={`status-pill ${u.estado === 'activo' ? 'status-active' : 'status-blocked'}`}>
                {u.estado === 'activo' ? 'Activo' : 'Suspendido'}
              </span>
              <button type="button" className="mini-btn" onClick={() => { setSeleccion(u); setModal('detalle') }}>Ver detalle</button>
              <button type="button" className="mini-btn" onClick={() => abrirEditar(u)}>Editar</button>
              <button type="button" className="mini-btn danger" onClick={() => alternarBloqueo(u)}>
                {u.estado === 'activo' ? 'Suspender' : 'Reactivar'}
              </button>
              <button type="button" className="mini-btn danger" onClick={() => { setSeleccion(u); setModal('eliminar') }}>Eliminar</button>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && <p className="web-sub" style={{ marginBottom: 0 }}>Aún no hay pacientes registrados.</p>}
      </div>

      {modal === 'detalle' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">{seleccion.nombre} {seleccion.apellido}</div>
            <div className="modal-sub">Paciente</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
              <div><div style={{ color: 'var(--gris)' }}>Correo</div><div style={{ fontWeight: 600 }}>{seleccion.email}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Celular</div><div style={{ fontWeight: 600 }}>{seleccion.telefono}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Edad</div><div style={{ fontWeight: 600 }}>{seleccion.edad ?? '—'}</div></div>
              <div><div style={{ color: 'var(--gris)' }}>Sexo</div><div style={{ fontWeight: 600 }}>{seleccion.sexo ?? '—'}</div></div>
              <div style={{ gridColumn: '1/3' }}><div style={{ color: 'var(--gris)' }}>Lugar donde vive</div><div style={{ fontWeight: 600 }}>{seleccion.lugar ?? '—'}</div></div>
            </div>
            <button type="button" className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModal(null)}>Cerrar</button>
          </div>
        </div>
      )}

      {modal === 'editar' && edicion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <form className="modal-tarjeta" onClick={(e) => e.stopPropagation()} onSubmit={guardarEdicion}>
            <div className="modal-titulo">Editar a {seleccion.nombre}</div>
            <div className="campos-2col">
              <div><label className="campo-label">Nombre</label><input type="text" value={edicion.nombre} onChange={(e) => setEdicion({ ...edicion, nombre: e.target.value })} required /></div>
              <div><label className="campo-label">Apellido</label><input type="text" value={edicion.apellido} onChange={(e) => setEdicion({ ...edicion, apellido: e.target.value })} required /></div>
              <div><label className="campo-label">Celular</label><input type="text" value={edicion.telefono} onChange={(e) => setEdicion({ ...edicion, telefono: e.target.value })} /></div>
              <div><label className="campo-label">Edad</label><input type="number" value={edicion.edad} onChange={(e) => setEdicion({ ...edicion, edad: e.target.value })} /></div>
            </div>
            <label className="campo-label">Lugar donde vive</label>
            <input type="text" value={edicion.lugar} onChange={(e) => setEdicion({ ...edicion, lugar: e.target.value })} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={enviando}>Guardar cambios</button>
            </div>
          </form>
        </div>
      )}

      {modal === 'eliminar' && seleccion && (
        <div className="modal-fondo" onClick={() => setModal(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>¿Eliminar a {seleccion.nombre}?</div>
            <div className="modal-sub">Se borra su perfil de la plataforma de forma permanente.</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={eliminarUsuario}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
