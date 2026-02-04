import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register custom JSONLogic operators BEFORE any rule evaluation
import { registerCustomOperators } from './config'
registerCustomOperators()

// Import Bootstrap CSS for react-querybuilder styling
import 'bootstrap/dist/css/bootstrap.min.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
