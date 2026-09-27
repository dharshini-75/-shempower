import React from 'react';
import Login from '../screens/Login';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SHEmpower ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Directly render the normal Login Page automatically without showing any recovery screen
      return <Login />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
