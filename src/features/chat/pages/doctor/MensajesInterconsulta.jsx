import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import { useProfesional } from '@/features/profesionales/hooks/useProfesionalesActivos'
import { conversacionesEntreDoctoresMock } from '../../data/mensajesEntreDoctoresMock'

const TABS = [
  { clave: 'pacientes', etiqueta: 'Chats con pacientes', ruta: '/doctor/mensajes' },
  { clave: 'doctores', etiqueta: 'Chats con doctores', ruta: '/doctor/mensajes/doctores' },
]

// Chat de ejemplo entre doctores (interconsultas): todavía no se guarda en Firestore (ver README).
export default function MensajesInterconsulta() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [texto, setTexto] = useState('')
  const [aviso, setAviso] = useState('')

  // Al abrir el perfil de un doctor real y pulsar "Mensaje" no hay conversación de ejemplo: se muestra
  // una vacía con ese doctor para que la pestaña no salte a otro chat.
  const idNuevo = id && !conversacionesEntreDoctoresMock[id] ? id : null
  const { profesional: nuevo } = useProfesional(idNuevo)

  const contactos = Object.values(conversacionesEntreDoctoresMock).map((c) => ({
    id: c.doctor.id,
    nombre: c.doctor.nombre,
    foto: c.doctor.foto,
    enLinea: c.doctor.enLinea,
    subtitulo: c.doctor.especialidad,
    estado: `${c.ultimaConexion} · toque para ver su perfil`,
    mensajes: c.mensajes.map((m) => ({ ...m, propio: m.de === 'yo' })),
  }))
  if (idNuevo && nuevo?.id === idNuevo) {
    contactos.unshift({
      id: nuevo.id,
      nombre: nuevo.nombre,
      foto: nuevo.fotoUrl,
      enLinea: nuevo.disponibleAhora,
      subtitulo: nuevo.especialidad,
      estado: `${nuevo.disponibleAhora ? 'En línea' : 'Desconectado'} · toque para ver su perfil`,
      mensajes: [],
      real: true,
    })
  }

  const activo = contactos.find((c) => c.id === id) ?? contactos[0]

  useEffect(() => {
    setAviso('')
    setTexto('')
  }, [id])

  // Los doctores de ejemplo no existen en Firestore: se busca uno registrado con el mismo nombre.
  async function abrirPerfil() {
    setAviso('')
    if (activo.real) {
      navigate(`/doctor/especialista/${activo.id}`)
      return
    }
    try {
      const snap = await getDocs(query(collection(db, 'usuarios'), where('rol', '==', 'profesional'), where('nombre', '==', activo.nombre)))
      if (snap.empty) setAviso('Este contacto es de ejemplo y todavía no tiene un perfil público.')
      else navigate(`/doctor/especialista/${snap.docs[0].id}`)
    } catch {
      setAviso('No se pudo abrir el perfil. Intente de nuevo.')
    }
  }

  return (
    <div className="web-two-pane" style={{ margin: '-30px -36px' }}>
      <div className="web-pane-list">
        <div className="subtabs chat-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              type="button"
              role="tab"
              key={t.clave}
              aria-selected={t.clave === 'doctores'}
              className={`subtab${t.clave === 'doctores' ? ' on' : ''}`}
              onClick={() => navigate(t.ruta)}
            >
              {t.etiqueta}
            </button>
          ))}
        </div>

        {contactos.map((c) => {
          const ultimo = c.mensajes[c.mensajes.length - 1]
          return (
            <div
              key={c.id}
              className="chat-row"
              style={c.id === activo?.id ? { background: 'var(--marfil)' } : undefined}
              onClick={() => navigate(`/doctor/mensajes/doctores/${c.id}`)}
            >
              <div className="avatar-wrap">
                {c.foto ? <img src={c.foto} alt={c.nombre} /> : <div className="avatar-vacio">{c.nombre?.[0]}</div>}
                <div className={`status-dot ${c.enLinea ? 'on' : 'off'}`}></div>
              </div>
              <div className="chat-row-body">
                <div className="chat-row-top"><div className="chat-row-name">{c.nombre}</div></div>
                <div className="chat-row-msg">{ultimo?.texto ?? (c.subtitulo ? `${c.subtitulo} · nueva conversación` : 'Nueva conversación')}</div>
              </div>
            </div>
          )
        })}
      </div>

      {activo && (
        <div className="web-pane-chat">
          <div className="chat-header">
            {activo.foto ? (
              <img src={activo.foto} alt={activo.nombre} style={{ cursor: 'pointer' }} onClick={abrirPerfil} />
            ) : (
              <div className="avatar-vacio chico" onClick={abrirPerfil}>{activo.nombre?.[0]}</div>
            )}
            <div style={{ cursor: 'pointer', flex: 1 }} onClick={abrirPerfil}>
              <div className="name">{activo.nombre}</div>
              <div className="status">{activo.estado}</div>
            </div>
          </div>
          <div className="chat-body" style={{ flex: 1, overflowY: 'auto' }}>
            <div className="chat-system">Conversación de ejemplo (interconsultas entre doctores aún no conectado a Firestore)</div>
            {aviso && <div className="chat-system" style={{ color: 'var(--alerta)' }}>{aviso}</div>}
            {activo.mensajes.length === 0 && <div className="chat-system">Aún no hay mensajes con {activo.nombre}.</div>}
            {activo.mensajes.map((m, i) => (
              <div key={i} className={`bubble ${m.propio ? 'out' : 'in'}`}>
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
