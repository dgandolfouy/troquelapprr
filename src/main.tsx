/**
 * AVISO DE PROPIEDAD INTELECTUAL & CERTIFICACIÓN DE AUTORÍA
 * --------------------------------------------------------
 * Desarrollado por: Daniel Gandolfo (GUTEN)
 * Proyecto: Ecosistema RR - Gestor de Troqueles
 * Fecha: 2024 - 2026
 * 
 * © Todos los derechos reservados. El código fuente, arquitectura
 * y lógica de este software son propiedad intelectual de GUTEN.
 */

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
