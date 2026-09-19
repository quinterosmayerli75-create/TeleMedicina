// Datos de ejemplo mientras se conecta la colección "mensajes" de Firestore (Sprint 2 - HU-19).
export const conversacionesMock = {
  'renzo-fernandez': {
    doctor: { id: 'renzo-fernandez', nombre: 'Dr. Renzo Fernández', foto: 'https://i.pravatar.cc/100?img=51', enLinea: true },
    ultimaConexion: 'En línea',
    mensajes: [
      { de: 'paciente', texto: 'Buenas tardes doctor, siento el pecho apretado al subir gradas.', hora: '3:14 p.m.' },
      { de: 'paciente', texto: 'Le mando mi último análisis.', hora: '3:15 p.m.', adjunto: 'https://picsum.photos/seed/lab1/280/150' },
      { de: 'doctor', texto: 'Tengo espacio mañana jueves 4:30 p.m.', hora: '3:18 p.m.' },
    ],
  },
  'marcela-rojas': {
    doctor: { id: 'marcela-rojas', nombre: 'Dra. Marcela Rojas', foto: 'https://i.pravatar.cc/100?img=12', enLinea: true },
    ultimaConexion: 'En línea',
    mensajes: [
      { de: 'paciente', texto: '¿Tiene espacio el viernes para una limpieza?', hora: 'Ayer' },
      { de: 'doctor', texto: 'Claro, la puedo atender el viernes a las 10.', hora: 'Ayer' },
    ],
  },
}
