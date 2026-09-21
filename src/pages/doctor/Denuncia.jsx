import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'
import SelectorFotos from '../../components/SelectorFotos'
import { mensajeErrorSubida, subirEvidencias } from '../../utils/archivos'
import { nombreCompleto, usePaciente } from '../../hooks/usePaciente'

const MOTIVOS = ['Acoso o falta de respeto', 'Suplantación de identidad', 'Datos falsos en el perfil', 'Otro']

export default function Denuncia() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const { paciente, cargando: cargandoPaciente } = usePaciente(id)

  const [motivo, setMotivo] = useState(MOTIVOS[0])
  const [descripcion, setDescripcion] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [evidencias, setEvidencias] = useState([])
  const [error, setError] = useState('')

  async function enviarDenuncia(e) {
    e.preventDefault()
    setError('')
    setEnviando(true)
    try {
      const urlsEvidencia = evidencias.length > 0 ? await subirEvidencias(usuario.uid, evidencias) : []
      await addDoc(collection(db, 'reportes'), {
        denuncianteId: usuario.uid,
        denunciadoId: id,
        motivo,
        descripcion,
        evidencias: urlsEvidencia,
        estado: 'pendiente',
        fecha: serverTimestamp(),
      })
      setEnviado(true)
    } catch (err) {
      setError(err?.code?.startsWith('storage/') ? mensajeErrorSubida(err) : 'No se pudo enviar la denuncia. Intenta de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  // Los pacientes del chat de ejemplo no son cuentas reales: una denuncia contra ellos no se podría resolver.
  if (!cargandoPaciente && (!paciente || paciente.esEjemplo)) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 440, background: '#fff', borderRadius: 8, padding: 28, textAlign: 'center' }} data-testid="denuncia-no-real">
          <div className="modal-titulo">No se puede denunciar a este contacto</div>
          <p className="web-sub">Es un contacto de ejemplo del chat, no una cuenta real, así que no hay una cuenta que revisar. Para denunciar a un doctor, entra a su perfil desde Buscar doctores.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/doctor/mensajes')}>Volver a mensajes</button>
        </div>
      </div>
    )
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
        <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>Denunciar a {nombreCompleto(paciente) || 'esta persona'}</div>
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

        <label className="campo-label">Evidencia (opcional)</label>
        <SelectorFotos
          archivos={evidencias}
          onChange={setEvidencias}
          maximo={5}
          textoBoton="Subir foto"
          ayuda="Elija capturas o fotos desde su galería como prueba (hasta 5, máximo 5 MB cada una)."
          deshabilitado={enviando}
        />

        {error && <div className="registro-error">{error}</div>}

        <button type="submit" className="btn btn-danger" style={{ marginTop: 16 }} disabled={enviando}>
          {enviando ? 'Enviando…' : 'Enviar denuncia'}
        </button>
      </form>
    </div>
  )
}
