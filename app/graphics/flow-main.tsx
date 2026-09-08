import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FlowWorkbench } from './FlowWorkbench'
import './style.css'

createRoot(document.getElementById('root')!).render(<StrictMode><FlowWorkbench /></StrictMode>)
