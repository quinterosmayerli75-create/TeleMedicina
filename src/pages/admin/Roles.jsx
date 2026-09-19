import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../../firebase/config'

export default function Roles() {
  const [admins, setAdmins] = useState([])

  useEffect(() => {
    const q = query(collection(db, 'usuarios'), where('rol', '==', 'administrador'))
    const unsubscribe = onSnapshot(q, (snap) => setAdmins(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
    return unsubscribe
  }, [])

  return (
    <div>
      <h1 className="web-h1">Permisos por rol</h1>
      <div className="web-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 1100 }}>
        <div className="card-plain">
          <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Paciente</div>
          <div className="chip-row">
            <div className="chip on">Ver doctores</div><div className="chip on">Mensajes</div>
            <div className="chip on">Calificar</div><div className="chip on">Denunciar</div>
          </div>
        </div>
        <div className="card-plain">
          <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Doctor</div>
          <div className="chip-row">
            <div className="chip on">Editar perfil</div><div className="chip on">Trabajos</div>
            <div className="chip on">Horario</div><div className="chip on">Denunciar</div>
          </div>
        </div>
        <div className="card-plain">
          <div style={{ fontWeight: 600, fontSize: 12.5, marginBottom: 6 }}>Administrador</div>
          <div className="chip-row">
            <div className="chip on">Aprobar registros</div><div className="chip on">Bloquear</div>
            <div className="chip on">Categorías</div><div className="chip on">Denuncias</div>
          </div>
        </div>
      </div>

      <h2 className="section-title">Administradores con acceso</h2>
      <div className="card-plain" style={{ maxWidth: 640 }}>
        {admins.map((a) => (
          <div className="admin-row" key={a.id}>
            <div style={{ fontSize: 12 }}>{a.email}</div>
            <span className="status-pill status-active">Activo</span>
          </div>
        ))}
        {admins.length === 0 && <p className="web-sub" style={{ marginBottom: 0 }}>No hay administradores registrados aún.</p>}
      </div>
    </div>
  )
}
