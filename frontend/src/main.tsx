import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[React ErrorBoundary caught error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '40px 20px', fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: '640px', margin: '0 auto', background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
            <h2 style={{ color: '#f43f5e', margin: '0 0 12px 0', fontSize: '20px' }}>Application Render Error</h2>
            <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '16px' }}>{this.state.error?.message}</p>
            <pre style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', overflow: 'auto', fontSize: '12px', color: '#94a3b8', maxHeight: '200px' }}>
              {this.state.error?.stack}
            </pre>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ marginTop: '16px', padding: '10px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Reset Session & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
} else {
  console.error('Fatal: Failed to find the root element #root');
}

