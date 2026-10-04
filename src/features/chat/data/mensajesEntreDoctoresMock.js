// Datos de ejemplo del chat entre doctores (interconsultas) mientras se conecta Firestore.
// `de: 'yo'` es el doctor que tiene la sesión abierta; `de: 'colega'` es el otro doctor.
export const conversacionesEntreDoctoresMock = {
  'andres-salvatierra': {
    doctor: { id: 'andres-salvatierra', nombre: 'Dr. Andrés Salvatierra', especialidad: 'Cardiología', foto: 'https://i.pravatar.cc/100?img=60', enLinea: true },
    ultimaConexion: 'En línea',
    mensajes: [
      { de: 'yo', texto: 'Colega, ¿tiene un minuto? Tengo una paciente con palpitaciones y un ECG dudoso.', hora: '10:02 a.m.' },
      { de: 'yo', texto: 'Le comparto el trazo.', hora: '10:03 a.m.', adjunto: 'https://picsum.photos/seed/ecg1/280/150' },
      { de: 'colega', texto: 'Claro. Se ve una taquicardia sinusal, pediría un Holter de 24 horas antes de tratar.', hora: '10:11 a.m.' },
    ],
  },
  'lucia-quiroga': {
    doctor: { id: 'lucia-quiroga', nombre: 'Dra. Lucía Quiroga', especialidad: 'Psicología', foto: 'https://i.pravatar.cc/100?img=32', enLinea: false },
    ultimaConexion: 'Desconectada',
    mensajes: [
      { de: 'colega', texto: '¿Podría derivarme al paciente del que hablamos? Tengo espacio el martes.', hora: 'Ayer' },
      { de: 'yo', texto: 'Perfecto, le paso su contacto hoy mismo.', hora: 'Ayer' },
    ],
  },
}
