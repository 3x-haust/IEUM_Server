import { createRoot } from 'react-dom/client';
import { AdminApp } from './AdminApp';
import './styles.css';

const root = document.getElementById('root');

if (root !== null) {
  createRoot(root).render(<AdminApp initialPath={window.location.pathname} />);
}
