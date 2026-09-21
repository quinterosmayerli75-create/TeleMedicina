import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { conversacionesMock } from '../../data/mensajesMock'

export default function Mensajes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState('')

  const idsConversacion = Object.keys(conversacionesMock)
  const idActivo = id && conversacionesMock[id] ? id : idsConversacion[0]
  const conversacion = conversacionesMock[idActivo]
  const doctor = conversacion?.doctor

  // Las conversaciones de ejemplo usan doctores inventados: al tocar su nombre o su foto se busca un
  // doctor registrado con ese mismo nombre para abrir su perfil completo.
  async function abrirPerfil() {
    setAviso('')
    try {
      const snap = await getDocs(query(collection(db, 'usuarios'), where('rol', '==', 'profesional'), where('nombre', '==', doctor.nombre)))
      if (snap.empty) setAviso('Este contacto es de ejemplo y todavía no tiene un perfil público.')
      else navigate(`/paciente/doctor/${snap.docs[0].id}`)
    } catch {
      setAviso('No se pudo abrir el perfil. Intente de nuevo.')
    }
  }

  return (
    <div className="web-two-pane" style={{ margin: '-30px -36px' }}>
      <div className="web-pane-list">
        {idsConversacion.map((docId) => {
          const conv = conversacionesMock[docId]
          const ultimo = conv.mensajes[conv.mensajes.length - 1]
          return (
            <div
              key={docId}
              className="chat-row"
              style={docId === idActivo ? { background: 'var(--marfil)' } : undefined}
              onClick={() => navigate(`/paciente/mensajes/${docId}`)}
            >
              <div className="avatar-wrap">
                <img src={conv.doctor.foto} alt={conv.doctor.nombre} />
                <div className={`status-dot ${conv.doctor.enLinea ? 'on' : 'off'}`}></div>
              </div>
              <div className="chat-row-body">
                <div className="chat-row-top">
                  <div className="chat-row-name">{conv.doctor.nombre}</div>
                </div>
                <div className="chat-row-msg">{ultimo.texto}</div>
              </div>
            </div>
          )
        })}
      </div>

      {doctor && (
        <div className="web-pane-chat">
          <div className="chat-header">
            <img src={doctor.foto} alt={doctor.nombre} style={{ cursor: 'pointer' }} onClick={abrirPerfil} />
            <div style={{ cursor: 'pointer', flex: 1 }} onClick={abrirPerfil}>
              <div className="name">{doctor.nombre}</div>
              <div className="status">{conversacion.ultimaConexion} · toque para ver su perfil</div>
            </div>
            <div className="icn">📞</div>
            <div className="icn">🎥</div>
            <div className="icn" style={{ color: 'var(--alerta)' }} onClick={() => navigate(`/paciente/denuncia/${doctor.id}`)}>⚑</div>
          </div>
          <div className="chat-body" style={{ flex: 1, overflowY: 'auto' }}>
            <div className="chat-system">Conversación verificada por DocTop</div>
            {aviso && <div className="chat-system" style={{ color: 'var(--alerta)' }}>{aviso}</div>}
            {conversacion.mensajes.map((m, i) => (
              <div key={i} className={`bubble ${m.de === 'paciente' ? 'out' : 'in'}`}>
                {m.adjunto && <img className="attach" src={m.adjunto} alt="" />}
                {m.texto}
                <span className="time">{m.hora}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--marfil-osc)', padding: '12px 16px', display: 'flex', gap: 8, alignItems: 'center' }}>
            <div className="attach-btn">📎</div>
            <div className="attach-btn">📷</div>
            <div className="attach-btn">🎤</div>
            <input type="text" placeholder="Escriba un mensaje…" style={{ flex: 1 }} value={texto} onChange={(e) => setTexto(e.target.value)} />
          </div>
        </div>
      )}
    </div>
  )
}
