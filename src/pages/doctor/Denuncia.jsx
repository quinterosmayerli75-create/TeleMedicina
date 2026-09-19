import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import { obtenerPaciente } from '../../data/pacientesMock'

const MOTIVOS = ['Acoso o falta de respeto', 'Suplantación de identidad', 'Datos falsos en el perfil', 'Otro']

export default function Denuncia() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const paciente = obtenerPaciente(id)

  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviarDenuncia(e) {
    e.preventDefault()
    setEnviando(true)
    await addDoc(collection(db, 'reportes'), {
      denuncianteId: usuario.uid,
      denunciadoId: id,
      motivo,
      descripcion,
      estado: 'pendiente',
      fecha: serverTimestamp(),
    })
    setEnviando(false)
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 420, background: '#fff', borderRadius: 8, padding: 28, textAlign: 'center' }}>
          <div className="web-h1">Denuncia enviada</div>
          <p className="web-sub">El equipo de DocTop la revisará a la brevedad.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/doctor/mensajes')}>Volver a mensajes</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <form onSubmit={enviarDenuncia} style={{ width: 440, background: '#fff', borderRadius: 8, padding: 28 }}>
        <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>Denunciar a {paciente?.nombre ?? 'este paciente'}</div>
        <div className="modal-sub">Su reporte es confidencial y será revisado por el equipo de DocTop.</div>

        <label className="campo-label">Motivo</label>
        {MOTIVOS.map((m) => (
          <div className="admin-row" key={m}>
            <label style={{ fontSize: 13 }}>
              <input type="radio" name="motivo" checked={motivo === m} onChange={() => setMotivo(m)} /> {m}
            </label>
          </div>
        ))}

        <label className="campo-label" htmlFor="descripcion">Describa lo sucedido</label>
        <textarea id="descripcion" rows="3" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} required />

        <label className="campo-label">Evidencia (opcional por ahora)</label>
        <div className="upload-box">Suba una captura como prueba</div>

        <button type="submit" className="btn btn-danger" style={{ marginTop: 16 }} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar denuncia'}
        </button>
      </form>
    </div>
  )
}
