import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/context/AuthContext'

const PASOS_POR_ROL = {
  paciente: [
    { icono: '👋', titulo: 'Bienvenido a DocTop', texto: 'Encuentra especialistas verificados y atiéndete de forma 100% virtual, sin salir de casa.' },
    { icono: '🔎', titulo: 'Busca y agenda', texto: 'Busca un doctor, elige la modalidad (chat, llamada o video) y la fecha y hora de tu consulta.' },
    { icono: '💳', titulo: 'Paga y confirma', texto: 'Paga por QR y sube la foto de tu comprobante. El administrador lo revisa y habilita tu consulta.' },
    { icono: '💬', titulo: 'Conéctate', texto: 'Cuando esté habilitada, chatea, llama o haz videollamada con tu doctor, y luego califica tu experiencia.' },
  ],
  profesional: [
    { icono: '👋', titulo: 'Bienvenido a DocTop', texto: 'Atiende pacientes de forma 100% virtual desde donde estés.' },
    { icono: '⚙️', titulo: 'Configura tu perfil', texto: 'En "Panel principal" define tu precio de consulta, tus modalidades y tus horarios de atención.' },
    { icono: '📋', titulo: 'Atiende consultas', texto: 'Revisa las solicitudes de tus pacientes en "Mis consultas" y mira tu día a día en "Agenda".' },
    { icono: '💬', titulo: 'Conéctate', texto: 'Chatea, llama o haz videollamada con tus pacientes una vez que su pago esté habilitado.' },
  ],
}

function claveVisto(uid) {
  return `doctop_tutorial_visto_${uid}`
}

// Mini-tutorial que se ve una sola vez, la primera vez que la persona entra (solo paciente y
// doctor; el admin no lo necesita). Se puede omitir en cualquier paso; una vez cerrado (por
// "Omitir" o al terminarlo) no vuelve a aparecer en ese navegador.
export default function TutorialInicio() {
  const { usuario, rol } = useAuth()
  const [paso, setPaso] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!usuario || !rol || rol === 'administrador') return
    const yaVisto = localStorage.getItem(claveVisto(usuario.uid))
    if (!yaVisto) {
      setPaso(0)
      setVisible(true)
    }
  }, [usuario, rol])

  function cerrar() {
    if (usuario) localStorage.setItem(claveVisto(usuario.uid), '1')
    setVisible(false)
  }

  if (!visible || rol === 'administrador') return null

  const pasos = PASOS_POR_ROL[rol] ?? PASOS_POR_ROL.paciente
  const actual = pasos[paso]
  const esUltimo = paso === pasos.length - 1

  return (
    <div className="modal-fondo" onClick={cerrar}>
      <div className="modal-tarjeta" style={{ maxWidth: 420, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 44, marginBottom: 6 }}>{actual.icono}</div>
        <div className="modal-titulo">{actual.titulo}</div>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: '#3a4750' }}>{actual.texto}</p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, margin: '16px 0' }}>
          {pasos.map((_, i) => (
            <span
              key={i}
              style={{
                width: 7, height: 7, borderRadius: '50%',
                background: i === paso ? 'var(--onyx)' : 'var(--marfil-osc)',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={cerrar}>Omitir</button>
          <button type="button" className="btn btn-primary" onClick={() => (esUltimo ? cerrar() : setPaso((p) => p + 1))}>
            {esUltimo ? 'Comenzar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
