import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

type State = { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Drive Moko UI error', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-[40vh] place-items-center bg-canvas px-4">
          <div className="max-w-md rounded-3xl bg-white p-6 text-center shadow-sm">
            <h1 className="text-xl font-extrabold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted">Try refreshing the page. If the problem continues, contact support.</p>
            <Button className="mt-4" onClick={() => window.location.assign('/')}>
              Go home
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}