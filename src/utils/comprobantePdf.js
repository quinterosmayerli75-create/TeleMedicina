// PDF del comprobante de una consulta (constancia de solicitud y pago). Mismo estilo visual que los
// informes médicos. jsPDF se carga bajo demanda para no engordar el bundle inicial.
import { formatearFecha } from './fechas'
import { ESTADOS_CONSULTA, MODALIDADES } from '../firebase/consultas'

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
  pdf.text('Comprobante de consulta', ANCHO - MARGEN, 16, { align: 'right' })
}

function etiqueta(pdf, texto, x, y) {
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(8.5)
  pdf.setTextColor(...AZUL)
  pdf.text(texto.toUpperCase(), x, y, { charSpace: 0.4 })
}

function campo(pdf, texto, valor, x, y, ancho) {
  etiqueta(pdf, texto, x, y)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(11)
  pdf.setTextColor(...TEXTO)
  pdf.text(pdf.splitTextToSize(String(valor ?? '—'), ancho)[0], x, y + 7)
}

/** Descarga el PDF del comprobante de una consulta (requiere el objeto con id incluido). */
export async function descargarComprobanteConsulta(consulta) {
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  encabezado(pdf)

  let y = 42
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(19)
  pdf.setTextColor(...TEXTO)
  pdf.text('Comprobante de consulta', MARGEN, y)
  y += 8
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor(...GRIS)
  pdf.text(`N.º de consulta: ${consulta.id}`, MARGEN, y)
  y += 10
  pdf.setDrawColor(...LINEA)
  pdf.line(MARGEN, y, ANCHO - MARGEN, y)
  y += 10

  const mitad = ANCHO_UTIL / 2
  campo(pdf, 'Paciente', consulta.pacienteNombre, MARGEN, y, mitad - 10)
  campo(pdf, 'Profesional', consulta.doctorNombre, MARGEN + mitad, y, mitad - 10)
  y += 20

  campo(pdf, 'Modalidad', MODALIDADES[consulta.modalidad]?.etiqueta, MARGEN, y, mitad - 10)
  campo(pdf, 'Costo', `Bs ${consulta.costoConsulta}`, MARGEN + mitad, y, mitad - 10)
  y += 20

  campo(pdf, 'Fecha y hora agendada', consulta.fecha ? `${consulta.fecha} ${consulta.hora ?? ''}` : '—', MARGEN, y, mitad - 10)
  campo(pdf, 'Estado', ESTADOS_CONSULTA[consulta.estado]?.etiqueta ?? consulta.estado, MARGEN + mitad, y, mitad - 10)
  y += 20

  campo(pdf, 'Fecha de solicitud', formatearFecha(consulta.fechaSolicitud), MARGEN, y, mitad - 10)
  y += 20

  if (consulta.fechaValidacion) campo(pdf, 'Pago validado el', formatearFecha(consulta.fechaValidacion), MARGEN, y, mitad - 10)
  if (consulta.fechaFinalizacion) campo(pdf, 'Consulta finalizada el', formatearFecha(consulta.fechaFinalizacion), MARGEN + mitad, y, mitad - 10)
  y += 30

  pdf.setFillColor(...FONDO)
  pdf.roundedRect(MARGEN, y, ANCHO_UTIL, 20, 2, 2, 'F')
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9.5)
  pdf.setTextColor(...GRIS)
  pdf.text('Este comprobante certifica la solicitud y el pago de una consulta virtual en DocTop.', MARGEN + 6, y + 8)
  pdf.text('Consérvelo como constancia.', MARGEN + 6, y + 14)

  pdf.setDrawColor(...LINEA)
  pdf.line(MARGEN, 280, ANCHO - MARGEN, 280)
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(...GRIS)
  pdf.text('Documento generado desde DocTop · Uso confidencial', MARGEN, 285)

  pdf.save(`comprobante-consulta-${consulta.id}.pdf`)
}
