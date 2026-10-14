import { useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/context/AuthContext'

const PASOS_POR_ROL = {
  paciente: [
    { icono: '👋', titulo: 'Bienvenido a DocTop', texto: 'Encuentra especialistas verificados y atiéndete de forma 100% virtual, sin salir de casa.' },
    { icono: '🔎', titulo: 'Busca y agenda', texto: 'Busca un doctor, elige la modalidad (chat, llamada o video) y la fecha y hora de tu consulta.' },
    { icono: '💳', titulo: 'Paga y confirma', texto: 'Paga por QR y sube la foto de tu comprobante. El doctor lo revisa y habilita tu consulta.' },
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
// doctor; el admin no lo necesita). Muestra todos los pasos juntos en una lista. Se puede omitir;
// una vez cerrado (por "Omitir" o "Comenzar") no vuelve a aparecer en ese navegador.
export default function TutorialInicio() {
  const { usuario, rol } = useAuth()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!usuario || !rol || rol === 'administrador') return
    const yaVisto = localStorage.getItem(claveVisto(usuario.uid))
    if (!yaVisto) setVisible(true)
  }, [usuario, rol])

  function cerrar() {
    if (usuario) localStorage.setItem(claveVisto(usuario.uid), '1')
    setVisible(false)
  }

  if (!visible || rol === 'administrador') return null

  const pasos = PASOS_POR_ROL[rol] ?? PASOS_POR_ROL.paciente

  return (
    <div className="modal-fondo" onClick={cerrar}>
      <div className="modal-tarjeta" style={{ maxWidth: 440, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <div style={{
          width: 60, height: 60, borderRadius: 16, margin: '0 auto 10px', fontSize: 28,
          background: 'var(--admin-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {pasos[0].icono}
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--admin-accent-dark)' }}>
          Guía de inicio rápido
        </div>
        <div className="modal-titulo" style={{ marginTop: 2 }}>¡Bienvenido a DocTop!</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left', marginTop: 14 }}>
          {pasos.map((p, i) => (
            <div key={p.titulo} style={{ display: 'flex', gap: 12, background: 'var(--marfil)', borderRadius: 12, padding: '12px 14px', alignItems: 'flex-start' }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flex: '0 0 auto', fontSize: 12, fontWeight: 700,
                background: 'var(--admin-accent-soft)', color: 'var(--admin-accent-dark)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.icono} {p.titulo}</div>
                <div style={{ fontSize: 12, color: 'var(--gris)', marginTop: 2, lineHeight: 1.5 }}>{p.texto}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 18 }}>
          <button type="button" className="btn btn-outline" onClick={cerrar}>Omitir</button>
          <button type="button" className="btn btn-primary" style={{ background: 'var(--admin-accent)' }} onClick={cerrar}>Comenzar</button>
        </div>
      </div>
    </div>
  )
}
