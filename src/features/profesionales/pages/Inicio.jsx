import { useState } from 'react'
import { Search, ArrowUpRight } from '@/shared/components/Icons'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { useProfesionalesActivos } from '../hooks/useProfesionalesActivos'
import { useTiposProfesion } from '@/shared/hooks/useTiposProfesion'
import TarjetaDoctor from '../components/TarjetaDoctor'
import { useRutas } from '@/shared/hooks/useRutas'
import { coincideTexto } from '@/shared/utils/texto'

export default function Inicio() {
  const [especialidad, setEspecialidad] = useState('General')
  const [busqueda, setBusqueda] = useState('')
  const { usuario, perfil } = useAuth()
  const { esDoctor } = useRutas()
  const { profesionales, cargando } = useProfesionalesActivos()
  const tipos = useTiposProfesion()

  const destacados = profesionales
    .filter((p) => especialidad === 'General' || p.especialidad === especialidad)
    .filter((p) => coincideTexto(p.nombre, busqueda) || coincideTexto(p.especialidad, busqueda))
    .sort((a, b) => b.calificacionPromedio - a.calificacionPromedio)
    .slice(0, 6)
    .map((p, i) => ({ ...p, destacado: i + 1 }))

  const primerNombre = perfil?.nombre?.trim().split(/\s+/)[0] ?? usuario?.email?.split('@')[0] ?? ''
  const hora = new Date().getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div>
      <div className="admin-eyebrow">
        PORTAL DEL PACIENTE
        <span className="vivo"><span className="punto" /> Activo</span>
      </div>
      <h1 className="web-h1">{saludo}{primerNombre ? `, ${primerNombre}` : ''}</h1>
      <p className="web-sub">
        {esDoctor
          ? 'Encuentre a otro especialista para una interconsulta. Todas las consultas son 100% virtuales.'
          : '¿Con quién le gustaría hablar hoy? Todas las consultas son 100% virtuales.'}
      </p>


      <div className="patient-search-card">
        <div className="patient-search-heading"><Search size={22} aria-hidden="true" /><div><strong>Encuentra a quien te escuche</strong><p>Busca un profesional para tu próxima consulta.</p></div></div>
        <input
          type="text"
          aria-label="Buscar profesionales por nombre o especialidad"
          placeholder="Nombre o especialidad…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ margin: 0 }}
        />
      </div>

      <div className="chip-row" style={{ marginBottom: 20 }}>
        <button type="button" aria-pressed={especialidad === 'General'} className={`chip${especialidad === 'General' ? ' on' : ''}`} onClick={() => setEspecialidad('General')}>Todas las especialidades</button>
        {tipos.map((t) => (
          <button
            type="button"
            aria-pressed={especialidad === t.nombre}
            key={t.id}
            className={`chip${especialidad === t.nombre ? ' on' : ''}`}
            onClick={() => setEspecialidad(t.nombre)}
          >
            {t.nombre}
          </button>
        ))}
      </div>

      <div className="patient-results-heading"><h2 className="section-title">Profesionales destacados{especialidad !== 'General' ? ` en ${especialidad}` : ''}</h2><Link to={esDoctor ? '/doctor/buscar' : '/paciente/buscar'}>Ver todos <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
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
