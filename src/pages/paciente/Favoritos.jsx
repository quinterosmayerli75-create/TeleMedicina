import { useProfesionalesActivos } from '../../hooks/useProfesionalesActivos'
import { useFavoritos } from '../../context/FavoritosContext'
import TarjetaDoctor from '../../components/TarjetaDoctor'

export default function Favoritos() {
  const { favoritos } = useFavoritos()
  const { profesionales, cargando } = useProfesionalesActivos()
  const doctores = profesionales.filter((p) => favoritos.includes(p.id))

  return (
    <div>
      <h1 className="web-h1">Mis doctores de confianza</h1>
      {cargando && <p className="web-sub">Cargando…</p>}
      {!cargando && doctores.length === 0 ? (
        <p className="web-sub">Aún no marcaste ningún profesional como favorito — toca el ♥ en su tarjeta para guardarlo aquí.</p>
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
