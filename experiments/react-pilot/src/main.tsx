import { createRoot } from 'react-dom/client';
import '../../../dist/css/styles.css';
import { BossesPage } from './pages/BossesPage';
import { bossContent } from './data/bosses';
import './styles/react-preview.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('React preview root element is missing.');

const legacySiteUrl = import.meta.env.VITE_LEGACY_SITE_URL ?? 'http://127.0.0.1:8001';
createRoot(rootElement).render(<BossesPage content={bossContent} legacySiteUrl={legacySiteUrl} />);
