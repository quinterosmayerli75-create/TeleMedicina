// Genera el currículum en PDF de un doctor (datos de "usuarios" + "profesionales") y lo descarga.
// jsPDF se carga bajo demanda (import dinámico) para no engordar el bundle inicial.
//
// Las fotos (perfil, título y carnet) viven en Firebase Storage. Para incrustarlas en el PDF el
// navegador tiene que poder leer sus píxeles, y eso exige que el bucket tenga CORS configurado
// (ver README, sección "CORS de Firebase Storage"). Si una foto no se puede leer, el PDF se
// genera igual y la función devuelve la lista de fotos omitidas para avisarle al usuario.

import { obtenerDocumentosEtiquetados } from './documentosDoctor'

const ONYX = [15, 20, 23]
const ORO = [44, 143, 214]
const ORO_CLARO = [138, 208, 245]
const GRIS = [110, 120, 128]
const TEXTO = [16, 21, 26]
const LINEA = [220, 232, 240]
const FONDO_LATERAL = [238, 244, 249]

const PAGINA_ANCHO = 210
const PAGINA_ALTO = 297
const MARGEN = 14
const LATERAL_ANCHO = 66
const LATERAL_TEXTO_ANCHO = LATERAL_ANCHO - MARGEN - 6
const X_PRINCIPAL = LATERAL_ANCHO + 10
const PRINCIPAL_ANCHO = PAGINA_ANCHO - X_PRINCIPAL - MARGEN
const CABECERA_ALTO = 52
const LIMITE_Y = 278
const MAX_LADO_IMAGEN = 1400
const TIEMPO_MAX_IMAGEN_MS = 15000

const MODALIDADES = ['Chat de texto', 'Llamada de voz', 'Videollamada']

function cargarImagen(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    const temporizador = setTimeout(() => reject(new Error('Tiempo agotado al cargar la imagen')), TIEMPO_MAX_IMAGEN_MS)

    img.onload = () => {
      clearTimeout(temporizador)
      try {
        const escala = Math.min(1, MAX_LADO_IMAGEN / Math.max(img.naturalWidth, img.naturalHeight))
        const ancho = Math.max(1, Math.round(img.naturalWidth * escala))
        const alto = Math.max(1, Math.round(img.naturalHeight * escala))
        const lienzo = document.createElement('canvas')
        lienzo.width = ancho
        lienzo.height = alto
        const ctx = lienzo.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, ancho, alto)
        ctx.drawImage(img, 0, 0, ancho, alto)
        // toDataURL lanza SecurityError si el bucket no tiene CORS (lienzo "contaminado").
        resolve({ datos: lienzo.toDataURL('image/jpeg', 0.85), ancho, alto })
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => {
      clearTimeout(temporizador)
      reject(new Error('No se pudo cargar la imagen'))
    }
    img.src = url
  })
}

function nombreArchivo(nombre) {
  const limpio = String(nombre ?? 'doctor')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `Curriculum-${limpio || 'doctor'}.pdf`
}

function iniciales(nombre) {
  const partes = String(nombre ?? '').replace(/^(dr\.?|dra\.?)\s+/i, '').split(/\s+/).filter(Boolean)
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase() || 'DT'
}

/**
 * @param {object} doctor  Documento de "usuarios" con `profesional` (documento de "profesionales").
 * @returns {Promise<{omitidas: string[]}>} Fotos que no se pudieron incrustar en el PDF.
 */
export async function descargarCurriculumDoctor(doctor) {
  const { jsPDF } = await import('jspdf')
  const prof = doctor.profesional ?? {}
  const omitidas = []
  // Enlaces de las fotos que no se pudieron incrustar: van escritos (clicables) en el PDF para que
  // quien lo lea igual pueda abrir cada foto aunque el bucket aún no tenga CORS.
  const enlaces = []

  // 1) Fotos: perfil + documentos de verificación (título / carnet).
  const [foto, ...documentos] = await Promise.all([
    doctor.fotoUrl
      ? cargarImagen(doctor.fotoUrl).catch(() => {
          omitidas.push('Foto de perfil')
          enlaces.push({ etiqueta: 'Foto de perfil', url: doctor.fotoUrl })
          return null
        })
      : null,
    ...obtenerDocumentosEtiquetados(prof).map(({ url, etiqueta }) => {
      return cargarImagen(url)
        .then((imagen) => ({ imagen, etiqueta }))
        .catch(() => {
          omitidas.push(etiqueta)
          enlaces.push({ etiqueta, url })
          return null
        })
    }),
  ])
  const documentosOk = documentos.filter(Boolean)

  // 2) Documento.
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })

  const fondoLateral = (desdeY) => {
    pdf.setFillColor(...FONDO_LATERAL)
    pdf.rect(0, desdeY, LATERAL_ANCHO, PAGINA_ALTO - desdeY, 'F')
  }

  const titulo = (texto, x, y, ancho) => {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(...ORO)
    pdf.text(texto.toUpperCase(), x, y, { charSpace: 0.5 })
    pdf.setDrawColor(...LINEA)
    pdf.setLineWidth(0.3)
    pdf.line(x, y + 2, x + ancho, y + 2)
    return y + 9
  }

  // Cabecera oscura con foto (o iniciales), nombre y especialidad.
  pdf.setFillColor(...ONYX)
  pdf.rect(0, 0, PAGINA_ANCHO, CABECERA_ALTO, 'F')
  pdf.setFillColor(...ORO)
  pdf.rect(0, CABECERA_ALTO, PAGINA_ANCHO, 1.5, 'F')
  fondoLateral(CABECERA_ALTO + 1.5)

  const FOTO = 32
  const fotoX = MARGEN
  const fotoY = (CABECERA_ALTO - FOTO) / 2
  if (foto) {
    // Recorte cuadrado centrado, para que la foto de perfil no se deforme en el marco.
    const recorte = document.createElement('canvas')
    recorte.width = 400
    recorte.height = 400
    const rctx = recorte.getContext('2d')
    const origen = new Image()
    origen.src = foto.datos
    await new Promise((resolver) => {
      origen.onload = resolver
      origen.onerror = resolver
    })
    const lado = Math.min(foto.ancho, foto.alto)
    rctx.drawImage(origen, (foto.ancho - lado) / 2, (foto.alto - lado) / 2, lado, lado, 0, 0, 400, 400)
    pdf.addImage(recorte.toDataURL('image/jpeg', 0.9), 'JPEG', fotoX, fotoY, FOTO, FOTO)
    pdf.setDrawColor(...ORO)
    pdf.setLineWidth(0.8)
    pdf.rect(fotoX, fotoY, FOTO, FOTO)
  } else {
    pdf.setFillColor(...ORO)
    pdf.circle(fotoX + FOTO / 2, fotoY + FOTO / 2, FOTO / 2, 'F')
    pdf.setFont('times', 'bold')
    pdf.setFontSize(22)
    pdf.setTextColor(255, 255, 255)
    pdf.text(iniciales(doctor.nombre), fotoX + FOTO / 2, fotoY + FOTO / 2 + 3.6, { align: 'center' })
  }

  const xNombre = fotoX + FOTO + 10
  const anchoNombre = PAGINA_ANCHO - xNombre - MARGEN
  pdf.setFont('times', 'bold')
  pdf.setFontSize(22)
  let lineasNombre = pdf.splitTextToSize(doctor.nombre ?? 'Doctor', anchoNombre)
  if (lineasNombre.length > 1) {
    pdf.setFontSize(17)
    lineasNombre = pdf.splitTextToSize(doctor.nombre ?? 'Doctor', anchoNombre)
  }
  const altoLineaNombre = lineasNombre.length > 1 ? 7.5 : 9
  let yCab = fotoY + 10 - (lineasNombre.length - 1) * 3.5
  pdf.setTextColor(255, 255, 255)
  lineasNombre.slice(0, 2).forEach((linea, i) => pdf.text(linea, xNombre, yCab + i * altoLineaNombre))
  yCab += Math.min(lineasNombre.length, 2) * altoLineaNombre + 1

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11.5)
  pdf.setTextColor(...ORO_CLARO)
  const subtitulo = [prof.profesion, prof.especialidad].filter(Boolean).join('  ·  ')
  if (subtitulo) pdf.text(subtitulo, xNombre, yCab + 1)
  if (prof.verificado) {
    pdf.setFontSize(9)
    pdf.setTextColor(174, 183, 188)
    pdf.text('Profesional verificado por DocTop', xNombre, yCab + 8)
  }

  // Columna lateral: contacto y datos.
  let yLat = CABECERA_ALTO + 15
  const xLat = MARGEN

  const datoLateral = (etiqueta, valor) => {
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(7.5)
    pdf.setTextColor(...GRIS)
    pdf.text(etiqueta.toUpperCase(), xLat, yLat, { charSpace: 0.3 })
    yLat += 4.5
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9.5)
    pdf.setTextColor(...TEXTO)
    const lineas = pdf.splitTextToSize(String(valor || '—'), LATERAL_TEXTO_ANCHO)
    pdf.text(lineas, xLat, yLat)
    yLat += lineas.length * 4.6 + 3.5
  }

  yLat = titulo('Contacto', xLat, yLat, LATERAL_TEXTO_ANCHO)
  datoLateral('Correo', doctor.email)
  datoLateral('Celular', doctor.telefono)

  yLat += 3
  yLat = titulo('Datos profesionales', xLat, yLat, LATERAL_TEXTO_ANCHO)
  datoLateral('Carnet profesional', prof.carnet)
  datoLateral('Costo de consulta', prof.costoConsulta !== undefined && prof.costoConsulta !== '' ? `Bs ${prof.costoConsulta}` : '')
  const nota = Number(prof.calificacionPromedio) || 0
  datoLateral('Calificación', nota > 0 ? `${nota.toFixed(1)} / 5` : 'Sin calificaciones aún')

  yLat += 3
  yLat = titulo('Modalidades', xLat, yLat, LATERAL_TEXTO_ANCHO)
  const activas = MODALIDADES.filter((_, i) => prof.modalidades?.[i])
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor(...TEXTO)
  if (activas.length === 0) {
    pdf.text('No especificadas', xLat, yLat)
  } else {
    activas.forEach((m) => {
      pdf.text(`•  ${m}`, xLat, yLat)
      yLat += 5.2
    })
  }

  // Columna principal: perfil, experiencia, especialidad. Fluye a páginas nuevas si hace falta.
  let yMain = CABECERA_ALTO + 15
  const nuevaPaginaCurriculum = () => {
    pdf.addPage()
    fondoLateral(0)
    yMain = 20
  }
  const parrafo = (texto, { negrita = false, tamano = 10.5, color = TEXTO } = {}) => {
    pdf.setFont('helvetica', negrita ? 'bold' : 'normal')
    pdf.setFontSize(tamano)
    pdf.setTextColor(...color)
    const alto = tamano * 0.5
    pdf.splitTextToSize(String(texto || '—'), PRINCIPAL_ANCHO).forEach((linea) => {
      if (yMain + alto > LIMITE_Y) nuevaPaginaCurriculum()
      pdf.text(linea, X_PRINCIPAL, yMain)
      yMain += alto
    })
    yMain += 2
  }
  const seccion = (texto) => {
    if (yMain + 20 > LIMITE_Y) nuevaPaginaCurriculum()
    yMain = titulo(texto, X_PRINCIPAL, yMain, PRINCIPAL_ANCHO)
  }

  seccion('Perfil profesional')
  parrafo(prof.descripcion || 'Sin descripción.')
  yMain += 5

  seccion('Experiencia')
  parrafo(prof.experiencia || 'No especificada.')
  yMain += 5

  seccion('Especialidad')
  parrafo(prof.profesion || '—', { negrita: true })
  parrafo(prof.especialidad || '—', { color: GRIS })

  if (prof.notaEstado) {
    yMain += 5
    seccion('Nota de estado')
    parrafo(prof.notaEstado)
  }

  if (documentosOk.length > 0 || enlaces.length > 0) {
    yMain += 5
    seccion('Documentos de respaldo')
    if (documentosOk.length > 0) {
      parrafo(`Se adjuntan ${documentosOk.length} documento${documentosOk.length === 1 ? '' : 's'} en las páginas siguientes.`, { color: GRIS })
    }
    if (enlaces.length > 0) {
      parrafo('Estas fotos no se pudieron incrustar; se abren con el enlace:', { color: GRIS })
      enlaces.forEach(({ etiqueta, url }) => {
        if (yMain + 6 > LIMITE_Y) nuevaPaginaCurriculum()
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(10)
        pdf.setTextColor(...ORO)
        pdf.textWithLink(`•  ${etiqueta} (abrir foto)`, X_PRINCIPAL, yMain, { url })
        yMain += 6
      })
    }
  }

  // Páginas de documentos (título, carnet): dos por fila.
  if (documentosOk.length > 0) {
    const ancho = (PAGINA_ANCHO - MARGEN * 2 - 6) / 2
    const altoMax = 112
    let y = 0
    const paginaDocumentos = () => {
      pdf.addPage()
      pdf.setFillColor(...ONYX)
      pdf.rect(0, 0, PAGINA_ANCHO, 24, 'F')
      pdf.setFillColor(...ORO)
      pdf.rect(0, 24, PAGINA_ANCHO, 1.2, 'F')
      pdf.setFont('times', 'bold')
      pdf.setFontSize(15)
      pdf.setTextColor(255, 255, 255)
      pdf.text('Documentos de respaldo', MARGEN, 15)
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9.5)
      pdf.setTextColor(...ORO_CLARO)
      pdf.text(String(doctor.nombre ?? ''), PAGINA_ANCHO - MARGEN, 15, { align: 'right' })
      y = 36
    }
    paginaDocumentos()

    let altoFila = 0
    documentosOk.forEach(({ imagen, etiqueta }, i) => {
      const columna = i % 2
      if (columna === 0 && i > 0) {
        y += altoFila + 16
        altoFila = 0
      }
      if (y + altoMax + 12 > LIMITE_Y) {
        paginaDocumentos()
        altoFila = 0
      }
      const escala = Math.min(ancho / imagen.ancho, altoMax / imagen.alto)
      const w = imagen.ancho * escala
      const h = imagen.alto * escala
      const x = MARGEN + columna * (ancho + 6)
      pdf.addImage(imagen.datos, 'JPEG', x, y, w, h)
      pdf.setDrawColor(...LINEA)
      pdf.setLineWidth(0.4)
      pdf.rect(x, y, w, h)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(9)
      pdf.setTextColor(...TEXTO)
      pdf.text(etiqueta, x, y + h + 5.5)
      altoFila = Math.max(altoFila, h)
    })
  }

  // Pie de página en todas las hojas.
  const totalPaginas = pdf.getNumberOfPages()
  const fecha = new Date().toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  for (let p = 1; p <= totalPaginas; p += 1) {
    pdf.setPage(p)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...GRIS)
    pdf.text(`Currículum generado desde DocTop · ${fecha}`, MARGEN, PAGINA_ALTO - 8)
    pdf.text(`Página ${p} de ${totalPaginas}`, PAGINA_ANCHO - MARGEN, PAGINA_ALTO - 8, { align: 'right' })
  }

  pdf.save(nombreArchivo(doctor.nombre))
  return { omitidas }
}
