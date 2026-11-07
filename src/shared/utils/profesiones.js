// Profesiones de salud que puede elegir un profesional al registrarse. Cada categoría de
// especialidad (ver Categorías, admin) pertenece a una de estas. Estas 4 vienen fijas desde el
// inicio del proyecto; para sumar otras (ej. Farmacéutico) sin tocar código, el admin las agrega
// en "Carreras" y quedan guardadas en Firestore (ver useProfesiones más abajo).
export const PROFESIONES_BASE = ['Médico', 'Odontólogo', 'Psicólogo', 'Nutricionista']

// Nombre viejo, por si algo lo sigue importando: ya no se usa para los selects (ver useProfesiones).
export const PROFESIONES = PROFESIONES_BASE
