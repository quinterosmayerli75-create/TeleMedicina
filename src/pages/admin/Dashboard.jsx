import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'

const CONSULTAS = {
  doctoresActivos: query(collection(db, 'usuarios'), where('rol', '==', 'profesional'), where('estado', '==', 'activo')),
  pacientes: query(collection(db, 'usuarios'), where('rol', '==', 'paciente')),
  solicitudesPendientes: query(collection(db, 'usuarios'), where('rol', '==', 'profesional'), where('estado', '==', 'pendiente')),
  denunciasPendientes: query(collection(db, 'reportes'), where('estado', '==', 'pendiente')),
}

function useConteo(consulta) {
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const unsubscribe = onSnapshot(consulta, (snap) => setTotal(snap.size))
    return unsubscribe
  }, [consulta])

  return total
}

export default function Dashboard() {
  const doctoresActivos = useConteo(CONSULTAS.doctoresActivos)
  const pacientes = useConteo(CONSULTAS.pacientes)
  const solicitudesPendientes = useConteo(CONSULTAS.solicitudesPendientes)
  const denunciasPendientes = useConteo(CONSULTAS.denunciasPendientes)

  return (
    <div>
      <h1 className="web-h1">Dashboard y estadísticas</h1>
      <p className="web-sub">Vista general de la actividad de DocTop.</p>

      <div className="web-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="metric-card"><div className="metric-num">{doctoresActivos}</div><div className="metric-label">Doctores activos</div></div>
        <div className="metric-card"><div className="metric-num">{pacientes}</div><div className="metric-label">Pacientes registrados</div></div>
        <div className="metric-card"><div className="metric-num">{solicitudesPendientes}</div><div className="metric-label">Solicitudes pendientes</div></div>
        <div className="metric-card"><div className="metric-num">{denunciasPendientes}</div><div className="metric-label">Denuncias pendientes</div></div>
      </div>
    </div>
  )
}
