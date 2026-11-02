import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import Icono from './Icono'
import consulta from '@/assets/landing/consulta-fotografia.jpg'
import retrato from '@/assets/landing/profesional-retrato.jpg'
import profesional from '@/assets/landing/profesional-consulta.jpg'
import '../styles/carrusel.css'

const FOTOS = [
  { src: consulta, alt: 'Profesional atendiendo por videollamada', position: '50% 67%' },
  { src: retrato, alt: 'Profesional de la salud sonriendo en su consulta', position: '50% 42%' },
  { src: profesional, alt: 'Médico conversando durante una consulta', position: '50% 33%' },
]
const CONTENIDOS = {
  publico: [
    ['A tu manera', 'Una conversación puede ser el primer paso.', 'Chat, llamada o video. Elige cómo prefieres conversar.', '/registro/paciente', 'Empezar a cuidarme'],
    ['Personas que te escuchan', 'Encuentra a tu próximo especialista.', 'Explora especialidades y conoce a los profesionales antes de elegir.', '/registro/paciente', 'Conocer DocTop'],
    ['También para profesionales', 'Más tiempo para acompañar a tus pacientes.', 'Reúne tus consultas, mensajes e informes en un mismo lugar.', '/registro/profesional', 'Soy profesional'],
  ],
  paciente: [
    ['Tu espacio de salud', 'Encuentra a quien te escuche.', 'Busca por nombre o especialidad y conoce sus modalidades.', '/paciente/buscar', 'Buscar profesionales'],
    ['Todo a mano', 'Tus consultas, con más claridad.', 'Consulta el horario, el estado y los detalles de tu atención.', '/paciente/consultas', 'Ver mis consultas'],
    ['Sigue la conversación', 'Un espacio para resolver tus dudas.', 'Abre tus conversaciones y comparte lo que necesites con tu profesional.', '/paciente/mensajes', 'Abrir mensajes'],
  ],
  doctor: [
    ['Tu día, a tu ritmo', 'Haz espacio para lo importante.', 'Organiza tus horarios y revisa tus próximas consultas.', '/doctor/agenda', 'Abrir agenda'],
    ['Continuidad en el cuidado', 'Cada consulta tiene su historia.', 'Revisa y prepara los informes de tus pacientes.', '/doctor/informes', 'Ver informes'],
    ['Cerca de tus pacientes', 'Retoma la conversación.', 'Encuentra tus mensajes y acompaña el seguimiento de tus pacientes.', '/doctor/mensajes', 'Abrir mensajes'],
  ],
  admin: [
    ['Gestión con criterio', 'Detrás de cada registro, una persona.', 'Revisa las solicitudes y la documentación de los profesionales.', '/admin/solicitudes', 'Revisar solicitudes'],
    ['Una red que se cuida', 'Conoce a tus profesionales.', 'Consulta sus datos, estados y acreditaciones en un solo lugar.', '/admin/doctores', 'Ver profesionales'],
    ['Información ordenada', 'Revisa los pagos con claridad.', 'Accede a los comprobantes y al estado de cada consulta.', '/admin/pagos', 'Revisar pagos'],
  ],
}

export default function InicioCarrusel({ audiencia = 'publico', compacto = false, pantallaCompleta = false, soloFotos = false }) {
  const id = useId()
  const root = useRef(null)
  const inicioToque = useRef(null)
  const [indice, setIndice] = useState(0)
  const [reducido, setReducido] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [reproducir, setReproducir] = useState(true)
  const [hover, setHover] = useState(false)
  const [enfocado, setEnfocado] = useState(false)
  const [visible, setVisible] = useState(false)
  const [oculto, setOculto] = useState(() => document.hidden)
  const contenido = CONTENIDOS[audiencia] ?? CONTENIDOS.publico
  const actual = contenido[indice]
  const Titulo = pantallaCompleta ? 'h1' : 'h2'
  const titulo = pantallaCompleta && audiencia === 'publico' && indice === 0 ? 'Cuidarte empieza con una conversación.' : actual[1]

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const cambiar = event => setReducido(event.matches)
    const visibilidad = () => setOculto(document.hidden)
    preference.addEventListener('change', cambiar)
    document.addEventListener('visibilitychange', visibilidad)
    const observer = new IntersectionObserver(entries => setVisible(entries[0].isIntersecting), { threshold: .2 })
    if (root.current) observer.observe(root.current)
    return () => {
      preference.removeEventListener('change', cambiar)
      document.removeEventListener('visibilitychange', visibilidad)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (!reproducir || reducido || hover || enfocado || !visible || oculto) return undefined
    const timer = window.setInterval(() => setIndice(index => (index + 1) % 3), 6500)
    return () => window.clearInterval(timer)
  }, [reproducir, reducido, hover, enfocado, visible, oculto])

  function ir(index) {
    if (!pantallaCompleta) setReproducir(false)
    setIndice((index + 3) % 3)
  }

  function inclinar(event) {
    if (reducido || event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--inclina-y', `${((event.clientX - rect.left) / rect.width - .5) * 7}deg`)
    event.currentTarget.style.setProperty('--inclina-x', `${(.5 - (event.clientY - rect.top) / rect.height) * 5}deg`)
  }

  return (
    <section ref={root} className={`inicio-carrusel${compacto ? ' compacto' : ''}${pantallaCompleta ? ' pantalla-completa' : ''}${soloFotos ? ' solo-fotos' : ''}`} data-slide={indice} aria-roledescription="carrusel" aria-label={soloFotos ? 'Fotografías de atención médica' : 'Descubre tu espacio en DocTop'}
      onMouseEnter={() => { if (!pantallaCompleta) setHover(true) }} onMouseLeave={() => setHover(false)}
      onFocusCapture={() => setEnfocado(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setEnfocado(false) }}>
      <div className="carrusel-escena" tabIndex={0} aria-label="Fotografías. Usa las flechas para cambiar de imagen."
        onKeyDown={event => { if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); ir(indice + (event.key === 'ArrowRight' ? 1 : -1)) } }}
        onPointerMove={inclinar} onPointerLeave={event => { event.currentTarget.style.setProperty('--inclina-x', '0deg'); event.currentTarget.style.setProperty('--inclina-y', '0deg') }}
        onPointerDown={event => { if (event.pointerType === 'touch') inicioToque.current = event.clientX }}
        onPointerUp={event => { if (event.pointerType !== 'touch' || inicioToque.current === null) return; const diff = event.clientX - inicioToque.current; inicioToque.current = null; if (Math.abs(diff) > 45) ir(indice + (diff < 0 ? 1 : -1)) }}
        onPointerCancel={() => { inicioToque.current = null }}>
        <div className="carrusel-pila" id={`${id}-fotos`}>
          {FOTOS.map((foto, index) => {
            const offset = (index - indice + 3) % 3
            return <div key={foto.src} className="carrusel-foto" data-posicion={offset === 2 ? -1 : offset} aria-hidden={index !== indice}>
              <img src={foto.src} alt={foto.alt} style={{ objectPosition: foto.position }} loading={index === 0 ? 'eager' : 'lazy'} draggable="false" />
              <span className="carrusel-foto-nota">Personas que cuidan de personas.</span>
            </div>
          })}
        </div>
        <div className="carrusel-etiqueta" aria-hidden="true"><span>DocTop</span><span>Tu salud, más cerca</span></div>
      </div>
      <div className="carrusel-contenido">
        {!soloFotos && <>
        <div className="carrusel-texto" aria-live={reproducir && !reducido ? 'off' : 'polite'} aria-atomic="true">
          <div key={`${indice}-copy`} className="carrusel-copy">
            <span className="carrusel-kicker">{actual[0]}</span>
            <Titulo>{titulo}</Titulo><p>{actual[2]}</p>
          </div>
        </div>
        {pantallaCompleta ? <>
          <div className="carrusel-acciones">
            <Link className="carrusel-boton-principal" to={actual[3]}>{actual[4]}<Icono nombre="right" size={18} /></Link>
            <Link className="carrusel-boton-secundario" to={indice === 2 ? '/registro/paciente' : '/registro/profesional'}>{indice === 2 ? 'Busco un especialista' : 'Soy profesional'}<Icono nombre="up-right" size={16} /></Link>
          </div>
          <div className="carrusel-confianza"><span>Profesionales verificados</span><span>Chat, llamada o video</span><span>Pago directo por QR</span></div>
        </> : <Link className="carrusel-enlace" to={actual[3]}>{actual[4]}<Icono nombre="up-right" size={17} /></Link>}
        </>}
        <div className="carrusel-controles" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          <div className="carrusel-puntos" aria-label="Elegir diapositiva">
            {contenido.map((item, index) => <button type="button" key={item[0]} aria-label={`Diapositiva ${index + 1}: ${item[0]}`} aria-current={indice === index ? 'true' : undefined} aria-controls={`${id}-fotos`} onClick={() => ir(index)}><span /></button>)}
          </div>
          <span className="carrusel-contador" aria-hidden="true">0{indice + 1} / 03</span>
          {!reducido && <button type="button" className="carrusel-control" aria-label={reproducir ? 'Pausar carrusel' : 'Activar avance automático'} onClick={() => { setReproducir(value => !value); setEnfocado(false); setHover(false) }}><Icono nombre={reproducir ? 'pause' : 'play'} size={15} /></button>}
          <button type="button" className="carrusel-control" aria-label="Diapositiva anterior" onClick={() => ir(indice - 1)}><Icono nombre="chevron-left" size={18} /></button>
          <button type="button" className="carrusel-control" aria-label="Diapositiva siguiente" onClick={() => ir(indice + 1)}><Icono nombre="chevron-right" size={18} /></button>
        </div>
      </div>
    </section>
  )
}
