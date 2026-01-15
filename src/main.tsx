import {Provider} from "@/components/ui/provider"
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { RxDBProvider } from '@/context/RxDBContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RxDBProvider>
      <Provider>
        <App />
      </Provider>
    </RxDBProvider>
  </StrictMode>,
)
