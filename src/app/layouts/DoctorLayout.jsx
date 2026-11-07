import { Fragment, useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import {
  Stethoscope, CreditCard, CalendarDays, Home, Search, Heart,
  FolderKanban, CircleCheckBig, MessageSquare, ClipboardList, Settings, LogOut, ShieldAlert, CalendarHeart,
} from '@/shared/components/Icons'
import { db, auth } from '@/services/firebase/config'
import CuentaRestringida from '@/features/auth/components/CuentaRestringida'
import LlamadaEntranteBanner from '@/features/chat/components/LlamadaEntranteBanner'
import NotificacionesBell from '@/features/notificaciones/components/NotificacionesBell'
import TutorialInicio from '@/features/onboarding/components/TutorialInicio'
import { useAuth } from '@/features/auth/context/AuthContext'
import { DIAS_AVISO_VENCIMIENTO, revisarVencimientoSuscripcion } from '@/features/consultas/services/suscripciones'
import { revisarFinalizacionAutomatica, revisarRecordatorioConsulta, revisarVencimientoPago } from '@/features/consultas/services/consultas'
import { encontrarSeccion } from '@/shared/utils/texto'

const ITEMS = [
  { to: '/doctor/panel', label: 'Panel principal', Icono: Stethoscope },
  { to: '/doctor/suscripcion', label: 'Suscripción', Icono: CreditCard },
  { to: '/doctor/agenda', label: 'Agenda', Icono: CalendarDays },
  { to: '/doctor/inicio', label: 'Inicio', Icono: Home },
  { to: '/doctor/buscar', label: 'Buscar doctores', Icono: Search },
  { to: '/doctor/favoritos', label: 'Favoritos', Icono: Heart },
  { to: '/doctor/mis-citas', label: 'Mis citas', Icono: CalendarHeart },
  { to: '/doctor/consultas', label: 'Mis consultas', Icono: FolderKanban },
  { to: '/doctor/validacion-pagos', label: 'Validar pagos', Icono: CircleCheckBig },
  { to: '/doctor/mensajes', label: 'Mensajes', Icono: MessageSquare },
  { to: '/doctor/informes', label: 'Informes médicos', Icono: ClipboardList },
  { to: '/doctor/configuracion', label: 'Configuración', Icono: Settings },
]

const GRUPOS = { 0: 'Mi consulta', 3: 'Red de profesionales', 6: 'Atención al paciente', 11: 'Tu espacio' }

function iniciales(nombre = '') {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || '?'
}

export default function DoctorLayout() {
  const { usuario, perfil, estado } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [busqueda, setBusqueda] = useState('')
  const [datosProfesional, setDatosProfesional] = useState(null)
  const [avisoVencimientoCerrado, setAvisoVencimientoCerrado] = useState(false)

  // Revisión "perezosa" (sin backend/cron): cada vez que el doctor entra a cualquier pantalla,
  // se fija si su membresía está por vencer (avisa) o ya venció sin renovar (suspende).
  useEffect(() => {
    if (!usuario || estado !== 'activo') return
    getDoc(doc(db, 'profesionales', usuario.uid))
      .then((snap) => { if (snap.exists()) revisarVencimientoSuscripcion(usuario.uid, snap.data()) })
      .catch(() => {})
  }, [usuario, estado])

  // Misma idea, perezosa: avisa una sola vez por consulta si tiene una habilitada para hoy o mañana.
  useEffect(() => {
    if (!usuario || estado !== 'activo') return
    revisarRecordatorioConsulta(usuario.uid).catch(() => {})
  }, [usuario, estado])

  // Perezoso también: cancela solicitudes con más de 24h sin comprobante de pago.
  useEffect(() => {
    if (!usuario || estado !== 'activo') return
    revisarVencimientoPago(usuario.uid).catch(() => {})
  }, [usuario, estado])

  // Perezoso también: una consulta habilitada cuya fecha ya pasó se marca sola como finalizada.
  useEffect(() => {
    if (!usuario || estado !== 'activo') return
    revisarFinalizacionAutomatica(usuario.uid).catch(() => {})
  }, [usuario, estado])

  // Escucha en vivo el estado de la suscripción para mostrar el bloqueo de pantalla completa en
  // cuanto se suspenda, sin esperar a recargar.
  useEffect(() => {
    if (!usuario || estado !== 'activo') return undefined
    return onSnapshot(doc(db, 'profesionales', usuario.uid), (snap) => {
      setDatosProfesional(snap.exists() ? snap.data() : null)
    })
  }, [usuario, estado])

  if (estado !== 'activo') {
    return <CuentaRestringida />
  }

  const suspendidoPorMembresia = datosProfesional?.suscripcionActiva === false
  const enPaginaDeSuscripcion = location.pathname === '/doctor/suscripcion'

  // Ventana emergente (estilo "tu suscripción de streaming está por vencer"): a diferencia del
  // bloqueo de arriba (cuenta YA suspendida, no se puede cerrar), esta solo avisa que falta poco
  // y se puede cerrar — reaparece la próxima vez que entre mientras siga sin pagar.
  const hoy = new Date().toISOString().slice(0, 10)
  const diasParaVencer = datosProfesional?.suscripcionVenceEl
    ? Math.ceil((new Date(`${datosProfesional.suscripcionVenceEl}T00:00:00`) - new Date(`${hoy}T00:00:00`)) / 86400000)
    : null
  const porVencerPronto = datosProfesional?.suscripcionActiva === true
    && diasParaVencer !== null && diasParaVencer >= 0 && diasParaVencer <= DIAS_AVISO_VENCIMIENTO

  async function cerrarSesion() {
    await signOut(auth)
    navigate('/acceso', { replace: true })
  }

  function buscar(e) {
    e.preventDefault()
    if (!busqueda.trim()) return
    // Si lo escrito es el nombre de una sección del menú (ej. "mensajes"), va directo ahí;
    // si no, busca pacientes en Mis consultas como antes.
    const ruta = encontrarSeccion(ITEMS, busqueda)
    navigate(ruta ?? `/doctor/consultas?q=${encodeURIComponent(busqueda.trim())}`)
  }

  return (
    <div className="admin-shell" data-portal="doctor">
      <LlamadaEntranteBanner base="/doctor" />
      <aside className="admin-sidebar">
        <div className="admin-logo-row">
          <div className="admin-logo-mark" aria-hidden="true">dt<span>+</span></div>
          <div>
            <div className="admin-logo-word">DOCTOP</div>
            <div className="admin-logo-sub">Portal doctor</div>
          </div>
        </div>

        {ITEMS.map((item, index) => (
          <Fragment key={item.to}>
          {GRUPOS[index] && <div className="portal-nav-group">{GRUPOS[index]}</div>}
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `admin-nav-item${isActive ? ' on' : ''}`}>
            <span className="admin-nav-icon"><item.Icono size={17} strokeWidth={2} /></span>
            <span className="admin-nav-label">{item.label}</span>
          </NavLink>
          </Fragment>
        ))}

        <div className="admin-sidebar-footer">
          <div className="admin-avatar">{iniciales(perfil?.nombre)}</div>
          <div className="admin-footer-info">
            <div className="admin-footer-nombre">{perfil?.nombre ?? 'Doctor'}</div>
            <div className="admin-footer-email">{usuario?.email}</div>
          </div>
          <button type="button" className="admin-logout-btn" onClick={cerrarSesion} aria-label="Cerrar sesión" title="Cerrar sesión"><LogOut size={16} /></button>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <form className="admin-topbar-search" onSubmit={buscar}>
            <Search size={15} />
            <input type="text" placeholder="Buscar paciente en mis consultas…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </form>
          <div className="admin-topbar-spacer" />
          <div className="admin-topbar-pill"><span className="punto" /> Sincronización en vivo</div>
          <NotificacionesBell />
        </header>
        <main className="admin-content">
          <Outlet />
        </main>
      </div>
      <TutorialInicio />

      {suspendidoPorMembresia && !enPaginaDeSuscripcion && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(11, 17, 32, 0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
        >
          <div className="modal-tarjeta" style={{ maxWidth: 460, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, margin: '0 auto 14px', color: '#fff',
              background: 'var(--alerta)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldAlert size={30} strokeWidth={2} />
            </div>
            <div className="modal-titulo" style={{ color: 'var(--alerta)' }}>Tu cuenta está suspendida</div>
            <p className="web-sub" style={{ marginTop: 8 }}>
              Tu membresía venció y no fue renovada a tiempo. Mientras no regularices el pago, no apareces en
              las búsquedas de pacientes y no puedes recibir ni atender nuevas consultas.
            </p>
            <p className="web-sub">
              Realiza el pago de tu suscripción para reactivar tu cuenta y seguir usando DocTop con normalidad.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 12, background: 'var(--admin-accent)' }}
              onClick={() => navigate('/doctor/suscripcion')}
            >
              Pagar mi suscripción ahora
            </button>
            <button type="button" className="btn btn-outline" style={{ marginTop: 10 }} onClick={cerrarSesion}>
              Cerrar sesión
            </button>
          </div>
        </div>
      )}

      {porVencerPronto && !avisoVencimientoCerrado && !enPaginaDeSuscripcion && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(11, 17, 32, 0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
          }}
          onClick={() => setAvisoVencimientoCerrado(true)}
        >
          <div className="modal-tarjeta" style={{ maxWidth: 440, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 14px', color: '#fff',
              background: 'var(--ambar)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CreditCard size={26} strokeWidth={2} />
            </div>
            <div className="modal-titulo">Tu suscripción está por vencer</div>
            <p className="web-sub" style={{ marginTop: 8 }}>
              Vence el <b>{datosProfesional.suscripcionVenceEl}</b>{diasParaVencer === 0 ? ' (hoy)' : ` (en ${diasParaVencer} día${diasParaVencer === 1 ? '' : 's'})`}.
              Si no la renuevas a tiempo, tu cuenta se suspenderá automáticamente.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: 12, background: 'var(--admin-accent)' }}
              onClick={() => navigate('/doctor/suscripcion')}
            >
              Pagar ahora
            </button>
            <button type="button" className="btn btn-outline" style={{ marginTop: 10 }} onClick={() => setAvisoVencimientoCerrado(true)}>
              Recordarme más tarde
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
