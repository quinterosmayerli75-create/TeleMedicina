import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '../../firebase/config'

export default function NuevaCategoria() {
  const [nombre, setNombre] = useState('')
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()

  async function guardar(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setEnviando(true)
    await addDoc(collection(db, 'tiposProfesion'), { nombre: nombre.trim() })
    navigate('/admin/categorias')
  }

  return (
    <div>
      <span className="back-link" onClick={() => navigate('/admin/categorias')}>← Volver a categorías</span>
      <h1 className="web-h1">Nueva categoría de especialidad</h1>
      <p className="web-sub">Esta especialidad quedará disponible para que los profesionales la elijan al registrarse.</p>

      <form className="card-plain" style={{ maxWidth: 480 }} onSubmit={guardar}>
        <label className="campo-label" htmlFor="nombre">Nombre de la categoría</label>
        <input id="nombre" type="text" placeholder="Ej. Dermatología" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/categorias')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Crear categoría'}</button>
        </div>
      </form>
    </div>
  )
}
