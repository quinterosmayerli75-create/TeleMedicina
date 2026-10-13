import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '@/services/firebase/config'
import CuentaRestringida from '@/features/auth/components/CuentaRestringida'
import LlamadaEntranteBanner from '@/features/chat/components/LlamadaEntranteBanner'
import NotificacionesBell from '@/features/notificaciones/components/NotificacionesBell'
import TutorialInicio from '@/features/onboarding/components/TutorialInicio'
import { useAuth } from '@/features/auth/context/AuthContext'
import { esBloqueo } from '@/features/bloqueos/utils/bloqueos'

const ITEMS = [
  { to: '/paciente/inicio', label: 'Inicio', icono: '🏠' },
  { to: '/paciente/buscar', label: 'Buscar doctores', icono: '🔍' },
  { to: '/paciente/favoritos', label: 'Mis doctores', icono: '♥' },
  { to: '/paciente/consultas', label: 'Mis consultas', icono: '📅' },
  { to: '/paciente/mensajes', label: 'Mensajes', icono: '💬' },
  { to: '/paciente/perfil', label: 'Mi perfil', icono: '👤' },
  { to: '/paciente/configuracion', label: 'Configuración', icono: '⚙️' },
]

function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function PacienteLayout() {
  const { estado, perfil, usuario } = useAuth()
  const navigate = useNavigate()

  if (esBloqueo(estado)) return <CuentaRestringida />

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  return (
    <div className="admin-shell">
      <LlamadaEntranteBanner base="/paciente" />
      <aside className="admin-sidebar">
        <div className="admin-logo-row">
          <div className="admin-logo-mark">DT</div>
          <div>
            <div className="admin-logo-word">DOCTOP</div>
            <div className="admin-logo-sub">Portal paciente</div>
          </div>
        </div>

        {ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `admin-nav-item${isActive ? ' on' : ''}`}>
            <span className="admin-nav-icon">{item.icono}</span>
            <span className="admin-nav-label">{item.label}</span>
          </NavLink>
        ))}

        <div className="admin-sidebar-footer">
          <div className="admin-avatar">{iniciales(perfil?.nombre)}</div>
          <div className="admin-footer-info">
            <div className="admin-footer-nombre">{perfil?.nombre ?? 'Paciente'}</div>
            <div className="admin-footer-email">{usuario?.email}</div>
          </div>
          <button type="button" className="admin-logout-btn" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión">⎋</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <NotificacionesBell />
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
      <TutorialInicio />
    </div>
  )
}
