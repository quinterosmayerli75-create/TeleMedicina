import { Outlet } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'

const ITEMS = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/solicitudes', label: 'Solicitudes' },
  { to: '/admin/categorias', label: 'Categorías' },
  { to: '/admin/doctores', label: 'Doctores' },
  { to: '/admin/usuarios', label: 'Usuarios' },
  { to: '/admin/denuncias', label: 'Denuncias' },
  { to: '/admin/roles', label: 'Roles y permisos' },
  { to: '/admin/configuracion', label: 'Configuración' },
]

export default function AdminLayout() {
  return (
    <PanelLayout items={ITEMS}>
      <Outlet />
    </PanelLayout>
  )
}
