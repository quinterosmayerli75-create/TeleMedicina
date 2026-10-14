import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import {
  Stethoscope, CreditCard, CalendarDays, Home, Search, Heart,
  FolderKanban, CircleCheckBig, MessageSquare, ClipboardList, Settings, LogOut,
} from 'lucide-react'
import { db, auth } from '@/services/firebase/config'
import CuentaRestringida from '@/features/auth/components/CuentaRestringida'
import LlamadaEntranteBanner from '@/features/chat/components/LlamadaEntranteBanner'
import NotificacionesBell from '@/features/notificaciones/components/NotificacionesBell'
import TutorialInicio from '@/features/onboarding/components/TutorialInicio'
import { useAuth } from '@/features/auth/context/AuthContext'
import { revisarVencimientoSuscripcion } from '@/features/consultas/services/suscripciones'

const ITEMS = [
  { to: '/doctor/panel', label: 'Panel principal', Icono: Stethoscope },
  { to: '/doctor/suscripcion', label: 'Suscripción', Icono: CreditCard },
  { to: '/doctor/agenda', label: 'Agenda', Icono: CalendarDays },
  { to: '/doctor/inicio', label: 'Inicio', Icono: Home },
  { to: '/doctor/buscar', label: 'Buscar doctores', Icono: Search },
  { to: '/doctor/favoritos', label: 'Favoritos', Icono: Heart },
  { to: '/doctor/consultas', label: 'Mis consultas', Icono: FolderKanban },
  { to: '/doctor/validacion-pagos', label: 'Validar pagos', Icono: CircleCheckBig },
  { to: '/doctor/mensajes', label: 'Mensajes', Icono: MessageSquare },
  { to: '/doctor/informes', label: 'Informes médicos', Icono: ClipboardList },
  { to: '/doctor/configuracion', label: 'Configuración', Icono: Settings },
]

function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function DoctorLayout() {
  const { usuario, perfil, estado } = useAuth()
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')

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

  function buscar(e) {
    e.preventDefault()
    if (busqueda.trim()) navigate(`/doctor/consultas?q=${encodeURIComponent(busqueda.trim())}`)
  }

  return (
    <div className="admin-shell">
      <LlamadaEntranteBanner base="/doctor" />
      <aside className="admin-sidebar">
        <div className="admin-logo-row">
          <div className="admin-logo-mark"><Stethoscope size={18} strokeWidth={2.4} /></div>
          <div>
            <div className="admin-logo-word">DOCTOP</div>
            <div className="admin-logo-sub">Portal doctor</div>
          </div>
        </div>

        {ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `admin-nav-item${isActive ? ' on' : ''}`}>
            <span className="admin-nav-icon"><item.Icono size={17} strokeWidth={2} /></span>
            <span className="admin-nav-label">{item.label}</span>
          </NavLink>
        ))}

        <div className="admin-sidebar-footer">
          <div className="admin-avatar">{iniciales(perfil?.nombre)}</div>
          <div className="admin-footer-info">
            <div className="admin-footer-nombre">{perfil?.nombre ?? 'Doctor'}</div>
            <div className="admin-footer-email">{usuario?.email}</div>
          </div>
          <button type="button" className="admin-logout-btn" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={16} /></button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <form className="admin-topbar-search" onSubmit={buscar}>
            <Search size={15} />
            <input type="text" placeholder="Buscar paciente en mis consultas…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </form>
          <div className="admin-topbar-spacer" />
          <div className="admin-topbar-pill"><span className="punto" /> Sincronización en vivo</div>
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
