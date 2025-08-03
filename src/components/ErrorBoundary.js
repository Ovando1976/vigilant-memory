// src/components/ErrorBoundary.js
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-semibold">Something went wrong.</h2>
          <p className="mt-2 text-sm text-gray-500">
            Check the console for details.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}