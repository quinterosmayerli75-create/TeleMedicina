import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/services/firebase/config'
import PanelLayout from './PanelLayout'
import { useAuth } from '@/features/auth/context/AuthContext'
import CuentaRestringida from '@/features/auth/components/CuentaRestringida'
import LlamadaEntranteBanner from '@/features/chat/components/LlamadaEntranteBanner'
import { revisarVencimientoSuscripcion } from '@/features/consultas/services/suscripciones'

const ITEMS = [
  { to: '/doctor/panel', label: 'Panel principal' },
  { to: '/doctor/suscripcion', label: 'Suscripción' },
  { to: '/doctor/agenda', label: 'Agenda' },
  { to: '/doctor/inicio', label: 'Inicio' },
  { to: '/doctor/buscar', label: 'Buscar doctores' },
  { to: '/doctor/favoritos', label: 'Favoritos' },
  { to: '/doctor/consultas', label: 'Mis consultas' },
  { to: '/doctor/validacion-pagos', label: 'Validar pagos' },
  { to: '/doctor/mensajes', label: 'Mensajes' },
  { to: '/doctor/informes', label: 'Informes médicos' },
  { to: '/doctor/configuracion', label: 'Configuración' },
]

export default function DoctorLayout() {
  const { usuario, estado } = useAuth()

  // Revisión "perezosa" (sin backend/cron): cada vez que el doctor entra a cualquier pantalla,
  // se fija si su membresía está por vencer (avisa) o ya venció sin renovar (suspende).
  useEffect(() => {
    if (!usuario || estado !== 'activo') return
    getDoc(doc(db, 'profesionales', usuario.uid))
      .then((snap) => { if (snap.exists()) revisarVencimientoSuscripcion(usuario.uid, snap.data()) })
      .catch(() => {})
  }, [usuario, estado])

  if (estado !== 'activo') {
    return <CuentaRestringida />
  }

  return (
    <PanelLayout items={ITEMS} banner={<LlamadaEntranteBanner base="/doctor" />}>
      <Outlet />
    </PanelLayout>
  )
}
