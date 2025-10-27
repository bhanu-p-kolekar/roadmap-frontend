import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h3>An error occurred while rendering the roadmap.</h3>
          <div className="error-message">{this.state.error?.toString()}</div>
          <div className="error-help">
            Try opening the DevTools console to see the full stack trace.
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;