import { StrictMode, Component, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext'

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    (window as any).__lastError = { error: error.message, stack: error.stack, errorInfo };
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', backgroundColor: '#FEF2F2', color: '#991B1B', minHeight: '100vh', fontFamily: 'sans-serif' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '16px' }}>Error en la aplicación WeightControl</h2>
          <pre style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '8px', border: '1px solid #F87171', overflowX: 'auto' }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}
            style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#0B1F3F', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
          >
            Limpiar sesión y recargar
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

