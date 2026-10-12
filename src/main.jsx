import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/shared/styles/tokens.css'
import '@/shared/styles/components.css'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { FavoritosProvider } from '@/features/profesionales/context/FavoritosContext'
import AppRouter from '@/app/AppRouter'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <FavoritosProvider>
        <AppRouter />
      </FavoritosProvider>
    </AuthProvider>
  </StrictMode>,
)
