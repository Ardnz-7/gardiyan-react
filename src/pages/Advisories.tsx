import React, { useState } from 'react';
import './Advisories.css';

type Advisory = {
  title: string;
  cve: string;
  source: string;
  severity: 'Critical' | 'High' | 'Medium';
  published: string;
  collected: string;
  org: string;
  product: string;
  summary: string;
  url?: string;
};

const MOCK: Advisory[] = [
  {
    title: 'Remote code execution in libX',
    cve: 'CVE-2026-4821',
    source: 'NVD',
    severity: 'Critical',
    published: '2026-08-10',
    collected: '2026-08-11',
    org: 'National Vulnerability Database',
    product: 'libX v2.3.1',
    summary:
      'libX kütüphanesinde kimlik doğrulama gerektirmeyen uzaktan kod çalıştırma açığı bulundu. Saldırgan özel hazırlanmış bir istekle sunucu üzerinde rastgele kod çalıştırabilir.',
    url: '#',
  },
  {
    title: 'Auth bypass in service Y',
    cve: 'CVE-2026-4819',
    source: 'CISA',
    severity: 'High',
    published: '2026-08-09',
    collected: '2026-08-11',
    org: 'CISA',
    product: 'Service Y',
    summary: 'Kimlik doğrulama mekanizmasını atlatan bir güvenlik açığı tespit edildi.',
    url: '#',
  },
  {
    title: 'Info disclosure in plugin Z',
    cve: 'CVE-2026-4801',
    source: 'Vendor X',
    severity: 'Medium',
    published: '2026-08-08',
    collected: '2026-08-10',
    org: 'Vendor X',
    product: 'Plugin Z v1.0',
    summary: 'Hassas bilgilerin yetkisiz erişime açık olduğu bir açık bulundu.',
    url: '#',
  },
];

function severityClass(s: Advisory['severity']) {
  return s.toLowerCase();
}

const Advisories: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [query] = useState<string>('');

  const selected = MOCK[selectedIndex];

  return (
    <div className="advisories-page">
      <div className="left-col">
        <div className="search-wrap">
          <input
            className="search-input"
            placeholder="Ara (CVE, ürün...)"
            value={query}
            onChange={() => {}}
          />
        </div>

        <div className="advisory-list">
          {MOCK.map((a, i) => (
            <div
              key={a.cve}
              className={`advisory-card ${i === selectedIndex ? 'selected' : ''}`}
              onClick={() => setSelectedIndex(i)}
            >
              <div className="advisory-title">{a.title}</div>
              <div className="advisory-sub">{a.cve} · {a.source}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="right-col">
        <div className="detail-header">
          <h2 className="detail-title">{selected.title}</h2>
          <span className={`badge ${severityClass(selected.severity)}`}>{selected.severity}</span>
        </div>

        <div className="meta-line">
          <span>{selected.cve}</span>
          <span>·</span>
          <span>{selected.source}</span>
          <span>·</span>
          <span>Yayın: {selected.published}</span>
          <span>·</span>
          <span>Toplandı: {selected.collected}</span>
        </div>

        <div className="info-grid">
          <div className="info-item">
            <div className="info-key">Organization</div>
            <div className="info-val">{selected.org}</div>
          </div>
          <div className="info-item">
            <div className="info-key">Product</div>
            <div className="info-val">{selected.product}</div>
          </div>
        </div>

        <div className="summary">
          <p>{selected.summary}</p>
        </div>

        <div className="external-link">
          <a href={selected.url} target="_blank" rel="noreferrer">↗ Orijinal kaynağı görüntüle</a>
        </div>
      </div>
    </div>
  );
};

export default Advisories;
