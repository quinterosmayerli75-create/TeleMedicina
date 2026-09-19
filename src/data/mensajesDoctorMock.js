// Datos de ejemplo mientras se conecta la colección "mensajes" de Firestore (Sprint 2 - HU-19).
export const conversacionesDoctorMock = {
  'camila-rojas': {
    mensajes: [
      { de: 'paciente', texto: 'Buenas tardes doctor, siento el pecho apretado al subir gradas.', hora: '3:14 p.m.' },
      { de: 'paciente', texto: 'Le mando mi último análisis.', hora: '3:15 p.m.', adjunto: 'https://picsum.photos/seed/lab1/280/150' },
      { de: 'doctor', texto: 'Prefiero revisarla en consulta. Mañana jueves 4:30 p.m.', hora: '3:18 p.m.' },
    ],
  },
  'jorge-aguilar': {
    mensajes: [
      { de: 'paciente', texto: '¿Tiene espacio este viernes?', hora: 'Ayer' },
    ],
  },
}
