import { Link } from 'react-router-dom'
import { HeartPulse, Stethoscope } from 'lucide-react'

// Punto de entrada único para registrarse en DocTop: antes había enlaces sueltos a
// "/registro/paciente" o "/registro/profesional" repartidos en distintas pantallas (landing,
// acceso). Ahora todos pasan por aquí primero, donde se elige el rol una sola vez y de forma
// clara, antes de llenar los datos específicos de cada uno (el paciente y el doctor necesitan
// campos muy distintos — carnet, títulos, especialidad para el doctor; estatura, peso, lugar
// para el paciente — por eso siguen siendo dos formularios después de elegir, no uno solo).
export default function Registro() {
  return (
    <div className="registro-fondo">
      <div className="registro-card" style={{ maxWidth: 640, textAlign: 'center' }}>
        <div className="admin-eyebrow">
          <span className="vivo" style={{ color: 'var(--admin-accent-dark)' }}>🩺 CREAR CUENTA EN DOCTOP</span>
        </div>
        <h1 className="registro-titulo">¿Cómo quieres registrarte?</h1>
        <p className="registro-sub">Elige tu rol para continuar con los datos que corresponden.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
          <Link to="/registro/paciente" className="card-plain" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', padding: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px', color: '#fff',
              background: 'var(--admin-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <HeartPulse size={26} strokeWidth={2} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Soy paciente</div>
            <p style={{ fontSize: 12.5, color: 'var(--gris)', marginTop: 6 }}>Quiero buscar un doctor y atenderme a distancia.</p>
          </Link>
          <Link to="/registro/profesional" className="card-plain" style={{ textDecoration: 'none', color: 'inherit', textAlign: 'center', padding: 24 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, margin: '0 auto 12px', color: '#fff',
              background: 'var(--admin-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Stethoscope size={26} strokeWidth={2} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Soy profesional de la salud</div>
            <p style={{ fontSize: 12.5, color: 'var(--gris)', marginTop: 6 }}>Quiero atender pacientes de forma virtual.</p>
          </Link>
        </div>

        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <Link to="/acceso" className="terminos-link">¿Ya tiene cuenta? Inicie sesión</Link>
        </div>
      </div>
    </div>
  )
}
