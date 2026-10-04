import { initializeApp, deleteApp } from 'firebase/app'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { firebaseConfig } from './config'

// Crea una cuenta de Authentication para OTRA persona (ej. un admin dando de alta a un doctor, o el
// super admin a otro administrador) sin cerrar la sesión de quien la crea.
// El SDK de cliente de Firebase inicia sesión automáticamente con el usuario recién creado
// en la instancia donde se llama a createUserWithEmailAndPassword; por eso usamos una
// instancia de Firebase totalmente aparte, que se descarta apenas termina.
//
// `alCrear(uid)` (opcional) guarda el perfil de la persona en Firestore. Si lanza un error, la cuenta
// de acceso recién creada se elimina y el error se vuelve a lanzar: así no queda una cuenta a medias
// que impida reintentar con el mismo correo.
export async function crearUsuarioAuxiliar(email, password, alCrear) {
  const appAuxiliar = initializeApp(firebaseConfig, `auxiliar-${Date.now()}`)
  try {
    const authAuxiliar = getAuth(appAuxiliar)
    const credencial = await createUserWithEmailAndPassword(authAuxiliar, email, password)
    const uid = credencial.user.uid
    if (alCrear) {
      try {
        await alCrear(uid)
      } catch (err) {
        await credencial.user.delete().catch(() => {})
        throw err
      }
    }
    return uid
  } finally {
    await deleteApp(appAuxiliar)
  }
}
