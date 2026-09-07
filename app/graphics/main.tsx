import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HeartWorkbench } from './HeartWorkbench'
import './style.css'

const root = document.getElementById('root')
if (!root) throw new Error('Heart study root is missing')
createRoot(root).render(<StrictMode><HeartWorkbench /></StrictMode>)
