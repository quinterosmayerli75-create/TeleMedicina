import { useMemo, useState } from 'react'
import VisorImagen from './VisorImagen'
import { obtenerDocumentosEtiquetados } from '../utils/documentosDoctor'
import { descargarCurriculumDoctor } from '../utils/curriculumDoctorPdf'

// Fotos que subió el doctor al registrarse (perfil, títulos y carnet) para el panel de administración:
// miniaturas grandes que se abren en el visor, y el botón para bajar su currículum en PDF, que
// incluye esas mismas fotos. `doctor` es el documento de "usuarios" con `profesional` adjunto.
export default function FotosDoctorAdmin({ doctor, conPdf = true }) {
  const [visor, setVisor] = useState(null)
  const [generando, setGenerando] = useState(false)
  const [aviso, setAviso] = useState('')

  const fotos = useMemo(() => {
    const lista = []
    if (doctor?.fotoUrl) lista.push({ url: doctor.fotoUrl, etiqueta: 'Foto de perfil' })
    return [...lista, ...obtenerDocumentosEtiquetados(doctor?.profesional)]
  }, [doctor])

  async function descargarPdf() {
    setAviso('')
    setGenerando(true)
    try {
      const { omitidas } = await descargarCurriculumDoctor(doctor)
      if (omitidas.length > 0) {
        setAviso(
          `El PDF se descargó, pero estas fotos no se pudieron incrustar: ${omitidas.join(', ')}. ` +
          'En el PDF quedaron como enlaces. Para incrustarlas hay que configurar CORS en Firebase Storage (ver README).'
        )
      }
    } catch {
      setAviso('No se pudo generar el PDF. Intenta de nuevo.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div style={{ marginTop: 14 }} data-testid="fotos-doctor-admin">
      <div style={{ color: 'var(--gris)', fontSize: 13, marginBottom: 6 }}>
        Fotos que subió el doctor {fotos.length > 0 && `(${fotos.length})`}
      </div>

      {fotos.length === 0 ? (
        <div className="registro-error" style={{ marginTop: 0 }}>Este doctor no subió ninguna foto.</div>
      ) : (
        <div className="titulos-grid">
          {fotos.map((foto, i) => (
            <button type="button" className="titulo-thumb" key={foto.url} onClick={() => setVisor(i)} title="Ver en grande">
              <img src={foto.url} alt={foto.etiqueta} />
              {foto.etiqueta}
            </button>
          ))}
        </div>
      )}

      {conPdf && (
        <div style={{ marginTop: 12 }}>
          <button type="button" className="btn btn-outline btn-auto" onClick={descargarPdf} disabled={generando}>
            {generando ? 'Generando PDF…' : 'Descargar PDF con fotos'}
          </button>
        </div>
      )}
      {aviso && <div className="registro-error" style={{ marginTop: 12 }}>{aviso}</div>}

      {visor !== null && (
        <VisorImagen imagenes={fotos} indice={visor} onCerrar={() => setVisor(null)} onCambiar={setVisor} />
      )}
    </div>
  )
}
