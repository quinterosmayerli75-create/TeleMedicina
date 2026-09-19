import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase/config'
import { useAuth } from '../../context/AuthContext'

export default function MiPerfil() {
  const { usuario } = useAuth()
  const [datos, setDatos] = useState(null)

  useEffect(() => {
    if (!usuario) return
    getDoc(doc(db, 'usuarios', usuario.uid)).then((snap) => {
      if (snap.exists()) setDatos(snap.data())
    })
  }, [usuario])

  if (!datos) return <p className="web-sub">Cargando…</p>

  return (
    <div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'center', marginBottom: 20 }}>
        {datos.fotoUrl ? (
          <img src={datos.fotoUrl} alt={datos.nombre} style={{ width: 80, height: 80, borderRadius: 6, objectFit: 'cover', border: '2px solid var(--oro)' }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: 6, background: 'var(--marfil-osc)' }} />
        )}
        <div>
          <div className="web-h1" style={{ marginBottom: 0 }}>{datos.nombre} {datos.apellido}</div>
          <div className="web-sub" style={{ marginBottom: 0 }}>Paciente</div>
        </div>
      </div>

      <div className="card-plain" style={{ maxWidth: 520 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 12.5 }}>
          <div><div style={{ color: 'var(--gris)' }}>Edad</div><div>{datos.edad ?? '—'} años</div></div>
          <div><div style={{ color: 'var(--gris)' }}>Sexo</div><div>{datos.sexo ?? '—'}</div></div>
          <div><div style={{ color: 'var(--gris)' }}>Estatura aprox.</div><div>{datos.estatura || '—'}</div></div>
          <div><div style={{ color: 'var(--gris)' }}>Peso aprox.</div><div>{datos.peso || '—'}</div></div>
          <div><div style={{ color: 'var(--gris)' }}>Celular</div><div style={{ fontFamily: 'var(--mono)' }}>{datos.telefono || '—'}</div></div>
          <div><div style={{ color: 'var(--gris)' }}>Lugar donde vive</div><div>{datos.lugar || '—'}</div></div>
        </div>
      </div>
      <Link to="/paciente/configuracion" className="btn btn-outline btn-auto">Editar mis datos</Link>
    </div>
  )
}
