import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import saludo from '@/assets/mascota/poses/saludo.png'
import paso1 from '@/assets/mascota/poses/paso-1.png'
import paso2 from '@/assets/mascota/poses/paso-2.png'
import apunta from '@/assets/mascota/poses/apunta.png'
import './MascotaAnimada.css'

const ESCENAS = [
  { pose: 'saludo', imagenes: [saludo], de: 50, a: 50, tiempo: 1800 },
  { pose: 'paso', imagenes: [paso1, paso2], de: 50, a: 74, tiempo: 1750 },
  { pose: 'apunta', imagenes: [apunta], de: 74, a: 74, tiempo: 2000 },
  { pose: 'paso', imagenes: [paso1, paso2], de: 74, a: 26, tiempo: 3000, izquierda: true },
  { pose: 'apunta', imagenes: [apunta], de: 26, a: 26, tiempo: 2000, izquierda: true },
  { pose: 'paso', imagenes: [paso1, paso2], de: 26, a: 50, tiempo: 1550 },
]

export default function MascotaInicio() {
  const escenario = useRef(null)
  const [visible, setVisible] = useState(false)
  const [pausa, setPausa] = useState(false)
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    const observador = new IntersectionObserver(([entrada]) => setVisible(entrada.isIntersecting))
    observador.observe(escenario.current)
    return () => observador.disconnect()
  }, [])

  const escena = ESCENAS[indice]

  return (
    <section className="panda-inicio" aria-label="Crea tu cuenta o inicia sesión">
      <div className="panda-inicio-meta">
        <span>Conoce al panda de DocTop</span>
        <button className="panda-pausa" type="button" onClick={() => setPausa((actual) => !actual)}>
          {pausa ? 'Reanudar animación' : 'Pausar animación'}
        </button>
      </div>
      <div ref={escenario} className="panda-escenario" data-en-pausa={pausa || !visible}>
        <Link className="btn btn-primary btn-auto panda-accion panda-accion--registro" to="/registro">Regístrate</Link>
        <div
          className="panda-recorrido"
          key={indice}
          onAnimationEnd={(evento) => {
            if (evento.target === evento.currentTarget) setIndice((actual) => (actual + 1) % ESCENAS.length)
          }}
          style={{
            '--panda-desde': `${escena.de}%`,
            '--panda-hasta': `${escena.a}%`,
            '--panda-duracion': `${escena.tiempo}ms`,
          }}
          aria-hidden="true"
        >
          <div className={`panda-pose panda-pose--${escena.pose}`} data-izquierda={!!escena.izquierda}>
            {escena.imagenes.map((imagen, i) => (
              <img key={i} src={imagen} alt="" draggable="false" className={escena.imagenes.length > 1 ? 'panda-fotograma' : undefined}
                style={{ '--panda-fotograma': i }} />
            ))}
          </div>
        </div>
        <Link className="btn btn-outline btn-auto panda-accion panda-accion--acceso" to="/acceso">Iniciar sesión</Link>
      </div>
    </section>
  )
}
