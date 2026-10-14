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
// doctor; el admin no lo necesita). Avanza paso a paso con "Siguiente"; se puede omitir en
// cualquier momento. Una vez cerrado (por "Omitir" o "Comenzar" en el último paso) no vuelve a
// aparecer en ese navegador.
export default function TutorialInicio() {
  const { usuario, rol } = useAuth()
  const [visible, setVisible] = useState(false)
  const [paso, setPaso] = useState(0)

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
        <div style={{
          width: 60, height: 60, borderRadius: 16, margin: '0 auto 10px', fontSize: 28,
          background: 'var(--admin-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {actual.icono}
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--admin-accent-dark)' }}>
          Guía de inicio rápido · Paso {paso + 1} de {pasos.length}
        </div>
        <div className="modal-titulo" style={{ marginTop: 2 }}>{actual.titulo}</div>
        <div className="modal-sub" style={{ marginTop: 6 }}>{actual.texto}</div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16 }}>
          {pasos.map((p, i) => (
            <span
              key={p.titulo}
              style={{
                width: i === paso ? 18 : 7, height: 7, borderRadius: 4,
                background: i === paso ? 'var(--admin-accent)' : 'var(--admin-accent-soft)',
                transition: 'width .2s',
              }}
            />
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 18 }}>
          <button type="button" className="btn btn-outline" onClick={cerrar}>Omitir</button>
          {esUltimo ? (
            <button type="button" className="btn btn-primary" style={{ background: 'var(--admin-accent)' }} onClick={cerrar}>Comenzar</button>
          ) : (
            <button type="button" className="btn btn-primary" style={{ background: 'var(--admin-accent)' }} onClick={() => setPaso((p) => p + 1)}>Siguiente</button>
          )}
        </div>
      </div>
    </div>
  )
}
