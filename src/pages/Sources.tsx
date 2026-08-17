import './Sources.css'

type Source = {
  id: number
  name: string
  baseUrl: string
  enabled: boolean
  lastScan: string | null
}

const mockData: Source[] = [
  { id: 1, name: 'NVD', baseUrl: 'nvd.nist.gov', enabled: true, lastScan: '2 saat önce' },
  { id: 2, name: 'CISA advisories', baseUrl: 'cisa.gov', enabled: true, lastScan: '5 saat önce' },
  { id: 3, name: 'Vendor X blog', baseUrl: 'vendorx.com/security', enabled: false, lastScan: null },
]

export default function Sources() {
  return (
    <div className="sources-page">
      <header className="sources-header">
        <h2>Sources</h2>
        <button type="button" className="sources-add">+ Add source</button>
      </header>

      <div className="sources-table-card">
        <table className="sources-table">
          <thead>
            <tr>
              <th>Ad</th>
              <th>Base URL</th>
              <th>Durum</th>
              <th>Son tarama</th>
              <th aria-hidden="true"></th>
            </tr>
          </thead>
          <tbody>
            {mockData.map((s) => (
              <tr key={s.id}>
                <td className="name">{s.name}</td>
                <td className="url">{s.baseUrl}</td>
                <td className="status-cell">
                  <span
                    className={`status-dot ${s.enabled ? 'enabled' : 'disabled'}`}
                    aria-hidden
                  />
                  <span className="status-text">{s.enabled ? 'Aktif' : 'Pasif'}</span>
                </td>
                <td className="last-scan">{s.lastScan ?? '—'}</td>
                <td className="actions">⋮</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
