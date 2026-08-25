import { useEffect, useState } from 'react';
import { getLogs, type CrawlLog } from '../api/client';
import './Logs.css';

const FILTERS = ['Tüm seviyeler', 'Error', 'Warning', 'Info'] as const;

function formatTimestamp(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function Logs() {
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<(typeof FILTERS)[number]>('Tüm seviyeler');

  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        const data = await getLogs();
        setLogs(data);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to load logs.');
      } finally {
        setLoading(false);
      }
    };

    void loadLogs();
  }, []);

  const filteredLogs = logs.filter((entry) => {
    if (selectedLevel === 'Tüm seviyeler') return true;

    const level = (entry.log_level ?? '').toUpperCase();
    if (selectedLevel === 'Error') return level === 'ERROR';
    if (selectedLevel === 'Warning') return level === 'WARN';
    return level === 'INFO';
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

      {errorMessage && <div className="logs-error">{errorMessage}</div>}

      <div className="logs-stream" role="log" aria-live="polite">
        {loading ? (
          <div className="logs-empty">Yükleniyor...</div>
        ) : filteredLogs.length === 0 ? (
          <div className="logs-empty">Henüz log kaydı yok.</div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className={`log-row ${(log.log_level ?? '').toLowerCase()}`}>
              <div className="log-timestamp">{formatTimestamp(log.timestamp)}</div>
              <div className="log-level">{log.log_level ?? '—'}</div>
              <div className="log-source">{log.source ?? '—'}</div>
              <div className="log-message">{log.message ?? '—'}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
