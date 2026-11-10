import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import paso1 from '@/assets/mascota/poses/paso-1.png'
import paso2 from '@/assets/mascota/poses/paso-2.png'
import tropiezo from '@/assets/mascota/poses/tropiezo.png'
import salto from '@/assets/mascota/poses/salto.png'
import './MascotaAnimada.css'

export default function MascotaViajera() {
  const [caida, setCaida] = useState('pendiente')

  useEffect(() => {
    if (caida !== 'pendiente') return

    const movimiento = window.matchMedia('(prefers-reduced-motion: reduce)')
    let anterior = Math.max(0, window.scrollY)
    let descenso = 0

    function detectarDescenso() {
      const posicion = Math.max(0, window.scrollY)
      const delta = posicion - anterior
      anterior = posicion
      descenso = delta > 0 ? descenso + delta : 0
      if (descenso >= 36 && !movimiento.matches) setCaida('activa')
    }

    window.addEventListener('scroll', detectarDescenso, { passive: true })
    return () => window.removeEventListener('scroll', detectarDescenso)
  }, [caida])

  return createPortal(
    <div className="panda-viajera" aria-hidden="true">
      <div className="panda-circuito">
        <div className="panda-orientacion" data-caida={caida === 'activa'}>
          <div className="panda-carrera">
            <div className="panda-pose panda-pose--paso">
              <img className="panda-fotograma" style={{ '--panda-fotograma': 0 }} src={paso1} alt="" />
              <img className="panda-fotograma" style={{ '--panda-fotograma': 1 }} src={paso2} alt="" />
            </div>
          </div>
          <div className="panda-trepa">
            <span className="panda-cuerda" />
            <img src={salto} alt="" />
          </div>
          {caida === 'activa' && (
            <img className="panda-tropiezo" src={tropiezo} alt="" onAnimationEnd={() => setCaida('terminada')} />
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
