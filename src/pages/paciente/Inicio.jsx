import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useProfesionalesActivos } from '../../hooks/useProfesionalesActivos'
import { useTiposProfesion } from '../../hooks/useTiposProfesion'
import TarjetaDoctor from '../../components/TarjetaDoctor'

export default function Inicio() {
  const [especialidad, setEspecialidad] = useState('General')
  const [busqueda, setBusqueda] = useState('')
  const { usuario } = useAuth()
  const { profesionales, cargando } = useProfesionalesActivos()
  const tipos = useTiposProfesion()

  const destacados = profesionales
    .filter((p) => especialidad === 'General' || p.especialidad === especialidad)
    .filter(
      (p) =>
        !busqueda ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.especialidad?.toLowerCase().includes(busqueda.toLowerCase())
    )
    .sort((a, b) => b.calificacionPromedio - a.calificacionPromedio)
    .slice(0, 6)
    .map((p, i) => ({ ...p, destacado: i + 1 }))

  const primerNombre = usuario?.email?.split('@')[0] ?? ''

  return (
    <div>
      <h1 className="web-h1">Buenas tardes{primerNombre ? `, ${primerNombre}` : ''}</h1>
      <p className="web-sub">¿Con quién le gustaría hablar hoy? Todas las consultas son 100% virtuales.</p>

      <input
        type="text"
        placeholder="Buscar por nombre o especialidad…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{ maxWidth: 420, marginBottom: 20 }}
      />

      <div className="chip-row" style={{ marginBottom: 20 }}>
        <div className={`chip${especialidad === 'General' ? ' on' : ''}`} onClick={() => setEspecialidad('General')}>General</div>
        {tipos.map((t) => (
          <div
            key={t.id}
            className={`chip${especialidad === t.nombre ? ' on' : ''}`}
            onClick={() => setEspecialidad(t.nombre)}
          >
            {t.nombre}
          </div>
        ))}
      </div>

      <h2 className="section-title">Top destacados{especialidad !== 'General' ? ` en ${especialidad}` : ''}</h2>
      {cargando && <p className="web-sub">Cargando…</p>}
      {!cargando && destacados.length === 0 && <p className="web-sub">No hay profesionales que coincidan con la búsqueda.</p>}
      <div className="web-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {destacados.map((doctor) => (
          <TarjetaDoctor key={doctor.id} doctor={doctor} columna />
        ))}
      </div>
    </div>
  )
}
