import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLlamadaEntrante } from '../hooks/useLlamadaEntrante'

// Aviso fijo arriba de la pantalla cuando alguien llama y la persona no tiene ese chat abierto.
// Al tocar "Ver" se abre esa conversación, donde ChatVentana ya sabe mostrar la pantalla de llamada.
export default function LlamadaEntranteBanner({ base }) {
  const navigate = useNavigate()
  const { usuario } = useAuth()
  const entrante = useLlamadaEntrante(usuario?.uid)

  if (!entrante) return null

  return (
    <div className="llamada-banner" onClick={() => navigate(`${base}/mensajes/${entrante.llamanteId}`)}>
      <span>{entrante.tipo === 'video' ? '🎥' : '📞'} {entrante.nombre} te está llamando…</span>
      <button type="button" className="btn btn-ok btn-auto">Ver</button>
    </div>
  )
}
