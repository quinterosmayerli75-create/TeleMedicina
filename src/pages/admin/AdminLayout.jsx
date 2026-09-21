import { Outlet } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'
import CuentaRestringida from '../../components/CuentaRestringida'
import { useAuth } from '../../context/AuthContext'
import { esBloqueo } from '../../utils/bloqueos'

const ITEMS = [
  { to: '/admin/inicio', label: 'Inicio y estadísticas' },
  { to: '/admin/solicitudes', label: 'Solicitudes' },
  { to: '/admin/categorias', label: 'Categorías' },
  { to: '/admin/doctores', label: 'Doctores' },
  { to: '/admin/usuarios', label: 'Usuarios' },
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
