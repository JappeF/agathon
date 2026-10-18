import { Component, type ReactNode } from 'react';

/**
 * Last line of defence: an error while rendering shows this instead of a blank page,
 * and the update toast next to the app keeps working.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <main className="app-main crash" role="alert">
        <h1 className="view-title">Something went wrong</h1>
        <p>Agathon ran into an error showing this page. Your characters and spell ideas are safe on this device.</p>
        <p className="fine-print">{error.message}</p>
        <div className="modal-actions">
          <button
            type="button"
            className="btn"
            onClick={() => {
              location.hash = '#/library';
              location.reload();
            }}
          >
            Back to the library
          </button>
          <button type="button" className="btn btn-gold" onClick={() => location.reload()}>
            Reload
          </button>
        </div>
      </main>
    );
  }
}
