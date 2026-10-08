import { Outlet } from 'react-router-dom'
import PanelLayout from './PanelLayout'
import CuentaRestringida from '@/features/auth/components/CuentaRestringida'
import { useAuth } from '@/features/auth/context/AuthContext'
import { esBloqueo } from '@/features/bloqueos/utils/bloqueos'

const ITEMS = [
  { to: '/admin/inicio', label: 'Inicio y estadísticas' },
  { to: '/admin/solicitudes', label: 'Solicitudes' },
  { to: '/admin/categorias', label: 'Categorías' },
  { to: '/admin/doctores', label: 'Doctores' },
  { to: '/admin/usuarios', label: 'Usuarios' },
  { to: '/admin/suscripciones', label: 'Suscripciones de doctores' },
  { to: '/admin/pagos', label: 'Pagos de consultas' },
  { to: '/admin/denuncias', label: 'Denuncias' },
  { to: '/admin/roles', label: 'Roles y permisos' },
  { to: '/admin/configuracion', label: 'Configuración' },
]

export default function AdminLayout() {
  const { estado } = useAuth()

  if (esBloqueo(estado)) return <CuentaRestringida />

  return (
    <PanelLayout items={ITEMS}>
      <Outlet />
    </PanelLayout>
  )
}
