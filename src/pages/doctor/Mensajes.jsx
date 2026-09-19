import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { conversacionesDoctorMock } from '../../data/mensajesDoctorMock'
import { obtenerPaciente, pacientesMock } from '../../data/pacientesMock'

export default function Mensajes() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')

  const idActivo = id && conversacionesDoctorMock[id] ? id : pacientesMock[0].id
  const conversacion = conversacionesDoctorMock[idActivo]
  const paciente = obtenerPaciente(idActivo)

  return (
    <div className="web-two-pane" style={{ margin: '-30px -36px' }}>
      <div className="web-pane-list">
        {pacientesMock.map((p) => {
          const conv = conversacionesDoctorMock[p.id]
          const ultimo = conv.mensajes[conv.mensajes.length - 1]
          return (
            <div
              key={p.id}
              className="chat-row"
              style={p.id === idActivo ? { background: 'var(--marfil)' } : undefined}
              onClick={() => navigate(`/doctor/mensajes/${p.id}`)}
            >
              <div className="avatar-wrap">
                <img src={p.foto} alt={p.nombre} />
                <div className={`status-dot ${p.enLinea ? 'on' : 'off'}`}></div>
              </div>
              <div className="chat-row-body">
                <div className="chat-row-top"><div className="chat-row-name">{p.nombre}</div></div>
                <div className="chat-row-msg">{ultimo.texto}</div>
              </div>
            </div>
          )
        })}
      </div>

      {paciente && (
        <div className="web-pane-chat">
          <div className="chat-header">
            <img src={paciente.foto} alt={paciente.nombre} onClick={() => navigate(`/doctor/paciente/${paciente.id}`)} />
            <div style={{ cursor: 'pointer', flex: 1 }} onClick={() => navigate(`/doctor/paciente/${paciente.id}`)}>
              <div className="name">{paciente.nombre}</div>
              <div className="status">{paciente.enLinea ? 'En línea' : 'Desconectado'} · toque para ver su perfil</div>
            </div>
            <div className="icn">📞</div>
            <div className="icn">🎥</div>
            <div className="icn" style={{ color: 'var(--alerta)' }} onClick={() => navigate(`/doctor/denuncia/${paciente.id}`)}>⚑</div>
          </div>
          <div className="chat-body" style={{ flex: 1, overflowY: 'auto' }}>
            <div className="chat-system">Conversación verificada por DocTop</div>
            {conversacion.mensajes.map((m, i) => (
              <div key={i} className={`bubble ${m.de === 'doctor' ? 'out' : 'in'}`}>
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
