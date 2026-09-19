import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteDoc, doc, onSnapshot, updateDoc, collection } from 'firebase/firestore'
import { db } from '../../firebase/config'

export default function Categorias() {
  const [categorias, setCategorias] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null)
  const [nombreEdicion, setNombreEdicion] = useState('')
  const [aEliminar, setAEliminar] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tiposProfesion'), (snap) => {
      setCategorias(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })
    return unsubscribe
  }, [])

  const filtradas = useMemo(() => {
    if (!busqueda) return categorias
    return categorias.filter((c) => c.nombre?.toLowerCase().includes(busqueda.toLowerCase()))
  }, [categorias, busqueda])

  async function guardarEdicion() {
    await updateDoc(doc(db, 'tiposProfesion', editando.id), { nombre: nombreEdicion.trim() })
    setEditando(null)
  }

  async function confirmarEliminar() {
    await deleteDoc(doc(db, 'tiposProfesion', aEliminar.id))
    setAEliminar(null)
  }

  return (
    <div>
      <h1 className="web-h1">Categorías de especialidad</h1>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar categoría…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ maxWidth: 420 }}
        />
        <button type="button" className="btn btn-primary btn-auto" onClick={() => navigate('/admin/categorias/nueva')}>
          + Nueva categoría
        </button>
      </div>

      <div className="card-plain" style={{ maxWidth: 720 }}>
        {filtradas.length === 0 && <p className="web-sub" style={{ marginBottom: 0 }}>No se encontraron categorías.</p>}
        {filtradas.map((c) => (
          <div className="cat-row" key={c.id}>
            <div>{c.nombre}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="mini-btn" onClick={() => { setEditando(c); setNombreEdicion(c.nombre) }}>Editar</button>
              <button type="button" className="mini-btn danger" onClick={() => setAEliminar(c)}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>

      {editando && (
        <div className="modal-fondo" onClick={() => setEditando(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo">Editar categoría</div>
            <div className="modal-sub">Los doctores ya registrados en esta categoría conservan su especialidad.</div>
            <label className="campo-label">Nombre de la categoría</label>
            <input type="text" value={nombreEdicion} onChange={(e) => setNombreEdicion(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setEditando(null)}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={guardarEdicion}>Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {aEliminar && (
        <div className="modal-fondo" onClick={() => setAEliminar(null)}>
          <div className="modal-tarjeta" onClick={(e) => e.stopPropagation()}>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>¿Eliminar esta categoría?</div>
            <div className="modal-sub">Está por eliminar "{aEliminar.nombre}".</div>
            <div style={{ background: '#F7ECEB', borderLeft: '2px solid var(--alerta)', padding: 12, fontSize: 11.5, lineHeight: 1.6, color: '#5c3330' }}>
              Esta acción no se puede deshacer. Los doctores en esta categoría quedarán sin especialidad asignada
              hasta que se les asigne otra.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button type="button" className="btn btn-outline" onClick={() => setAEliminar(null)}>Cancelar</button>
              <button type="button" className="btn btn-danger" onClick={confirmarEliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
