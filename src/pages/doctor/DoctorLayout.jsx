import { Outlet, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import PanelLayout from '../../components/layout/PanelLayout'
import { useAuth } from '../../context/AuthContext'
import { auth } from '../../firebase/config'

const ITEMS = [
  { to: '/doctor/panel', label: 'Panel principal' },
  { to: '/doctor/mensajes', label: 'Mensajes' },
  { to: '/doctor/configuracion', label: 'Configuración' },
]

function CuentaPendiente() {
  const navigate = useNavigate()

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  return (
    <div className="web-auth">
      <div className="web-auth-card" style={{ textAlign: 'center' }}>
        <div className="modal-titulo">Cuenta en revisión</div>
        <p className="web-sub">
          Tu solicitud está siendo verificada por el equipo de DocTop. Te avisaremos por correo o WhatsApp
          en cuanto tu cuenta esté activa.
        </p>
        <button type="button" className="btn btn-outline" onClick={cerrarSesion}>Cerrar sesión</button>
      </div>
    </div>
  )
}

export default function DoctorLayout() {
  const { estado } = useAuth()

  if (estado !== 'activo') {
    return <CuentaPendiente />
  }

  return (
    <PanelLayout items={ITEMS}>
      <Outlet />
    </PanelLayout>
  )
}
