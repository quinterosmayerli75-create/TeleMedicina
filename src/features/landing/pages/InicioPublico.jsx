import { Link, useLocation } from 'react-router-dom'
import { ArrowUpRight, ClipboardList, Stethoscope, HeartPulse, Brain, Baby, Apple, Smile, Flower2, HandHeart, Search, Video, QrCode, CircleCheck, Clock3, MessagesSquare } from '@/shared/components/Icons'
import Logo from '@/shared/components/Logo'
import { useTiposProfesion } from '@/shared/hooks/useTiposProfesion'
import { usePageMotion } from '@/shared/hooks/usePageMotion'
import InicioCarrusel from '@/shared/components/InicioCarrusel'
import './InicioPublico.css'

// Solo decorativo: un ícono aproximado según palabras clave del nombre de la especialidad.
const ICONOS_POR_PALABRA = [
  [/odont|dent/i, Smile],
  [/cardio/i, HeartPulse],
  [/nutri/i, Apple],
  [/dermat/i, HandHeart],
  [/pediatr/i, Baby],
  [/gineco|obstetr/i, Flower2],
  [/psico|mental/i, Brain],
  [/general|medicina/i, Stethoscope],
]
function iconoEspecialidad(nombre = '') {
  const Icono = ICONOS_POR_PALABRA.find(([regex]) => regex.test(nombre))?.[1] ?? Stethoscope
  return <Icono size={25} strokeWidth={1.7} aria-hidden="true" />
}

const PASOS = [
  { icono: Search, titulo: 'Busca a tu profesional', texto: 'Filtra por especialidad, precio y disponibilidad entre profesionales verificados.' },
  { icono: Video, titulo: 'Elige la modalidad', texto: 'Chat de texto, llamada de voz o videollamada — como te sea más cómodo.' },
  { icono: QrCode, titulo: 'Paga por QR', texto: 'Escanea el código del doctor, sube tu comprobante y espera la validación.' },
  { icono: CircleCheck, titulo: 'Atiéndete desde donde estés', texto: 'Sin salas de espera ni traslados: la consulta se habilita apenas se valida tu pago.' },
]

const BENEFICIOS = [
  { icono: Clock3, titulo: 'Sin salas de espera', texto: 'Agenda y atiéndete sin traslados ni filas.' },
  { icono: Stethoscope, titulo: 'Profesionales verificados', texto: 'El equipo de DocTop revisa carnet y documentos de cada doctor.' },
  { icono: MessagesSquare, titulo: 'Tres formas de atenderte', texto: 'Chat de texto, llamada de voz o videollamada.' },
  { icono: QrCode, titulo: 'Pago directo por QR', texto: 'Pagas directo al doctor, sin intermediarios.' },
]

export default function InicioPublico() {
  const tipos = useTiposProfesion()
  const motionRef = usePageMotion(tipos.length)
  const location = useLocation()
  const solicitudEnviada = location.state?.solicitudEnviada

  return (
    <div className="landing landing--fullscreen" ref={motionRef}>
      {solicitudEnviada && (
        <div style={{ background: 'var(--esmeralda)', color: '#fff', textAlign: 'center', padding: '12px 20px', fontSize: 13.5 }}>
          Tu solicitud de registro fue enviada. El equipo de DocTop la revisará y te avisaremos cuando tu cuenta esté activa.
        </div>
      )}
      <header className="landing-nav">
        <div className="landing-logo">
          <Logo color="var(--admin-accent)" />
          <span>DOCTOP</span>
        </div>
        <nav className="landing-nav-links" aria-label="Navegación principal">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#especialidades">Especialidades</a>
          <Link to="/acceso">Iniciar sesión</Link>
        </nav>
      </header>

      <div className="landing-hero-full">
        <InicioCarrusel pantallaCompleta />
      </div>

      <section className="landing-accesos" aria-label="Accesos rápidos">
        <div className="landing-accesos-inner">
          <div className="landing-accesos-heading" data-motion-item><span>DocTop contigo</span><h2>¿Cómo te acompañamos hoy?</h2></div>
          <div className="landing-accesos-grid">
            {[
              { titulo: 'Busco un especialista', texto: 'Crea tu cuenta y encuentra un profesional para tu consulta.', ruta: '/registro/paciente', Icono: Stethoscope },
              { titulo: 'Ya tengo una cuenta', texto: 'Retoma tus mensajes y revisa tus próximas consultas.', ruta: '/acceso', Icono: MessagesSquare },
              { titulo: 'Soy profesional', texto: 'Conoce cómo formar parte de la red de DocTop.', ruta: '/registro/profesional', Icono: ClipboardList },
            ].map((acceso, i) => <Link to={acceso.ruta} className="landing-acceso" key={acceso.ruta} data-motion-item style={{ '--motion-delay': `${i * 75}ms` }}>
              <span className="landing-acceso-icon"><acceso.Icono size={25} /></span>
              <span className="landing-acceso-copy"><strong>{acceso.titulo}</strong><span>{acceso.texto}</span></span>
              <ArrowUpRight size={19} aria-hidden="true" />
            </Link>)}
          </div>
        </div>
      </section>

      <section className="landing-section" id="como-funciona">
        <div data-motion-item style={{ textAlign: 'center' }}>
          <div className="landing-section-tag">Paso a paso</div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Menos vueltas. Más cuidado.</h2>
          <p className="landing-section-sub">De la primera búsqueda a tu consulta, a tu ritmo.</p>
        </div>
        <div className="landing-pasos">
          {PASOS.map((paso, i) => (
            <div className="card-plain landing-paso" data-motion-item style={{ '--motion-delay': `${i * 85}ms` }} key={paso.titulo}>
              <div className="landing-paso-numero">{String(i + 1).padStart(2, '0')}</div>
              <div className="landing-paso-icono"><paso.icono size={25} strokeWidth={1.7} aria-hidden="true" /></div>
              <div style={{ fontWeight: 600, fontSize: 15, margin: '12px 0 6px' }}>{paso.titulo}</div>
              <div style={{ fontSize: 13, color: 'var(--gris)' }}>{paso.texto}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="especialidades">
        <div data-motion-item style={{ textAlign: 'center' }}>
          <div className="landing-section-tag">Cuerpo médico</div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Especialidades disponibles</h2>
          <p className="landing-section-sub">Profesionales listos para orientarte y darte tratamiento.</p>
        </div>
        {tipos.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gris)', fontSize: 13, marginTop: 24 }}>Muy pronto vamos a sumar especialidades.</p>
        ) : (
          <div className="landing-especialidades">
            {tipos.map((t, i) => (
              <Link to="/acceso" className="landing-especialidad" data-motion-item style={{ '--motion-delay': `${(i % 4) * 70}ms` }} key={t.id}>
                <div className="landing-especialidad-icono">{iconoEspecialidad(t.nombre)}</div>
                <div className="landing-especialidad-nombre">{t.nombre}</div>
                <div className="landing-especialidad-desc">Profesionales de {t.nombre.toLowerCase()} disponibles para tu consulta.</div>
                <div className="landing-especialidad-link">Explorar especialistas <ArrowUpRight size={16} aria-hidden="true" /></div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="landing-section" id="beneficios">
        <div data-motion-item style={{ textAlign: 'center' }}>
          <div className="landing-section-tag">Beneficios</div>
          <h2 className="section-title" style={{ marginTop: 0 }}>¿Por qué atenderte en DocTop?</h2>
        </div>
        <div className="landing-beneficios">
          {BENEFICIOS.map((b, i) => (
            <div className="landing-beneficio" data-motion-item style={{ '--motion-delay': `${i * 85}ms` }} key={b.titulo}>
              <div className="landing-beneficio-icono"><b.icono size={25} strokeWidth={1.7} aria-hidden="true" /></div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{b.titulo}</div>
              <div style={{ fontSize: 12.5, color: 'var(--gris)', marginTop: 4 }}>{b.texto}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="landing-cta" data-motion-item>
        <div>
          <h2>Haz espacio para tu bienestar.</h2>
          <p>Regístrate gratis, busca a tu profesional de preferencia y paga de forma directa por QR.</p>
          <div className="landing-hero-botones" data-motion-item style={{ '--motion-delay': '220ms' }}>
            <Link to="/registro/paciente" className="btn btn-gold btn-auto">Registrarme gratis</Link>
            <a href="#como-funciona" className="btn btn-outline btn-auto landing-btn-outline" style={{ borderColor: '#fff', color: '#fff' }}>Conocer cómo funciona</a>
          </div>
        </div>
      </div>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <div>
            <div className="landing-footer-logo">
              <Logo color="var(--admin-accent)" />
              <span>DOCTOP</span>
            </div>
            <p className="landing-footer-desc">Plataforma de telemedicina 100% virtual: conectamos pacientes con profesionales de la salud verificados.</p>
          </div>
          <div>
            <div className="landing-footer-titulo">Navegación</div>
            <div className="landing-footer-links">
              <a href="#como-funciona">Cómo funciona</a>
              <a href="#especialidades">Especialidades</a>
              <a href="#beneficios">Beneficios</a>
            </div>
          </div>
          <div>
            <div className="landing-footer-titulo">Cuenta</div>
            <div className="landing-footer-links">
              <Link to="/acceso">Iniciar sesión</Link>
              <Link to="/registro">Crear una cuenta</Link>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">© {new Date().getFullYear()} DocTop — plataforma de telemedicina 100% virtual.</div>
      </footer>
    </div>
  )
}
