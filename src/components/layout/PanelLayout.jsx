import { NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import Logo from '../Logo'

export default function PanelLayout({ items, children }) {
  const navigate = useNavigate()

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  return (
    <div className="web-shell">
      <aside className="web-sidebar">
        <div className="web-logo">
          <Logo />
          <div className="word">DOCTOP</div>
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
    </div>
  )
}
