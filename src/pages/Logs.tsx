import { useState } from 'react';
import './Logs.css';

type LogLevel = 'INFO' | 'WARN' | 'ERROR';

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
};

const LOGS: LogEntry[] = [
  { timestamp: '14:32:01', level: 'INFO', source: 'parser', message: 'NVD taraması başladı' },
  { timestamp: '14:32:04', level: 'INFO', source: 'http_client', message: '128 sayfa alındı' },
  { timestamp: '14:32:06', level: 'WARN', source: 'parser', message: 'Eksik CVE alanı, atlanıyor' },
  { timestamp: '09:05:12', level: 'ERROR', source: 'http_client', message: 'Vendor X blog: 403 Forbidden' },
];

const FILTERS = ['Tüm seviyeler', 'Error', 'Warning', 'Info'] as const;

export default function Logs() {
  const [selectedLevel, setSelectedLevel] = useState<(typeof FILTERS)[number]>('Tüm seviyeler');

  const filteredLogs = LOGS.filter((entry) => {
    if (selectedLevel === 'Tüm seviyeler') return true;

    if (selectedLevel === 'Error') return entry.level === 'ERROR';
    if (selectedLevel === 'Warning') return entry.level === 'WARN';
    return entry.level === 'INFO';
  });

  return (
    <div className="logs-page">
      <div className="logs-header">
        <h2>Logs</h2>

        <select
          className="logs-filter"
          value={selectedLevel}
          onChange={(event) => setSelectedLevel(event.target.value as (typeof FILTERS)[number])}
        >
          {FILTERS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>

      <div className="logs-stream" role="log" aria-live="polite">
        {filteredLogs.map((log, index) => (
          <div key={`${log.timestamp}-${log.source}-${index}`} className={`log-row ${log.level.toLowerCase()}`}>
            <div className="log-timestamp">{log.timestamp}</div>
            <div className="log-level">{log.level}</div>
            <div className="log-source">{log.source}</div>
            <div className="log-message">{log.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
