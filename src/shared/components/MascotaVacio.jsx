import panda from '@/assets/mascota/panda-doctor.png'

export default function MascotaVacio({ texto, tamano = 216 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '24px 12px', textAlign: 'center' }}>
      <img src={panda} alt="Mascota de DocTop" style={{ height: tamano, width: 'auto', maxWidth: '100%', objectFit: 'contain' }} />
      {texto && (
        <p className="web-sub" style={{ margin: 0, maxWidth: '36ch', fontSize: '1.125rem', lineHeight: 1.5 }}>
          {texto}
        </p>
      )}
    </div>
  )
}
