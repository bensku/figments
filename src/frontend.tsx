import { createRoot } from 'react-dom/client';
import { Router } from 'wouter';
import { App } from './App';

function start() {
    const container = document.getElementById('root');
    if (!container) {
        throw new Error('Root element not found');
    }
    const root = createRoot(container);
    root.render(
        <Router>
            <App />
        </Router>,
    );
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}
