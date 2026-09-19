import { Link, useLocation } from 'react-router-dom'
import Logo from '../../components/Logo'
import { useTiposProfesion } from '../../hooks/useTiposProfesion'
import './InicioPublico.css'

const PASOS = [
  { titulo: 'Busca a tu profesional', texto: 'Filtra por especialidad, precio y disponibilidad entre profesionales verificados.' },
  { titulo: 'Elige la modalidad', texto: 'Chat de texto, llamada de voz o videollamada — como te sea más cómodo.' },
  { titulo: 'Paga por QR', texto: 'Escanea el código, sube tu comprobante y espera la validación.' },
  { titulo: 'Atiéndete desde donde estés', texto: 'Sin salas de espera ni traslados: la consulta se habilita apenas se valida tu pago.' },
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
          <Logo color="var(--oro-claro)" />
          <span>DOCTOP</span>
        </div>
        <nav className="landing-nav-links">
          <a href="#como-funciona">Cómo funciona</a>
          <a href="#especialidades">Especialidades</a>
          <Link to="/acceso">Iniciar sesión</Link>
        </nav>
      </header>

      <section className="landing-hero">
        <h1>Atención médica 100% virtual, cuando la necesites.</h1>
        <p>
          DocTop conecta a pacientes con profesionales de la salud verificados para consultas por
          chat, llamada o videollamada — sin traslados ni salas de espera.
        </p>
        <div className="landing-hero-botones">
          <Link to="/registro/paciente" className="btn btn-gold btn-auto">Soy paciente</Link>
          <Link to="/registro/profesional" className="btn btn-outline btn-auto landing-btn-outline">Soy profesional de la salud</Link>
        </div>
      </section>

      <section className="landing-section" id="como-funciona">
        <h2 className="section-title" style={{ textAlign: 'center' }}>Cómo funciona</h2>
        <div className="landing-pasos">
          {PASOS.map((paso, i) => (
            <div className="card-plain landing-paso" key={paso.titulo}>
              <div className="landing-paso-numero">{i + 1}</div>
              <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{paso.titulo}</div>
              <div style={{ fontSize: 13, color: 'var(--gris)' }}>{paso.texto}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section-oscura" id="especialidades">
        <h2 className="section-title" style={{ textAlign: 'center', color: 'var(--marfil)' }}>Especialidades disponibles</h2>
        <div className="chip-row" style={{ justifyContent: 'center' }}>
          {tipos.length === 0 && <span style={{ color: '#9aa0a3', fontSize: 13 }}>Muy pronto vamos a sumar especialidades.</span>}
          {tipos.map((t) => (
            <div className="chip on" key={t.id}>{t.nombre}</div>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} DocTop — plataforma de telemedicina 100% virtual.</p>
      </footer>
    </div>
  )
}
