import { Outlet } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'
import Sidebar from './Sidebar'
import './Layout.css'

export default function Layout() {
  return (
    <div className="layout-shell">
      <header className="app-header">
        <div className="brand">
          <h1>Gardiyan</h1>
          <p>OSINT advisory and CVE aggregation platform</p>
        </div>
        <ThemeToggle />
      </header>

      <div className="layout-body">
        <Sidebar />
        <main className="layout-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
