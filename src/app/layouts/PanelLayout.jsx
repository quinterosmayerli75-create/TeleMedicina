import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/services/firebase/config'
import Logo from '@/shared/components/Logo'
import NotificacionesBell from '@/features/notificaciones/components/NotificacionesBell'
import TutorialInicio from '@/features/onboarding/components/TutorialInicio'

export default function PanelLayout({ items, children, banner }) {
  const navigate = useNavigate()

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  return (
    <div className="web-shell">
      {banner}
      <aside className="web-sidebar">
        <div className="web-logo">
          <Logo />
          <div className="word">DOCTOP</div>
          <div style={{ marginLeft: 'auto' }}><NotificacionesBell /></div>
        </div>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `web-nav-item${isActive ? ' on' : ''}`}
          >
            {item.label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }}></div>
        <div className="web-nav-item" style={{ color: '#f4a09a' }} onClick={cerrarSesion}>
          Cerrar sesión
        </div>
      </aside>
      <main className="web-content">{children}</main>
      <TutorialInicio />
    </div>
  )
}
