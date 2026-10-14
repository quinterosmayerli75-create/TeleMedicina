import { Link, useLocation } from 'react-router-dom'
import Logo from '@/shared/components/Logo'
import { useTiposProfesion } from '@/shared/hooks/useTiposProfesion'
import fotoDoctora from '@/assets/landing/doctora-consulta.jpg'
import './InicioPublico.css'

// Solo decorativo: un ícono aproximado según palabras clave del nombre de la especialidad.
const ICONOS_POR_PALABRA = [
  [/odont|dent/i, '🦷'],
  [/cardio/i, '❤️'],
  [/nutri/i, '🥗'],
  [/dermat/i, '🧴'],
  [/pediatr/i, '🧒'],
  [/gineco|obstetr/i, '🤰'],
  [/psico|mental/i, '🧠'],
  [/general|medicina/i, '🩺'],
]
function iconoEspecialidad(nombre = '') {
  return ICONOS_POR_PALABRA.find(([regex]) => regex.test(nombre))?.[1] ?? '🏷️'
}

const PASOS = [
  { icono: '🔎', titulo: 'Busca a tu profesional', texto: 'Filtra por especialidad, precio y disponibilidad entre profesionales verificados.' },
  { icono: '💻', titulo: 'Elige la modalidad', texto: 'Chat de texto, llamada de voz o videollamada — como te sea más cómodo.' },
  { icono: '📱', titulo: 'Paga por QR', texto: 'Escanea el código del doctor, sube tu comprobante y espera la validación.' },
  { icono: '✅', titulo: 'Atiéndete desde donde estés', texto: 'Sin salas de espera ni traslados: la consulta se habilita apenas se valida tu pago.' },
]

const BENEFICIOS = [
  { icono: '🚫', titulo: 'Sin salas de espera', texto: 'Agenda y atiéndete sin traslados ni filas.' },
  { icono: '🩺', titulo: 'Profesionales verificados', texto: 'El equipo de DocTop revisa carnet y documentos de cada doctor.' },
  { icono: '💬', titulo: 'Tres formas de atenderte', texto: 'Chat de texto, llamada de voz o videollamada.' },
  { icono: '📱', titulo: 'Pago directo por QR', texto: 'Pagas directo al doctor, sin intermediarios.' },
]

export default function InicioPublico() {
  const tipos = useTiposProfesion()
  const location = useLocation()
  const solicitudEnviada = location.state?.solicitudEnviada

  return (
    <div className="landing">
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
        <nav className="landing-nav-links">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#especialidades">Especialidades</a>
          <Link to="/acceso">Iniciar sesión</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div>
            <div className="landing-hero-tag">🩺 Red médica digital · 100% virtual</div>
            <h1>Atención médica <span className="acento">100% virtual</span>, cuando la necesites.</h1>
            <p>
              DocTop conecta a pacientes con profesionales de la salud verificados para consultas por
              chat, llamada o videollamada — sin traslados ni salas de espera.
            </p>
            <div className="landing-hero-botones">
              <Link to="/registro/paciente" className="btn btn-gold btn-auto">Soy paciente</Link>
              <Link to="/registro/profesional" className="btn btn-outline btn-auto landing-btn-outline">Soy profesional de la salud</Link>
            </div>
            <div className="landing-hero-badges">
              <div className="landing-hero-badge">✓ Profesionales verificados</div>
              <div className="landing-hero-badge">💬 Chat, llamada o video</div>
              <div className="landing-hero-badge">📱 Pago directo por QR</div>
            </div>
          </div>
          <div className="landing-hero-visual">
            <img src={fotoDoctora} alt="Doctora atendiendo una consulta virtual" />
            <div className="landing-hero-visual-badge">🟢 Profesionales disponibles ahora</div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="como-funciona">
        <div style={{ textAlign: 'center' }}>
          <div className="landing-section-tag">Paso a paso</div>
          <h2 className="section-title" style={{ marginTop: 0 }}>¿Cómo funciona la telemedicina en DocTop?</h2>
          <p className="landing-section-sub">Accede a atención especializada sin filas ni demoras.</p>
        </div>
        <div className="landing-pasos">
          {PASOS.map((paso, i) => (
            <div className="card-plain landing-paso" key={paso.titulo}>
              <div className="landing-paso-numero">{String(i + 1).padStart(2, '0')}</div>
              <div className="landing-paso-icono">{paso.icono}</div>
              <div style={{ fontWeight: 600, fontSize: 15, margin: '12px 0 6px' }}>{paso.titulo}</div>
              <div style={{ fontSize: 13, color: 'var(--gris)' }}>{paso.texto}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="especialidades">
        <div style={{ textAlign: 'center' }}>
          <div className="landing-section-tag">Cuerpo médico</div>
          <h2 className="section-title" style={{ marginTop: 0 }}>Especialidades disponibles</h2>
          <p className="landing-section-sub">Profesionales listos para orientarte y darte tratamiento.</p>
        </div>
        {tipos.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--gris)', fontSize: 13, marginTop: 24 }}>Muy pronto vamos a sumar especialidades.</p>
        ) : (
          <div className="landing-especialidades">
            {tipos.map((t) => (
              <Link to="/acceso" className="landing-especialidad" key={t.id}>
                <div className="landing-especialidad-icono">{iconoEspecialidad(t.nombre)}</div>
                <div className="landing-especialidad-nombre">{t.nombre}</div>
                <div className="landing-especialidad-desc">Profesionales de {t.nombre.toLowerCase()} disponibles para tu consulta.</div>
                <div className="landing-especialidad-link">Ver doctores →</div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="landing-section" id="beneficios">
        <div style={{ textAlign: 'center' }}>
          <div className="landing-section-tag">Beneficios</div>
          <h2 className="section-title" style={{ marginTop: 0 }}>¿Por qué atenderte en DocTop?</h2>
        </div>
        <div className="landing-beneficios">
          {BENEFICIOS.map((b) => (
            <div className="landing-beneficio" key={b.titulo}>
              <div className="landing-beneficio-icono">{b.icono}</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{b.titulo}</div>
              <div style={{ fontSize: 12.5, color: 'var(--gris)', marginTop: 4 }}>{b.texto}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="landing-cta">
        <div>
          <h2>Comienza tu consulta médica hoy mismo</h2>
          <p>Regístrate gratis, busca a tu profesional de preferencia y paga de forma directa por QR.</p>
          <div className="landing-hero-botones">
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
              <Link to="/registro/paciente">Registrarme como paciente</Link>
              <Link to="/registro/profesional">Registrarme como profesional</Link>
            </div>
          </div>
        </div>
        <div className="landing-footer-bottom">© {new Date().getFullYear()} DocTop — plataforma de telemedicina 100% virtual.</div>
      </footer>
    </div>
  )
}
