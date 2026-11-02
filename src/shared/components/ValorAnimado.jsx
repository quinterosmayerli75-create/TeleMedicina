import { useEffect, useMemo, useRef } from 'react'

export default function ValorAnimado({ valor, prefijo = '', sufijo = '', decimales = 0 }) {
  const ref = useRef(null)
  const anterior = useRef(0)
  const numero = Number(valor)
  const objetivo = Number.isFinite(numero) ? numero : 0
  const formato = useMemo(() => new Intl.NumberFormat('es-BO', { minimumFractionDigits: decimales, maximumFractionDigits: decimales }), [decimales])
  const final = `${prefijo}${formato.format(objetivo)}${sufijo}`

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let frame
    let observer
    const escribir = value => {
      anterior.current = value
      node.textContent = `${prefijo}${formato.format(value)}${sufijo}`
    }
    function comenzar() {
      observer?.disconnect()
      if (preference.matches) { escribir(objetivo); return }
      const desde = anterior.current
      const comienzo = performance.now()
      function avanzar(ahora) {
        const progreso = Math.min(1, (ahora - comienzo) / 1100)
        escribir(desde + (objetivo - desde) * (1 - Math.pow(1 - progreso, 3)))
        if (progreso < 1) frame = requestAnimationFrame(avanzar)
        else escribir(objetivo)
      }
      frame = requestAnimationFrame(avanzar)
    }
    function preferencia(event) {
      if (event.matches) { cancelAnimationFrame(frame); observer?.disconnect(); escribir(objetivo) }
    }
    escribir(anterior.current)
    if (preference.matches || !('IntersectionObserver' in window)) escribir(objetivo)
    else {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) comenzar()
      }, { threshold: .15 })
      observer.observe(node)
    }
    preference.addEventListener('change', preferencia)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      preference.removeEventListener('change', preferencia)
    }
  }, [objetivo, prefijo, sufijo, formato])

  return <span className="valor-animado"><span className="valor-lectura">{final}</span><span ref={ref} aria-hidden="true">{final}</span></span>
}
