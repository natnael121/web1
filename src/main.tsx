import React from 'react'
import ReactDOM from 'react-dom/client'
import { SDKProvider } from '@telegram-apps/sdk/react'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SDKProvider acceptCustomStyles debug>
      <App />
    </SDKProvider>
  </React.StrictMode>,
)