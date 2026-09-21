import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { nombreCompleto, usePaciente } from '../../hooks/usePaciente'

export default function PerfilPaciente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { key } = useLocation()
  const { paciente, cargando } = usePaciente(id)

  const volver = () => (key !== 'default' ? navigate(-1) : navigate('/doctor/mensajes'))

  if (cargando) return <p className="web-sub">Cargando…</p>
  if (!paciente || paciente.rol !== 'paciente') {
    return (
      <div>
        <span className="back-link" onClick={volver}>← Volver</span>
        <p>No se encontró ese paciente.</p>
      </div>
    )
  }

  const nombre = nombreCompleto(paciente)

  return (
    <div>
      <span className="back-link" onClick={volver}>← Volver</span>

      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20 }}>
        {paciente.fotoUrl ? (
          <img src={paciente.fotoUrl} alt={nombre} style={{ width: 80, height: 80, borderRadius: 6, border: '2px solid var(--oro)', objectFit: 'cover' }} />
        ) : (
          <div className="avatar-vacio" style={{ width: 80, height: 80 }} aria-hidden="true">{nombre[0]}</div>
        )}
        <div>
          <div className="web-h1" style={{ marginBottom: 0 }}>{nombre}</div>
          <div className="web-sub" style={{ marginBottom: 0 }}>Paciente{paciente.edad ? ` · ${paciente.edad} años` : ''}</div>
        </div>
      </div>

      <div className="web-2col">
        <div className="card-plain">
          <h2 className="section-title">Datos para el informe médico</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 12.5 }}>
            {paciente.carnet && (
              <div><div style={{ color: 'var(--gris)' }}>N° de carnet</div><div style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{paciente.carnet}</div></div>
            )}
            <div><div style={{ color: 'var(--gris)' }}>Edad</div><div style={{ fontWeight: 600 }}>{paciente.edad ? `${paciente.edad} años` : '—'}</div></div>
            <div><div style={{ color: 'var(--gris)' }}>Sexo</div><div style={{ fontWeight: 600 }}>{paciente.sexo || '—'}</div></div>
            <div><div style={{ color: 'var(--gris)' }}>Estatura aprox.</div><div style={{ fontWeight: 600 }}>{paciente.estatura || '—'}</div></div>
            <div><div style={{ color: 'var(--gris)' }}>Peso aprox.</div><div style={{ fontWeight: 600 }}>{paciente.peso || '—'}</div></div>
            <div><div style={{ color: 'var(--gris)' }}>Celular</div><div style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{paciente.telefono || '—'}</div></div>
            <div style={{ gridColumn: '1/3' }}><div style={{ color: 'var(--gris)' }}>Lugar donde vive</div><div style={{ fontWeight: 600 }}>{paciente.lugar || '—'}</div></div>
          </div>
        </div>
        <div>
          <button type="button" className="btn btn-primary" onClick={() => navigate(`/doctor/informes/nuevo?paciente=${paciente.id}`)}>Generar informe médico</button>
          <button type="button" className="btn btn-danger" style={{ marginTop: 8 }} onClick={() => navigate(`/doctor/denuncia/${paciente.id}`)}>
            Denunciar a este paciente
          </button>
        </div>
      </div>
    </div>
  )
}
