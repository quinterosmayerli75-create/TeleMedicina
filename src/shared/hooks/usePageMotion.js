import { useEffect, useRef } from 'react'

// El contenido es visible por defecto; solo se anima si el navegador lo permite.
export function usePageMotion(contentVersion = 0) {
  const rootRef = useRef(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root || !('IntersectionObserver' in window)) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    let observer
    const elements = Array.from(root.querySelectorAll('[data-motion-item]'))
    const showAll = () => elements.forEach(element => element.setAttribute('data-revealed', 'true'))

    function setup() {
      observer?.disconnect()
      if (preference.matches) {
        showAll()
        return
      }
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.12) {
            entry.target.setAttribute('data-revealed', 'true')
          } else if (!entry.isIntersecting && !entry.target.contains(document.activeElement)) {
            // Al salir, desplazar hacia fuera evita oscilaciones en el borde de la ventana.
            entry.target.style.setProperty('--motion-y', entry.boundingClientRect.bottom <= 0 ? '-32px' : '32px')
            entry.target.setAttribute('data-revealed', 'false')
          }
        })
      }, { threshold: [0, 0.12], rootMargin: '0px' })
      elements.forEach(element => {
        const rect = element.getBoundingClientRect()
        element.style.setProperty('--motion-y', rect.bottom <= 0 ? '-32px' : '32px')
        element.setAttribute('data-revealed', 'false')
        observer.observe(element)
      })
    }

    function revealFocused(event) {
      event.target.closest('[data-motion-item]')?.setAttribute('data-revealed', 'true')
    }
    setup()
    preference.addEventListener('change', setup)
    root.addEventListener('focusin', revealFocused)
    return () => {
      observer?.disconnect()
      preference.removeEventListener('change', setup)
      root.removeEventListener('focusin', revealFocused)
      elements.forEach(element => { element.removeAttribute('data-revealed'); element.style.removeProperty('--motion-y') })
    }
  }, [contentVersion])

  return rootRef
}
