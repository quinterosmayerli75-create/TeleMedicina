import { useEffect, useId } from 'react'
import pensando from '@/assets/mascota/poses/pensando.png'
import descanso from '@/assets/mascota/poses/descanso.png'
import salto from '@/assets/mascota/poses/salto.png'
import dePie from '@/assets/mascota/poses/saludo.png'
import './MascotaAnimada.css'

const DURACION_CELEBRACION = 1700

const POSES_PENSANDO = [
  {
    nombre: 'sentado',
    imagen: pensando,
    ancho: 223,
    alto: 300,
    partes: [
      { nombre: 'cabeza', origen: '101px 121px', contorno: 'M0 0H180V95Q173 112 150 123L144 135Q113 149 72 146Q40 144 20 129L0 103Z' },
    ],
  },
  {
    nombre: 'echado',
    imagen: descanso,
    ancho: 300,
    alto: 165,
    partes: [
      { nombre: 'cabeza', origen: '95px 106px', contorno: 'M0 0H117V22Q128 36 137 52Q154 76 139 99Q123 122 79 133L20 131L0 105Z' },
      { nombre: 'pies', origen: '251px 131px', contorno: 'M249 96H300V165H248Q263 148 251 128Z' },
    ],
  },
]

function PosePensando({ pose }) {
  const id = useId()
  const { nombre, imagen, ancho, alto, partes } = pose

  return (
    <div className={`panda-pensando-pose panda-pensando-pose--${nombre}`}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="xMidYMax meet" focusable="false">
        <defs>
          {partes.map(parte => <path key={parte.nombre} id={`${id}-${parte.nombre}`} d={parte.contorno} />)}
          <mask id={`${id}-cuerpo`} maskUnits="userSpaceOnUse" x="0" y="0" width={ancho} height={alto}>
            <rect width={ancho} height={alto} fill="white" />
            {partes.map(parte => <use key={parte.nombre} href={`#${id}-${parte.nombre}`} fill="black" />)}
          </mask>
          {partes.map(parte => (
            <mask key={parte.nombre} id={`${id}-recorte-${parte.nombre}`} maskUnits="userSpaceOnUse" x="0" y="0" width={ancho} height={alto}>
              <use href={`#${id}-${parte.nombre}`} fill="white" stroke="white" strokeWidth="8" />
            </mask>
          ))}
        </defs>
        <image href={imagen} width={ancho} height={alto} mask={`url(#${id}-cuerpo)`} />
        {partes.map(parte => (
          <g key={parte.nombre} className={`panda-pensando-${parte.nombre}`} style={{ transformOrigin: parte.origen }}>
            <image href={imagen} width={ancho} height={alto} mask={`url(#${id}-recorte-${parte.nombre})`} />
          </g>
        ))}
      </svg>
      <span className="panda-pensando-burbuja">···</span>
    </div>
  )
}


export default function MascotaRegistro({ completado = false, mensaje, onContinuar }) {
  useEffect(() => {
    if (!completado) return
    const movimientoReducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const temporizador = window.setTimeout(onContinuar, movimientoReducido ? 0 : DURACION_CELEBRACION)
    return () => window.clearTimeout(temporizador)
  }, [completado, onContinuar])

  if (!completado) {
    return (
      <div className="panda-pensando" aria-hidden="true">
        <div className="panda-pensando-escena">
          {POSES_PENSANDO.map(pose => <PosePensando key={pose.nombre} pose={pose} />)}
        </div>
      </div>
    )
  }

  return (
    <div className="registro-fondo panda-exito-fondo">
      <div className="panda-exito">
        <div className="panda-celebracion" aria-hidden="true">
          <img className="panda-despegar" src={pensando} alt="" />
          <img className="panda-levantarse" src={dePie} alt="" />
          <img className="panda-saltar" src={salto} alt="" />
        </div>
        <p role="status">{mensaje}</p>
      </div>
    </div>
  )
}

