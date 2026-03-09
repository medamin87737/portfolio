import { Link, Route, Routes } from 'react-router-dom'
import { Properties } from './components/Properties.jsx'
import { ReservationForm } from './components/ReservationForm.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'

export default function App() {
  return (
    <div className="appShell">
      <header className="topbar">
        <div className="topbarInner">
          <Link to="/" className="brand">
            ImmoRent
          </Link>
          <nav className="nav">
            <Link to="/" className="navLink">
              Propriétés
            </Link>
          </nav>
        </div>
      </header>

      <main className="main">
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Properties />} />
            <Route path="/reserve" element={<ReservationForm />} />
          </Routes>
        </ErrorBoundary>
      </main>
    </div>
  )
}
