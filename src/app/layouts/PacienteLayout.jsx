import { Outlet } from 'react-router-dom'
import PanelLayout from './PanelLayout'
import CuentaRestringida from '@/features/auth/components/CuentaRestringida'
import LlamadaEntranteBanner from '@/features/chat/components/LlamadaEntranteBanner'
import { useAuth } from '@/features/auth/context/AuthContext'
import { esBloqueo } from '@/features/bloqueos/utils/bloqueos'

const ITEMS = [
  { to: '/paciente/inicio', label: 'Inicio' },
  { to: '/paciente/buscar', label: 'Buscar' },
  { to: '/paciente/favoritos', label: 'Favoritos' },
  { to: '/paciente/consultas', label: 'Mis consultas' },
  { to: '/paciente/mensajes', label: 'Mensajes' },
  { to: '/paciente/perfil', label: 'Mi perfil' },
  { to: '/paciente/configuracion', label: 'Configuración' },
]

export default function PacienteLayout() {
  const { estado } = useAuth()

  if (esBloqueo(estado)) return <CuentaRestringida />

  return (
    <PanelLayout items={ITEMS} banner={<LlamadaEntranteBanner base="/paciente" />}>
      <Outlet />
    </PanelLayout>
  )
}
