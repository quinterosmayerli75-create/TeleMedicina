import { Outlet } from 'react-router-dom'
import PanelLayout from './PanelLayout'
import { useAuth } from '@/features/auth/context/AuthContext'
import CuentaRestringida from '@/features/auth/components/CuentaRestringida'
import LlamadaEntranteBanner from '@/features/chat/components/LlamadaEntranteBanner'

const ITEMS = [
  { to: '/doctor/panel', label: 'Panel principal' },
  { to: '/doctor/agenda', label: 'Agenda' },
  { to: '/doctor/inicio', label: 'Inicio' },
  { to: '/doctor/buscar', label: 'Buscar doctores' },
  { to: '/doctor/favoritos', label: 'Favoritos' },
  { to: '/doctor/consultas', label: 'Mis consultas' },
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
    <PanelLayout items={ITEMS} banner={<LlamadaEntranteBanner base="/doctor" />}>
      <Outlet />
    </PanelLayout>
  )
}
