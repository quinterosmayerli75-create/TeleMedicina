import { useNavigate } from 'react-router-dom'
import PaginaMensajes from '../../components/PaginaMensajes'

const TABS = [
  { clave: 'pacientes', etiqueta: 'Chats con pacientes', ruta: '/doctor/mensajes' },
  { clave: 'doctores', etiqueta: 'Chats con doctores', ruta: '/doctor/mensajes/doctores' },
]

export default function Mensajes() {
  const navigate = useNavigate()

  const tabs = (
    <div className="subtabs chat-tabs" role="tablist">
      {TABS.map((t) => (
        <button
          type="button"
          role="tab"
          key={t.clave}
          aria-selected={t.clave === 'pacientes'}
          className={`subtab${t.clave === 'pacientes' ? ' on' : ''}`}
          onClick={() => navigate(t.ruta)}
        >
          {t.etiqueta}
        </button>
      ))}
    </div>
  )

  return <PaginaMensajes rol="profesional" encabezadoLista={tabs} />
}
