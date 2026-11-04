import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { Home, Search, Heart, CalendarDays, MessageSquare, User, Settings, LogOut } from '@/shared/components/Icons'
import { auth } from '@/services/firebase/config'
import CuentaRestringida from '@/features/auth/components/CuentaRestringida'
import LlamadaEntranteBanner from '@/features/chat/components/LlamadaEntranteBanner'
import NotificacionesBell from '@/features/notificaciones/components/NotificacionesBell'
import TutorialInicio from '@/features/onboarding/components/TutorialInicio'
import { useAuth } from '@/features/auth/context/AuthContext'
import { revisarRecordatorioConsulta } from '@/features/consultas/services/consultas'
import { encontrarSeccion } from '@/shared/utils/texto'

const ITEMS = [
  { to: '/paciente/inicio', label: 'Inicio', Icono: Home },
  { to: '/paciente/buscar', label: 'Buscar doctores', Icono: Search },
  { to: '/paciente/favoritos', label: 'Mis doctores', Icono: Heart },
  { to: '/paciente/consultas', label: 'Mis consultas', Icono: CalendarDays },
  { to: '/paciente/mensajes', label: 'Mensajes', Icono: MessageSquare },
  { to: '/paciente/perfil', label: 'Mi perfil', Icono: User },
  { to: '/paciente/configuracion', label: 'Configuración', Icono: Settings },
]

function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function PacienteLayout() {
  const { estado, perfil, usuario } = useAuth()
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')

  // Perezoso (sin backend/cron): avisa una sola vez por consulta si tiene una habilitada para
  // hoy o mañana. Va antes del return de abajo porque los Hooks no pueden ser condicionales.
  useEffect(() => {
    if (!usuario || estado !== 'activo') return
    revisarRecordatorioConsulta(usuario.uid).catch(() => {})
  }, [usuario, estado])

  // Antes solo miraba esBloqueo(estado) (bloqueado/bloqueado_temporal) — un paciente nunca tenía
  // otro estado "no activo" posible. Ahora también existe "congelada" (ver sección de cuentas que
  // nunca se borran), así que se compara contra 'activo' directamente para no dejarla pasar.
  if (estado !== 'activo') return <CuentaRestringida />

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  function buscar(e) {
    e.preventDefault()
    if (!busqueda.trim()) return
    // Si lo escrito es el nombre de una sección del menú (ej. "mi perfil"), va directo ahí;
    // si no, busca doctores por nombre/especialidad como antes.
    const ruta = encontrarSeccion(ITEMS, busqueda)
    navigate(ruta ?? `/paciente/buscar?q=${encodeURIComponent(busqueda.trim())}`)
  }

  return (
    <div className="admin-shell" data-portal="paciente">
      <LlamadaEntranteBanner base="/paciente" />
      <aside className="admin-sidebar">
        <div className="admin-logo-row">
          <div className="admin-logo-mark" aria-hidden="true">dt<span>+</span></div>
          <div>
            <div className="admin-logo-word">DOCTOP</div>
            <div className="admin-logo-sub">Portal paciente</div>
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
            <div className="admin-footer-nombre">{perfil?.nombre ?? 'Paciente'}</div>
            <div className="admin-footer-email">{usuario?.email}</div>
          </div>
          <button type="button" className="admin-logout-btn" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={16} /></button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <form className="admin-topbar-search" onSubmit={buscar}>
            <Search size={15} />
            <input type="text" placeholder="Buscar doctor por nombre o especialidad…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
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
