import { Outlet } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'
import { useAuth } from '../../context/AuthContext'
import CuentaRestringida from '../../components/CuentaRestringida'

const ITEMS = [
  { to: '/doctor/panel', label: 'Panel principal' },
  { to: '/doctor/inicio', label: 'Inicio' },
  { to: '/doctor/buscar', label: 'Buscar doctores' },
  { to: '/doctor/favoritos', label: 'Favoritos' },
  { to: '/doctor/mensajes', label: 'Mensajes' },
  { to: '/doctor/informes', label: 'Informes médicos' },
  { to: '/doctor/configuracion', label: 'Configuración' },
]

export default function DoctorLayout() {
  const { estado } = useAuth()

  if (estado !== 'activo') {
    return <CuentaRestringida />
  }

  return (
    <PanelLayout items={ITEMS}>
      <Outlet />
    </PanelLayout>
  )
}
