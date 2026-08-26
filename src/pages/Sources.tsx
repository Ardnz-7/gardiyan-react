import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  createSource,
  getSources,
  updateSource,
  updateSourceStatus,
  type Source,
} from '../api/client'
import './Sources.css'

type FormState = {
  name: string
  base_url: string
  enabled: boolean
  request_delay: number
}

type EditFormState = {
  name: string
  base_url: string
  request_delay: number
}

const emptyForm: FormState = {
  name: '',
  base_url: '',
  enabled: true,
  request_delay: 0,
}

export default function Sources() {
  const [sources, setSources] = useState<Source[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [togglingId, setTogglingId] = useState<number | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<EditFormState>({ name: '', base_url: '', request_delay: 0 })
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  const loadSources = async () => {
    setLoading(true)
    setErrorMessage('')

    try {
      const data = await getSources()
      setSources(data)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load sources.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSources()
  }, [])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()

    if (!form.name.trim() || !form.base_url.trim()) {
      setErrorMessage('Name and base URL are required.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      await createSource({
        name: form.name.trim(),
        base_url: form.base_url.trim(),
        enabled: form.enabled,
        request_delay: form.request_delay,
      })
      setForm(emptyForm)
      await loadSources()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not create source.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleStatus = async (source: Source) => {
    if (togglingId !== null) return

    setTogglingId(source.id)
    setErrorMessage('')

    try {
      await updateSourceStatus(source.id, !source.enabled)
      await loadSources()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update source status.')
    } finally {
      setTogglingId(null)
    }
  }

  const startEdit = (source: Source) => {
    setEditingId(source.id)
    setEditForm({
      name: source.name,
      base_url: source.base_url ?? '',
      request_delay: source.request_delay,
    })
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const handleSaveEdit = async (source: Source) => {
    setIsSavingEdit(true)
    setErrorMessage('')

    try {
      const updates: Record<string, string | number> = {}
      if (editForm.name.trim() !== source.name) {
        updates.name = editForm.name.trim()
      }
      if (editForm.base_url.trim() !== (source.base_url ?? '')) {
        updates.base_url = editForm.base_url.trim()
      }
      if (editForm.request_delay !== source.request_delay) {
        updates.request_delay = editForm.request_delay
      }

      if (Object.keys(updates).length > 0) {
        await updateSource(source.id, updates)
        await loadSources()
      }
      setEditingId(null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not update source.')
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <div className="sources-page">
      <header className="sources-header">
        <h2>Sources</h2>
      </header>

      <form className="sources-form" onSubmit={handleSubmit}>
        <label>
          <span>Name</span>
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Example: NVD"
          />
        </label>

        <label>
          <span>Base URL</span>
          <input
            type="text"
            value={form.base_url}
            onChange={(event) => setForm((current) => ({ ...current, base_url: event.target.value }))}
            placeholder="https://nvd.nist.gov"
          />
        </label>

        <label>
          <span>Request delay (seconds)</span>
          <input
            type="number"
            min="0"
            step="1"
            value={form.request_delay}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                request_delay: Number(event.target.value) || 0,
              }))
            }
          />
        </label>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
          />
          <span>Enabled</span>
        </label>

        <button type="submit" className="sources-add" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : '+ Add source'}
        </button>
      </form>

      {errorMessage && <div className="sources-error">{errorMessage}</div>}

      <div className="sources-table-card">
        {loading ? (
          <div className="sources-empty">Loading sources...</div>
        ) : sources.length === 0 ? (
          <div className="sources-empty">No sources configured yet.</div>
        ) : (
          <table className="sources-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Base URL</th>
                <th>Status</th>
                <th>Last crawl</th>
                <th aria-hidden="true"></th>
              </tr>
            </thead>
            <tbody>
              {sources.map((source) => {
                const isEditing = editingId === source.id

                if (isEditing) {
                  return (
                    <tr key={source.id} className="editing-row">
                      <td colSpan={2}>
                        <div className="edit-fields">
                          <input
                            type="text"
                            className="edit-input"
                            value={editForm.name}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, name: event.target.value }))
                            }
                            placeholder="Name"
                          />
                          <input
                            type="text"
                            className="edit-input"
                            value={editForm.base_url}
                            onChange={(event) =>
                              setEditForm((current) => ({ ...current, base_url: event.target.value }))
                            }
                            placeholder="Base URL"
                          />
                          <input
                            type="number"
                            className="edit-input edit-input-delay"
                            min="0"
                            step="1"
                            value={editForm.request_delay}
                            onChange={(event) =>
                              setEditForm((current) => ({
                                ...current,
                                request_delay: Number(event.target.value) || 0,
                              }))
                            }
                            placeholder="Delay (seconds)"
                          />
                        </div>
                      </td>
                      <td className="status-cell">
                        <span
                          className={`status-dot ${source.enabled ? 'enabled' : 'disabled'}`}
                          aria-hidden
                        />
                        <span className="status-text">{source.enabled ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="last-scan">
                        {source.last_crawl_at ? new Date(source.last_crawl_at).toLocaleString() : '—'}
                      </td>
                      <td className="actions edit-actions">
                        <button
                          type="button"
                          className="edit-save"
                          disabled={isSavingEdit}
                          onClick={() => handleSaveEdit(source)}
                        >
                          {isSavingEdit ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          className="edit-cancel"
                          disabled={isSavingEdit}
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  )
                }

                return (
                  <tr key={source.id}>
                    <td className="name">{source.name}</td>
                    <td className="url">{source.base_url || '—'}</td>
                    <td className="status-cell">
                      <button
                        type="button"
                        className="status-toggle"
                        disabled={togglingId === source.id}
                        onClick={() => handleToggleStatus(source)}
                      >
                        <span
                          className={`status-dot ${source.enabled ? 'enabled' : 'disabled'}`}
                          aria-hidden
                        />
                        <span className="status-text">
                          {togglingId === source.id
                            ? 'Updating...'
                            : source.enabled
                              ? 'Active'
                              : 'Inactive'}
                        </span>
                      </button>
                    </td>
                    <td className="last-scan">
                      {source.last_crawl_at ? new Date(source.last_crawl_at).toLocaleString() : '—'}
                    </td>
                    <td className="actions">
                      <button type="button" className="edit-button" onClick={() => startEdit(source)}>
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
