import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Sources from './pages/Sources'
import CrawlJobs from './pages/CrawlJobs'
import CrawlDetails from './pages/CrawlDetails'
import Advisories from './pages/Advisories'
import Logs from './pages/Logs'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="sources" element={<Sources />} />
          <Route path="crawl-jobs" element={<CrawlJobs />} />
          <Route path="crawl-jobs/:id" element={<CrawlDetails />} />
          <Route path="advisories" element={<Advisories />} />
          <Route path="logs" element={<Logs />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
