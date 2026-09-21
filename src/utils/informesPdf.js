// PDF de informes médicos: uno solo, o varios juntos (los de la lista ya filtrada por nombre y fechas).
// jsPDF se carga bajo demanda para no engordar el bundle inicial.
import { formatearFecha } from './fechas'
import { CAMPOS_INFORME, normalizarTexto } from './informes'

const ONYX = [15, 20, 23]
const AZUL = [44, 143, 214]
const GRIS = [110, 120, 128]
const TEXTO = [16, 21, 26]
const LINEA = [220, 232, 240]
const FONDO = [238, 244, 249]

const ANCHO = 210
const ALTO = 297
const MARGEN = 16
const ANCHO_UTIL = ANCHO - MARGEN * 2
const LIMITE_Y = 272

function nombreArchivo(base, sufijo) {
  const limpio = normalizarTexto(base).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return `${limpio || 'informe'}${sufijo ? `-${sufijo}` : ''}.pdf`
}

function encabezado(pdf, subtitulo) {
  pdf.setFillColor(...ONYX)
  pdf.rect(0, 0, ANCHO, 26, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(17)
  pdf.setTextColor(255, 255, 255)
  pdf.text('DOCTOP', MARGEN, 16)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor(138, 208, 245)
  pdf.text(subtitulo, ANCHO - MARGEN, 16, { align: 'right' })
}

function etiqueta(pdf, texto, x, y) {
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...AZUL)
  pdf.text(texto.toUpperCase(), x, y, { charSpace: 0.4 })
}

// Escribe un párrafo con saltos de línea y de página. Devuelve la nueva posición vertical.
function parrafo(pdf, texto, y, { x = MARGEN, ancho = ANCHO_UTIL, tamano = 10.5, color = TEXTO, alSaltar } = {}) {
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(tamano)
  pdf.setTextColor(...color)
  const alto = tamano * 0.47
  const lineas = pdf.splitTextToSize(String(texto || '—'), ancho)
  let cursor = y
  for (const linea of lineas) {
    if (cursor > LIMITE_Y) {
      pdf.addPage()
      alSaltar?.()
      cursor = 40
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(tamano)
      pdf.setTextColor(...color)
    }
    pdf.text(linea, x, cursor)
    cursor += alto + 1.4
  }
  return cursor
}

function dibujarInforme(pdf, informe) {
  const subtitulo = 'Informe médico'
  encabezado(pdf, subtitulo)
  const alSaltar = () => encabezado(pdf, `${subtitulo} · ${informe.pacienteNombre ?? ''}`.slice(0, 70))

  let y = 40
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(19)
  pdf.setTextColor(...TEXTO)
  pdf.text('Informe médico', MARGEN, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.setTextColor(...GRIS)
  pdf.text(`Fecha de la consulta: ${formatearFecha(informe.fecha)}`, ANCHO - MARGEN, y, { align: 'right' })
  y += 6
  pdf.setDrawColor(...LINEA)
  pdf.line(MARGEN, y, ANCHO - MARGEN, y)
  y += 8

  // Bloque de datos del paciente y del profesional.
  pdf.setFillColor(...FONDO)
  pdf.roundedRect(MARGEN, y - 4, ANCHO_UTIL, 32, 2, 2, 'F')
  const mitad = ANCHO_UTIL / 2
  etiqueta(pdf, 'Paciente', MARGEN + 5, y + 1)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11.5)
  pdf.setTextColor(...TEXTO)
  pdf.text(pdf.splitTextToSize(informe.pacienteNombre || 'Paciente', mitad - 10)[0], MARGEN + 5, y + 8)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor(...GRIS)
  const datosPaciente = [informe.pacienteEdad ? `${informe.pacienteEdad} años` : null, informe.pacienteSexo || null].filter(Boolean).join(' · ')
  if (datosPaciente) pdf.text(datosPaciente, MARGEN + 5, y + 14)

  etiqueta(pdf, 'Profesional', MARGEN + mitad + 5, y + 1)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11.5)
  pdf.setTextColor(...TEXTO)
  pdf.text(pdf.splitTextToSize(informe.doctorNombre || 'Profesional', mitad - 10)[0], MARGEN + mitad + 5, y + 8)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor(...GRIS)
  pdf.text(informe.doctorEspecialidad || '', MARGEN + mitad + 5, y + 14)
  if (informe.doctorCarnet) pdf.text(`Carnet profesional: ${informe.doctorCarnet}`, MARGEN + mitad + 5, y + 20)
  y += 40

  for (const { clave, etiqueta: titulo } of CAMPOS_INFORME) {
    const valor = informe[clave]
    if (!valor && clave === 'observaciones') continue
    if (y > LIMITE_Y - 12) {
      pdf.addPage()
      alSaltar()
      y = 40
    }
    etiqueta(pdf, titulo, MARGEN, y)
    y = parrafo(pdf, valor, y + 6, { alSaltar })
    y += 5
  }

  // Firma
  if (y > LIMITE_Y - 26) {
    pdf.addPage()
    alSaltar()
    y = 40
  }
  y = Math.max(y + 12, 226)
  if (y > LIMITE_Y - 10) y = LIMITE_Y - 10
  pdf.setDrawColor(...GRIS)
  pdf.line(ANCHO - MARGEN - 70, y, ANCHO - MARGEN, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor(...GRIS)
  pdf.text('Firma y sello del profesional', ANCHO - MARGEN - 35, y + 5, { align: 'center' })
  pdf.setFont('helvetica', 'bold')
  pdf.setTextColor(...TEXTO)
  pdf.text(informe.doctorNombre || '', ANCHO - MARGEN - 35, y + 10, { align: 'center' })
}

function pieDePagina(pdf) {
  const total = pdf.getNumberOfPages()
  for (let i = 1; i <= total; i += 1) {
    pdf.setPage(i)
    pdf.setDrawColor(...LINEA)
    pdf.line(MARGEN, ALTO - 14, ANCHO - MARGEN, ALTO - 14)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor(...GRIS)
    pdf.text('Documento generado desde DocTop · Uso confidencial', MARGEN, ALTO - 9)
    pdf.text(`Página ${i} de ${total}`, ANCHO - MARGEN, ALTO - 9, { align: 'right' })
  }
}

function portadaLista(pdf, informes, { doctorNombre, filtros }) {
  encabezado(pdf, 'Informes médicos')
  let y = 42
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(19)
  pdf.setTextColor(...TEXTO)
  pdf.text('Informes médicos', MARGEN, y)
  y += 8
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10.5)
  pdf.setTextColor(...GRIS)
  pdf.text(doctorNombre || '', MARGEN, y)
  y += 6
  pdf.text(`Generado el ${formatearFecha(new Date())} · ${informes.length} ${informes.length === 1 ? 'informe' : 'informes'}`, MARGEN, y)
  y += 6
  if (filtros) {
    pdf.text(`Filtros: ${filtros}`, MARGEN, y)
    y += 6
  }
  y += 6

  // Índice: fecha, paciente y motivo de cada informe.
  const columnas = [MARGEN, MARGEN + 28, MARGEN + 78]
  const encabezadoTabla = () => {
    pdf.setFillColor(...ONYX)
    pdf.rect(MARGEN, y - 5, ANCHO_UTIL, 8, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(9)
    pdf.setTextColor(255, 255, 255)
    pdf.text('Fecha', columnas[0] + 2, y)
    pdf.text('Paciente', columnas[1] + 2, y)
    pdf.text('Motivo de la consulta', columnas[2] + 2, y)
    y += 8
  }
  encabezadoTabla()
  informes.forEach((informe, i) => {
    if (y > LIMITE_Y) {
      pdf.addPage()
      encabezado(pdf, 'Informes médicos')
      y = 40
      encabezadoTabla()
    }
    if (i % 2 === 0) {
      pdf.setFillColor(...FONDO)
      pdf.rect(MARGEN, y - 5, ANCHO_UTIL, 8, 'F')
    }
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9.5)
    pdf.setTextColor(...TEXTO)
    pdf.text(formatearFecha(informe.fecha), columnas[0] + 2, y)
    pdf.text(pdf.splitTextToSize(informe.pacienteNombre || '—', 48)[0], columnas[1] + 2, y)
    pdf.text(pdf.splitTextToSize(String(informe.motivo || '—').replace(/\s+/g, ' '), 80)[0], columnas[2] + 2, y)
    y += 8
  })
}

/** Descarga el PDF de un solo informe. */
export async function descargarInformePdf(informe) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  dibujarInforme(pdf, informe)
  pieDePagina(pdf)
  pdf.save(nombreArchivo(`informe-${informe.pacienteNombre}`, formatearFecha(informe.fecha).replace(/\//g, '-')))
}

/** Descarga un PDF con un índice y luego cada informe completo, uno por página (mismo orden que la lista). */
export async function descargarInformesPdf(informes, { doctorNombre, filtros } = {}) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  portadaLista(pdf, informes, { doctorNombre, filtros })
  for (const informe of informes) {
    pdf.addPage()
    dibujarInforme(pdf, informe)
  }
  pieDePagina(pdf)
  pdf.save(nombreArchivo('informes-medicos', formatearFecha(new Date()).replace(/\//g, '-')))
}
