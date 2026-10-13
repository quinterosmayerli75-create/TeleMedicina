import { useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { db, auth } from '@/services/firebase/config'
import CuentaRestringida from '@/features/auth/components/CuentaRestringida'
import LlamadaEntranteBanner from '@/features/chat/components/LlamadaEntranteBanner'
import NotificacionesBell from '@/features/notificaciones/components/NotificacionesBell'
import TutorialInicio from '@/features/onboarding/components/TutorialInicio'
import { useAuth } from '@/features/auth/context/AuthContext'
import { revisarVencimientoSuscripcion } from '@/features/consultas/services/suscripciones'

const ITEMS = [
  { to: '/doctor/panel', label: 'Panel principal', icono: '🩺' },
  { to: '/doctor/suscripcion', label: 'Suscripción', icono: '💳' },
  { to: '/doctor/agenda', label: 'Agenda', icono: '📅' },
  { to: '/doctor/inicio', label: 'Inicio', icono: '🏠' },
  { to: '/doctor/buscar', label: 'Buscar doctores', icono: '🔍' },
  { to: '/doctor/favoritos', label: 'Favoritos', icono: '♥' },
  { to: '/doctor/consultas', label: 'Mis consultas', icono: '🗂️' },
  { to: '/doctor/validacion-pagos', label: 'Validar pagos', icono: '✅' },
  { to: '/doctor/mensajes', label: 'Mensajes', icono: '💬' },
  { to: '/doctor/informes', label: 'Informes médicos', icono: '📋' },
  { to: '/doctor/configuracion', label: 'Configuración', icono: '⚙️' },
]

function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function DoctorLayout() {
  const { usuario, perfil, estado } = useAuth()
  const navigate = useNavigate()

  // Revisión "perezosa" (sin backend/cron): cada vez que el doctor entra a cualquier pantalla,
  // se fija si su membresía está por vencer (avisa) o ya venció sin renovar (suspende).
  useEffect(() => {
    if (!usuario || estado !== 'activo') return
    getDoc(doc(db, 'profesionales', usuario.uid))
      .then((snap) => { if (snap.exists()) revisarVencimientoSuscripcion(usuario.uid, snap.data()) })
      .catch(() => {})
  }, [usuario, estado])

  if (estado !== 'activo') {
    return <CuentaRestringida />
  }

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  return (
    <div className="admin-shell">
      <LlamadaEntranteBanner base="/doctor" />
      <aside className="admin-sidebar">
        <div className="admin-logo-row">
          <div className="admin-logo-mark">DT</div>
          <div>
            <div className="admin-logo-word">DOCTOP</div>
            <div className="admin-logo-sub">Portal doctor</div>
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
            <div className="admin-footer-nombre">{perfil?.nombre ?? 'Doctor'}</div>
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
