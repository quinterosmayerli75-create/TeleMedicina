import { useProfesionalesActivos } from '../hooks/useProfesionalesActivos'
import { useFavoritos } from '../context/FavoritosContext'
import TarjetaDoctor from '../components/TarjetaDoctor'
import MascotaVacio from '@/shared/components/MascotaVacio'

export default function Favoritos() {
  const { favoritos } = useFavoritos()
  const { profesionales, cargando } = useProfesionalesActivos()
  const doctores = profesionales.filter((p) => favoritos.includes(p.id))

  return (
    <div>
      <div className="admin-eyebrow">
        RED MÉDICA DE CONFIANZA
        <span className="vivo"><span className="punto" /> Sincronización en vivo</span>
      </div>
      <h1 className="web-h1">Mis doctores de confianza</h1>
      {cargando && <p className="web-sub">Cargando…</p>}
      {!cargando && doctores.length === 0 ? (
        <MascotaVacio texto="Aún no marcaste ningún profesional como favorito — toca el ♥ en su tarjeta para guardarlo aquí." />
      ) : (
        <div className="web-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: 20 }}>
          {doctores.map((doctor) => (
            <TarjetaDoctor key={doctor.id} doctor={doctor} />
          ))}
        </div>
      )}
    </div>
  )
}
