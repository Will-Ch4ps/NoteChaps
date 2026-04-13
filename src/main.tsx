import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app/App'
import { DialogProvider } from './app/components/Dialog'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DialogProvider>
      <App />
    </DialogProvider>
  </React.StrictMode>
)
