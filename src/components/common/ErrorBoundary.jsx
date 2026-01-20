import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background-primary flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="card text-center">
              <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="text-error" size={32} />
              </div>

              <h1 className="font-heading text-xl font-bold text-text-primary mb-2">
                Noe gikk galt
              </h1>

              <p className="text-text-secondary mb-4">
                En uventet feil oppstod. Prøv å laste siden på nytt.
              </p>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="mb-4 p-3 bg-background-secondary rounded-lg text-left">
                  <p className="text-xs text-error font-mono break-all">
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-2">
                      <summary className="text-xs text-text-muted cursor-pointer">
                        Stack trace
                      </summary>
                      <pre className="text-xs text-text-muted mt-2 overflow-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <button
                  onClick={() => window.location.reload()}
                  className="btn-primary w-full"
                >
                  <RefreshCw size={18} />
                  Last siden på nytt
                </button>

                <button
                  onClick={this.handleReset}
                  className="btn-outline w-full"
                >
                  Prøv igjen
                </button>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
