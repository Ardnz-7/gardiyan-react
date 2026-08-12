import ThemeToggle from './components/ThemeToggle'
import './App.css'

function App() {
  return (
    <>
      <header className="app-header">
        <div className="brand">
          <h1>Gardiyan</h1>
          <p>OSINT advisory and CVE aggregation platform</p>
        </div>
        <ThemeToggle />
      </header>

      <section id="center">
        <div>
          <h2>Dashboard</h2>
          <p>API bağlantısı tamamlanınca burada canlı veriler görünecek.</p>
        </div>
      </section>
    </>
  )
}

export default App
