import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import {
  LayoutGrid, ClipboardCheck, Tags, Stethoscope, Users, CreditCard,
  Wallet, ShieldAlert, KeyRound, Settings, LogOut, Search,
} from 'lucide-react'
import { db, auth } from '@/services/firebase/config'
import CuentaRestringida from '@/features/auth/components/CuentaRestringida'
import { useAuth } from '@/features/auth/context/AuthContext'
import { esBloqueo } from '@/features/bloqueos/utils/bloqueos'
import NotificacionesBell from '@/features/notificaciones/components/NotificacionesBell'

const ITEMS = [
  { to: '/admin/inicio', label: 'Inicio y estadísticas', Icono: LayoutGrid },
  { to: '/admin/solicitudes', label: 'Solicitudes de registro', Icono: ClipboardCheck, contador: 'solicitudes' },
  { to: '/admin/categorias', label: 'Categorías de especialidad', Icono: Tags },
  { to: '/admin/doctores', label: 'Doctores registrados', Icono: Stethoscope },
  { to: '/admin/usuarios', label: 'Usuarios y pacientes', Icono: Users },
  { to: '/admin/suscripciones', label: 'Suscripciones de doctores', Icono: CreditCard },
  { to: '/admin/pagos', label: 'Pagos de consultas', Icono: Wallet },
  { to: '/admin/denuncias', label: 'Denuncias y moderación', Icono: ShieldAlert, contador: 'denuncias' },
  { to: '/admin/roles', label: 'Roles y permisos', Icono: KeyRound },
  { to: '/admin/configuracion', label: 'Configuración', Icono: Settings },
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
  const [busqueda, setBusqueda] = useState('')

  if (esBloqueo(estado)) return <CuentaRestringida />

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  function buscar(e) {
    e.preventDefault()
    if (busqueda.trim()) navigate(`/admin/doctores?q=${encodeURIComponent(busqueda.trim())}`)
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-logo-row">
          <div className="admin-logo-mark"><Stethoscope size={18} strokeWidth={2.4} /></div>
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
              <span className="admin-nav-icon"><item.Icono size={17} strokeWidth={2} /></span>
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
          <div className="admin-topbar-pill"><span className="punto" /> Sistema en línea</div>
          <NotificacionesBell />
          <NavLink to="/admin/configuracion" className="admin-topbar-icon" aria-label="Configuración" title="Configuración"><Settings size={16} /></NavLink>
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
