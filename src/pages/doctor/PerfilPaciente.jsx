import { useNavigate, useParams } from 'react-router-dom'
import { obtenerPaciente } from '../../data/pacientesMock'

export default function PerfilPaciente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const paciente = obtenerPaciente(id)

  if (!paciente) return <p>No se encontró ese paciente.</p>

  return (
    <div>
      <span className="back-link" onClick={() => navigate('/doctor/mensajes')}>← Volver a mensajes</span>

      <div style={{ display: 'flex', gap: 18, alignItems: 'center', marginBottom: 20 }}>
        <img src={paciente.foto} alt={paciente.nombre} style={{ width: 80, height: 80, borderRadius: 6, border: '2px solid var(--oro)', objectFit: 'cover' }} />
        <div>
          <div className="web-h1" style={{ marginBottom: 0 }}>{paciente.nombre}</div>
          <div className="web-sub" style={{ marginBottom: 0 }}>Paciente · {paciente.edad} años · {paciente.consultasConmigo} consultas conmigo</div>
        </div>
      </div>

      <div className="web-2col">
        <div className="card-plain">
          <h2 className="section-title">Datos para el informe médico</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 12.5 }}>
            <div><div style={{ color: 'var(--gris)' }}>N° de carnet</div><div style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{paciente.carnet}</div></div>
            <div><div style={{ color: 'var(--gris)' }}>Edad</div><div style={{ fontWeight: 600 }}>{paciente.edad} años</div></div>
            <div><div style={{ color: 'var(--gris)' }}>Sexo</div><div style={{ fontWeight: 600 }}>{paciente.sexo}</div></div>
            <div><div style={{ color: 'var(--gris)' }}>Estatura aprox.</div><div style={{ fontWeight: 600 }}>{paciente.estatura}</div></div>
            <div><div style={{ color: 'var(--gris)' }}>Peso aprox.</div><div style={{ fontWeight: 600 }}>{paciente.peso}</div></div>
            <div><div style={{ color: 'var(--gris)' }}>Celular</div><div style={{ fontWeight: 600, fontFamily: 'var(--mono)' }}>{paciente.telefono}</div></div>
            <div style={{ gridColumn: '1/3' }}><div style={{ color: 'var(--gris)' }}>Lugar donde vive</div><div style={{ fontWeight: 600 }}>{paciente.lugar}</div></div>
          </div>
        </div>
        <div>
          <button type="button" className="btn btn-primary">Generar informe médico</button>
          <button type="button" className="btn btn-danger" style={{ marginTop: 8 }} onClick={() => navigate(`/doctor/denuncia/${paciente.id}`)}>
            Denunciar a este paciente
          </button>
        </div>
      </div>
    </div>
  )
}
