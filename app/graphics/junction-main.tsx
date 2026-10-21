import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { JunctionWorkbench } from './JunctionWorkbench'
import './style.css'

createRoot(document.getElementById('root')!).render(<StrictMode><JunctionWorkbench /></StrictMode>)
