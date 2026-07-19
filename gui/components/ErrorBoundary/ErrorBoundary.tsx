import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "../Button/Button";
import { Icon } from "../Icon/Icon";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an unhandled exception:", error, errorInfo);
    this.setState({ errorInfo });
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) this.props.onReset();
  };

  public toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] w-full p-8 flex items-center justify-center bg-canvas-cream text-ink-black select-none">
          <div className="max-w-md w-full bg-white border border-dust-taupe/40 rounded-2xl p-6 shadow-level-2 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Icon name="alert" size="lg" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-ink-black">
                An interface exception occurred
              </h3>
              <p className="text-xs text-slate-gray">
                The execution layer encountered an unexpected error while processing data for this module.
              </p>
            </div>

            {this.state.error && (
              <div className="text-left bg-canvas-cream p-3 rounded-xl border border-dust-taupe/30 space-y-2">
                <div
                  onClick={this.toggleDetails}
                  className="flex items-center justify-between text-xs font-bold text-ink-black cursor-pointer"
                >
                  <span>Technical Error Details</span>
                  <Icon
                    name="chevronDown"
                    size="sm"
                    className={`transition-transform ${
                      this.state.showDetails ? "rotate-180" : ""
                    }`}
                  />
                </div>
                {this.state.showDetails && (
                  <pre className="text-[10px] font-mono text-red-600 overflow-x-auto p-2 bg-white rounded border border-dust-taupe/20 max-h-40">
                    {this.state.error.toString()}
                    {"\n\n"}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <Button variant="primary" size="md" onClick={this.handleReset}>
                Try Again
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
