import { NavLink } from 'react-router-dom'
import './Sidebar.css'

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Sources', path: '/sources' },
  { label: 'Crawl Jobs', path: '/crawl-jobs' },
  { label: 'Advisories', path: '/advisories' },
  { label: 'Logs', path: '/logs' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              isActive ? 'sidebar-link active' : 'sidebar-link'
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
