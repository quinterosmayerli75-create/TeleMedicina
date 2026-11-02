import { useState } from 'react'

const MODALIDADES = [
  { id: 'video', nombre: 'Videollamada', titulo: 'Una conversación cara a cara.', texto: 'Habla con tu profesional desde un lugar cómodo para ti.' },
  { id: 'chat', nombre: 'Chat', titulo: 'Tus dudas, con tus palabras.', texto: 'Conversa por mensajes durante tu consulta.' },
  { id: 'voz', nombre: 'Llamada', titulo: 'Una voz que te escucha.', texto: 'Conecta por voz, sin necesidad de encender la cámara.' },
]

export default function ModalidadesConsulta() {
  const [seleccion, setSeleccion] = useState(0)
  const modalidad = MODALIDADES[seleccion]

  function navegar(event, index) {
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % MODALIDADES.length
    else if (event.key === 'ArrowLeft') next = (index + MODALIDADES.length - 1) % MODALIDADES.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = MODALIDADES.length - 1
    else return
    event.preventDefault()
    setSeleccion(next)
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus()
  }

  return (
    <div className="landing-modalidades">
      <div role="tablist" aria-label="Elige cómo conversar" className="landing-modalidades-tabs">
        {MODALIDADES.map((item, index) => (
          <button key={item.id} type="button" role="tab" id={`modalidad-${item.id}`}
            aria-selected={seleccion === index} aria-controls="modalidad-contenido"
            tabIndex={seleccion === index ? 0 : -1}
            onClick={() => setSeleccion(index)} onKeyDown={event => navegar(event, index)}>
            {item.nombre}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="modalidad-contenido" aria-labelledby={`modalidad-${modalidad.id}`} tabIndex={0}>
        <div className="landing-modalidad-copy" key={modalidad.id}>
          <strong>{modalidad.titulo}</strong>
          <p>{modalidad.texto}</p>
        </div>
      </div>
    </div>
  )
}
