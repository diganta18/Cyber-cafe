import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]', error, errorInfo)
  }

  handleReload = () => {
    window.location.reload()
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F5F0D0] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#2A2407] rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-[4px_4px_0px_#2A2407] text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-100 border border-red-300 flex items-center justify-center mx-auto text-red-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-black text-ink">Something went wrong</h2>
              <p className="text-xs text-ink-muted mt-1.5">
                An unexpected interface error occurred. You can reload the application to restore state safely.
              </p>
            </div>
            {this.state.error && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 text-left">
                <p className="text-[11px] font-mono text-red-600 break-all">
                  {this.state.error.message || String(this.state.error)}
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl border-2 border-[#2A2407] bg-[#EC7E00] text-white shadow-[2px_2px_0px_#2A2407] hover:bg-[#D46F00] active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Reload Application
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

