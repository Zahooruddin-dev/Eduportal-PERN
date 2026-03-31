import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      message: '',
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Unexpected application error',
    };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled React error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className='min-h-screen bg-[var(--color-bg)] px-4 py-10 text-[var(--color-text-primary)]'>
        <div className='mx-auto max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm'>
          <h1 className='text-xl font-semibold'>Something went wrong</h1>
          <p className='mt-2 text-sm text-[var(--color-text-muted)]'>
            We hit an unexpected error while rendering this screen.
          </p>
          <p className='mt-4 rounded-lg bg-[var(--color-input-bg)] p-3 text-xs text-[var(--color-text-secondary)]'>
            {this.state.message}
          </p>
          <button
            type='button'
            onClick={this.handleReload}
            className='mt-5 rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]'
          >
            Reload app
          </button>
        </div>
      </main>
    );
  }
}
