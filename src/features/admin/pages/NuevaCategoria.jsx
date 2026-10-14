import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { PROFESIONES } from '@/shared/utils/profesiones'

export default function NuevaCategoria() {
  const [nombre, setNombre] = useState('')
  const [profesion, setProfesion] = useState(PROFESIONES[0])
  const [enviando, setEnviando] = useState(false)
  const navigate = useNavigate()

  async function guardar(e) {
    e.preventDefault()
    if (!nombre.trim()) return
    setEnviando(true)
    await addDoc(collection(db, 'tiposProfesion'), { nombre: nombre.trim(), profesion })
    navigate('/admin/categorias')
  }

  return (
    <div>
      <span className="back-link" onClick={() => navigate('/admin/categorias')}>← Volver a categorías</span>
      <h1 className="web-h1">Nueva categoría de especialidad</h1>
      <p className="web-sub">Esta especialidad quedará disponible para que los profesionales de esa profesión la elijan al registrarse.</p>

      <form className="card-plain" style={{ maxWidth: 480 }} onSubmit={guardar}>
        <label className="campo-label" htmlFor="profesion">Profesión</label>
        <select id="profesion" value={profesion} onChange={(e) => setProfesion(e.target.value)}>
          {PROFESIONES.map((p) => <option key={p}>{p}</option>)}
        </select>
        <label className="campo-label" htmlFor="nombre">Nombre de la categoría (especialidad)</label>
        <input id="nombre" type="text" placeholder="Ej. Dermatología" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button type="button" className="btn btn-outline" onClick={() => navigate('/admin/categorias')}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Crear categoría'}</button>
        </div>
      </form>
    </div>
  )
}
