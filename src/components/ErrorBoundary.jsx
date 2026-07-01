import React from "react";

/**
 * Catches render-time errors anywhere in the tree and shows a readable message
 * instead of a blank white screen.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Caught by ErrorBoundary:", error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            maxWidth: 560,
            margin: "80px auto",
            padding: 24,
            borderRadius: 12,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "#fca5a5",
            fontFamily: "system-ui, sans-serif",
            textAlign: "center",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#f87171" }}>Something went wrong</h2>
          <p style={{ color: "#cbd5e1" }}>
            The page hit an unexpected error. Your saved data is safe.
          </p>
          {this.state.error?.message && (
            <pre
              style={{
                textAlign: "left",
                whiteSpace: "pre-wrap",
                background: "rgba(0,0,0,0.25)",
                padding: 12,
                borderRadius: 8,
                fontSize: 12,
                color: "#fda4af",
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReset}
            style={{
              marginTop: 12,
              padding: "8px 18px",
              borderRadius: 8,
              border: "none",
              background: "#6366f1",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
