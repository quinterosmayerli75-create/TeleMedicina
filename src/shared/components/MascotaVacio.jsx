import panda from '@/assets/mascota/panda-doctor.png'

// Mascota de DocTop (el panda doctor) para pantallas vacías o mensajes de éxito/error — le da
// identidad propia a la app en vez de solo un texto gris. `texto` es el mensaje que acompaña a
// la imagen; `tamano` controla qué tan grande se ve (más chico para espacios reducidos).
export default function MascotaVacio({ texto, tamano = 96 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '24px 0', textAlign: 'center' }}>
      <img src={panda} alt="Mascota de DocTop" style={{ width: tamano, height: tamano, objectFit: 'contain' }} />
      {texto && <p className="web-sub" style={{ margin: 0, maxWidth: 320 }}>{texto}</p>}
    </div>
  )
}
