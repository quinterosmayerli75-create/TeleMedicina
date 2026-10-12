// Reporte general en PDF para el admin (resumen de métricas + ranking de doctores). Mismo estilo
// visual que los demás PDF de DocTop. jsPDF se carga bajo demanda.
import { formatearFecha } from '@/shared/utils/fechas'

const ONYX = [15, 20, 23]
const AZUL = [44, 143, 214]
const GRIS = [110, 120, 128]
const TEXTO = [16, 21, 26]
const LINEA = [220, 232, 240]
const FONDO = [238, 244, 249]

const ANCHO = 210
const MARGEN = 16
const ANCHO_UTIL = ANCHO - MARGEN * 2

function encabezado(pdf) {
  pdf.setFillColor(...ONYX)
  pdf.rect(0, 0, ANCHO, 26, 'F')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(17)
  pdf.setTextColor(255, 255, 255)
  pdf.text('DOCTOP', MARGEN, 16)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor(138, 208, 245)
  pdf.text('Reporte general', ANCHO - MARGEN, 16, { align: 'right' })
}

/** metricas: [{ etiqueta, valor }]; ranking: [{ especialidad, top: [{ nombre, nota }] }] */
export async function descargarReportePdf({ metricas, ranking }) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  encabezado(pdf)

  let y = 42
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(19)
  pdf.setTextColor(...TEXTO)
  pdf.text('Reporte general', MARGEN, y)
  y += 7
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor(...GRIS)
  pdf.text(`Generado el ${formatearFecha(new Date())}`, MARGEN, y)
  y += 10
  pdf.setDrawColor(...LINEA)
  pdf.line(MARGEN, y, ANCHO - MARGEN, y)
  y += 10

  // Métricas en tarjetas de 2 columnas.
  const mitad = ANCHO_UTIL / 2
  metricas.forEach((m, i) => {
    const x = MARGEN + (i % 2) * mitad
    if (i % 2 === 0 && i > 0) y += 24
    pdf.setFillColor(...FONDO)
    pdf.roundedRect(x, y, mitad - 6, 20, 2, 2, 'F')
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(16)
    pdf.setTextColor(...AZUL)
    pdf.text(String(m.valor), x + 6, y + 10)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor(...GRIS)
    pdf.text(m.etiqueta, x + 6, y + 16)
  })
  y += 32

  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(13)
  pdf.setTextColor(...TEXTO)
  pdf.text('Mejores doctores por especialidad', MARGEN, y)
  y += 8

  ranking.forEach((grupo) => {
    if (grupo.top.length === 0) return
    if (y > 265) {
      pdf.addPage()
      encabezado(pdf)
      y = 42
    }
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10.5)
    pdf.setTextColor(...AZUL)
    pdf.text(grupo.especialidad, MARGEN, y)
    y += 6
    grupo.top.forEach((d, i) => {
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(10)
      pdf.setTextColor(...TEXTO)
      pdf.text(`${i + 1}. ${d.nombre}`, MARGEN + 4, y)
      pdf.text(`${d.nota.toFixed(1)} / 5`, ANCHO - MARGEN, y, { align: 'right' })
      y += 6
    })
    y += 4
  })

  pdf.save(`reporte-doctop-${formatearFecha(new Date()).replace(/\//g, '-')}.pdf`)
}
