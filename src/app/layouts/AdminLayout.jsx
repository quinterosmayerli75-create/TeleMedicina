import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '@/services/firebase/config'
import CuentaRestringida from '@/features/auth/components/CuentaRestringida'
import { useAuth } from '@/features/auth/context/AuthContext'
import { esBloqueo } from '@/features/bloqueos/utils/bloqueos'
import NotificacionesBell from '@/features/notificaciones/components/NotificacionesBell'

const ITEMS = [
  { to: '/admin/inicio', label: 'Inicio y estadísticas', icono: '📈' },
  { to: '/admin/solicitudes', label: 'Solicitudes de registro', icono: '✅', contador: 'solicitudes' },
  { to: '/admin/categorias', label: 'Categorías de especialidad', icono: '🏷️' },
  { to: '/admin/doctores', label: 'Doctores registrados', icono: '🩺' },
  { to: '/admin/usuarios', label: 'Usuarios y pacientes', icono: '👥' },
  { to: '/admin/suscripciones', label: 'Suscripciones de doctores', icono: '💳' },
  { to: '/admin/pagos', label: 'Pagos de consultas', icono: '💰' },
  { to: '/admin/denuncias', label: 'Denuncias y moderación', icono: '🛡️', contador: 'denuncias' },
  { to: '/admin/roles', label: 'Roles y permisos', icono: '🔑' },
  { to: '/admin/configuracion', label: 'Configuración', icono: '⚙️' },
]

function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

// Cuántas solicitudes y denuncias están pendientes, para los contadores de la barra lateral.
function useContadoresAdmin() {
  const [solicitudes, setSolicitudes] = useState(0)
  const [denuncias, setDenuncias] = useState(0)

  useEffect(() => {
    const qSolicitudes = query(collection(db, 'usuarios'), where('rol', '==', 'profesional'), where('estado', '==', 'pendiente'))
    const unsubSolicitudes = onSnapshot(qSolicitudes, (snap) => setSolicitudes(snap.size))
    const qDenuncias = query(collection(db, 'reportes'), where('estado', '==', 'pendiente'))
    const unsubDenuncias = onSnapshot(qDenuncias, (snap) => setDenuncias(snap.size))
    return () => {
      unsubSolicitudes()
      unsubDenuncias()
    }
  }, [])

  return { solicitudes, denuncias }
}

export default function AdminLayout() {
  const { estado, perfil, usuario, esSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const contadores = useContadoresAdmin()

  if (esBloqueo(estado)) return <CuentaRestringida />

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-logo-row">
          <div className="admin-logo-mark">DT</div>
          <div>
            <div className="admin-logo-word">DOCTOP</div>
            <div className="admin-logo-sub">Admin Central</div>
          </div>
        </div>
        <div className="admin-rol-linea">
          <span className="punto" />
          {esSuperAdmin ? 'Super administrador' : 'Administrador'}
        </div>

        {ITEMS.map((item) => {
          const conteo = item.contador === 'solicitudes' ? contadores.solicitudes : item.contador === 'denuncias' ? contadores.denuncias : 0
          return (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => `admin-nav-item${isActive ? ' on' : ''}`}>
              <span className="admin-nav-icon">{item.icono}</span>
              <span className="admin-nav-label">{item.label}</span>
              {item.contador && conteo > 0 && (
                <span className={`admin-nav-badge ${item.contador === 'solicitudes' ? 'alerta' : 'ambar'}`}>{conteo}</span>
              )}
            </NavLink>
          )
        })}

        <div className="admin-sidebar-footer">
          <div className="admin-avatar">{iniciales(perfil?.nombre)}</div>
          <div className="admin-footer-info">
            <div className="admin-footer-nombre">{perfil?.nombre ?? 'Administrador'}</div>
            <div className="admin-footer-email">{usuario?.email}</div>
          </div>
          <button type="button" className="admin-logout-btn" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión">⎋</button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <NotificacionesBell />
          <NavLink to="/admin/doctores" className="admin-topbar-link">+ Registrar doctor</NavLink>
          <NavLink to="/admin/configuracion" className="admin-topbar-icon" aria-label="Configuración" title="Configuración">⚙️</NavLink>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
