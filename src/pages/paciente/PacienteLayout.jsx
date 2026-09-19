import { Outlet } from 'react-router-dom'
import PanelLayout from '../../components/layout/PanelLayout'

const ITEMS = [
  { to: '/paciente/inicio', label: 'Inicio' },
  { to: '/paciente/buscar', label: 'Buscar' },
  { to: '/paciente/favoritos', label: 'Favoritos' },
  { to: '/paciente/mensajes', label: 'Mensajes' },
  { to: '/paciente/perfil', label: 'Mi perfil' },
  { to: '/paciente/configuracion', label: 'Configuración' },
]

export default function PacienteLayout() {
  return (
    <PanelLayout items={ITEMS}>
      <Outlet />
    </PanelLayout>
  )
}
