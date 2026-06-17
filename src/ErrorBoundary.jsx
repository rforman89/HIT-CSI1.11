import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Onbekende fout",
    };
  }

  componentDidCatch(error, info) {
    console.error("CSI HIT render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: "#18181b",
            border: "1px solid #7f1d1d",
            borderRadius: 16,
            padding: 16,
            marginBottom: 14,
            color: "#f4f4f5",
          }}
        >
          <h2>Er ging iets mis in dit scherm</h2>
          <p style={{ color: "#fca5a5" }}>{this.state.errorMessage}</p>
          <p style={{ color: "#a1a1aa" }}>
            Ververs de pagina of ga naar een andere tab. Als dit blijft
            gebeuren, controleer dan de laatste wijziging in de code.
          </p>
          <button
            style={{
              padding: "11px 14px",
              borderRadius: 12,
              border: "1px solid #52525b",
              background: "#27272a",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              marginRight: 8,
              marginBottom: 8,
              fontSize: 15,
            }}
            onClick={() => window.location.reload()}
          >
            Pagina verversen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
