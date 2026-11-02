import test from 'node:test'
import assert from 'node:assert/strict'
import { organizarConversaciones } from '../src/features/chat/utils/conversaciones.js'

const contactos = {
  colega: { existe: true, rol: 'profesional' },
  paciente: { existe: true, rol: 'paciente' },
  otroPaciente: { existe: true, rol: 'paciente' },
}
// Un colega puede ocupar pacienteId al solicitar una interconsulta.
const filas = [
  { id: 'interconsulta', pacienteId: 'colega', doctorId: 'yo', otroId: 'colega' },
  { id: 'atencion', pacienteId: 'paciente', doctorId: 'yo', otroId: 'paciente' },
  { id: 'otra-atencion', pacienteId: 'otroPaciente', doctorId: 'yo', otroId: 'otroPaciente' },
]

test('separa por el rol real y abre el primer paciente, aunque un colega escribió más recientemente', () => {
  const resultado = organizarConversaciones({ filas, contactos })
  assert.deepEqual(resultado.filasGrupo.map(f => f.otroId), ['paciente', 'otroPaciente'])
  assert.equal(resultado.idActivo, 'paciente')
  assert.deepEqual(resultado.contadores, { pacientes: 2, doctores: 1 })
})

test('la pestaña Doctores incluye interconsultas donde el colega figura como pacienteId', () => {
  const resultado = organizarConversaciones({ filas, contactos, grupo: 'doctores' })
  assert.deepEqual(resultado.filasGrupo.map(f => f.otroId), ['colega'])
  assert.equal(resultado.idActivo, 'colega')
})

test('un enlace directo abre la pestaña del contacto, incluso si conserva el grupo anterior', () => {
  const resultado = organizarConversaciones({ filas, contactos, id: 'colega', grupo: 'pacientes' })
  assert.equal(resultado.grupoActivo, 'doctores')
  assert.equal(resultado.idActivo, 'colega')
  const vuelta = organizarConversaciones({ filas, contactos, id: 'paciente', grupo: 'doctores' })
  assert.equal(vuelta.grupoActivo, 'pacientes')
})

test('los contactos sin cargar no se clasifican como pacientes y una pestaña vacía no abre otro grupo', () => {
  const resultado = organizarConversaciones({ filas, contactos: { colega: contactos.colega } })
  assert.deepEqual(resultado.filasGrupo, [])
  assert.equal(resultado.idActivo, null)
})

test('una conversación nueva abre el contacto pero no aumenta el contador de chats existentes', () => {
  const resultado = organizarConversaciones({ filas: [{ otroId: 'colega', nueva: true }], contactos, id: 'colega' })
  assert.equal(resultado.grupoActivo, 'doctores')
  assert.equal(resultado.filasGrupo.length, 1)
  assert.equal(resultado.contadores.doctores, 0)
})

test('la bandeja del paciente conserva todas sus conversaciones sin aplicar pestañas', () => {
  const resultado = organizarConversaciones({ filas, contactos, esPaciente: true })
  assert.equal(resultado.filasGrupo, filas)
  assert.equal(resultado.idActivo, 'colega')
})
