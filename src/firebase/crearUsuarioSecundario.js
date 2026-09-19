import { initializeApp, deleteApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { firebaseConfig } from './config'

// Crea una cuenta de Authentication para OTRA persona (ej. un admin dando de alta a un
// doctor, o un doctor dando de alta a un paciente) sin cerrar la sesión de quien la crea.
// El SDK de cliente de Firebase inicia sesión automáticamente con el usuario recién creado
// en la instancia donde se llama a createUserWithEmailAndPassword; por eso usamos una
// instancia de Firebase totalmente aparte, que se descarta apenas termina.
export async function crearUsuarioAuxiliar(email, password) {
  const appAuxiliar = initializeApp(firebaseConfig, `auxiliar-${Date.now()}`)
  try {
    const authAuxiliar = getAuth(appAuxiliar)
    const credencial = await createUserWithEmailAndPassword(authAuxiliar, email, password)
    return credencial.user.uid
  } finally {
    await deleteApp(appAuxiliar)
  }
}
