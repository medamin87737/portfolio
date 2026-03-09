import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Erreur UI</div>
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error?.message ?? String(this.state.error)}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

