'use client'
// src/app/(dashboard)/deals/page.tsx

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatCurrency, formatDate, formatPercent, PIPELINE_STAGES } from '@/lib/formatters'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Deal {
  id: string
  name: string
  type: string
  status: string
  dealOwner: string
  strategy: string | null
  city: string | null
  state: string | null
  assetType: string | null
  closingDate: string | null
  askingPrice: number | null
  fundsNeeded: number | null
  capRate: number | null
  units: number | null
}

interface Stats {
  totalDeals: number
  totalAskingPrice: number
  weightedPipeline: number
  closingThisQuarter: number
}

const STATUS_COLORS: Record<string, string> = {
  'New':            '#6366f1',
  'Under Review':   '#f59e0b',
  'LOI Submitted':  '#3b82f6',
  'LOI Accepted':   '#8b5cf6',
  'Due Diligence':  '#ec4899',
  'Under Contract': '#10b981',
  'Closed':         '#059669',
  'Lost / Dead':    '#6b7280',
}

const TYPE_COLORS: Record<string, string> = {
  'Acquisition': '#0ea5e9',
  'Disposition': '#f97316',
  'Refinance':   '#a855f7',
  'Development': '#22c55e',
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function DealsPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({
    status: '', type: '', assetType: '', state: '',
  })
  const [sort, setSort] = useState({ field: 'createdAt', order: 'desc' as 'asc' | 'desc' })
  const [showImport, setShowImport] = useState(false)
  const [showNewDeal, setShowNewDeal] = useState(false)
  const searchTimer = useRef<any>(null)

  const fetchDeals = useCallback(async (q?: string) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q ?? search) params.set('search', q ?? search)
    if (filters.status)   params.set('status', filters.status)
    if (filters.type)     params.set('type', filters.type)
    if (filters.assetType)params.set('asset_type', filters.assetType)
    if (filters.state)    params.set('state', filters.state)
    params.set('sort', sort.field)
    params.set('order', sort.order)
    params.set('limit', '100')

    const res = await fetch(`/api/deals?${params}`)
    const json = await res.json()
    setDeals(json.data ?? [])
    setLoading(false)
  }, [search, filters, sort])

  const fetchStats = useCallback(async () => {
    const res = await fetch('/api/deals/stats')
    const json = await res.json()
    setStats(json.data)
  }, [])

  useEffect(() => { fetchDeals(); fetchStats() }, [filters, sort])

  const handleSearch = (val: string) => {
    setSearch(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => fetchDeals(val), 350)
  }

  const handleStatusMove = async (dealId: string, newStatus: string) => {
    await fetch(`/api/deals/${dealId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    fetchDeals()
    fetchStats()
  }

  const handleDelete = async (dealId: string) => {
    if (!confirm('Delete this deal?')) return
    await fetch(`/api/deals/${dealId}`, { method: 'DELETE' })
    fetchDeals()
    fetchStats()
  }

  const handleSort = (field: string) => {
    setSort(s => ({ field, order: s.field === field && s.order === 'asc' ? 'desc' : 'asc' }))
  }

  const kanbanGroups = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter(d => d.status === stage)
    return acc
  }, {} as Record<string, Deal[]>)

  // ─── drag state
  const dragging = useRef<string | null>(null)

  return (
    <div style={{ fontFamily: "'DM Mono', monospace", minHeight: '100vh', background: '#0d0f14', color: '#e2e8f0' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Cabinet+Grotesk:wght@400;500;700;800&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #1a1d26; }
        ::-webkit-scrollbar-thumb { background: #2d3348; border-radius: 3px; }
        .stat-card { background: #141720; border: 1px solid #1e2130; border-radius: 12px; padding: 20px 24px; transition: border-color .2s; }
        .stat-card:hover { border-color: #3d4460; }
        .deals-table { width: 100%; border-collapse: collapse; }
        .deals-table th { padding: 10px 14px; text-align: left; font-size: 11px; letter-spacing: .08em; color: #6b7a9e; text-transform: uppercase; border-bottom: 1px solid #1e2130; cursor: pointer; user-select: none; white-space: nowrap; }
        .deals-table th:hover { color: #a0aec0; }
        .deals-table td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid #1a1d26; white-space: nowrap; }
        .deals-table tr:hover td { background: #141720; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; letter-spacing: .04em; }
        .btn-primary { background: #5a67d8; color: white; border: none; padding: 8px 18px; border-radius: 8px; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; transition: background .15s; }
        .btn-primary:hover { background: #667eea; }
        .btn-ghost { background: transparent; color: #6b7a9e; border: 1px solid #2d3348; padding: 8px 14px; border-radius: 8px; font-family: inherit; font-size: 13px; cursor: pointer; transition: all .15s; }
        .btn-ghost:hover { color: #e2e8f0; border-color: #4a5568; }
        .filter-select { background: #141720; color: #a0aec0; border: 1px solid #2d3348; padding: 8px 12px; border-radius: 8px; font-family: inherit; font-size: 13px; cursor: pointer; }
        .filter-select:focus { outline: none; border-color: #5a67d8; }
        .search-input { background: #141720; color: #e2e8f0; border: 1px solid #2d3348; padding: 8px 14px; border-radius: 8px; font-family: inherit; font-size: 13px; width: 220px; }
        .search-input:focus { outline: none; border-color: #5a67d8; }
        .search-input::placeholder { color: #4a5568; }
        .kanban-col { min-width: 260px; max-width: 260px; background: #111318; border-radius: 12px; border: 1px solid #1e2130; flex-shrink: 0; }
        .kanban-col.drag-over { border-color: #5a67d8; background: #141720; }
        .kanban-card { background: #141720; border: 1px solid #1e2130; border-radius: 10px; padding: 14px; margin: 8px; cursor: grab; transition: box-shadow .15s, transform .1s; }
        .kanban-card:hover { box-shadow: 0 4px 20px rgba(0,0,0,.4); transform: translateY(-1px); }
        .kanban-card:active { cursor: grabbing; }
        .icon-btn { background: transparent; border: none; cursor: pointer; color: #4a5568; padding: 4px; border-radius: 4px; transition: color .15s; line-height: 1; }
        .icon-btn:hover { color: #a0aec0; }
        .view-toggle-btn { background: transparent; border: 1px solid #2d3348; color: #6b7a9e; padding: 7px 14px; font-family: inherit; font-size: 12px; cursor: pointer; transition: all .15s; }
        .view-toggle-btn.active { background: #1e2130; color: #e2e8f0; border-color: #5a67d8; }
        .view-toggle-btn:first-child { border-radius: 8px 0 0 8px; }
        .view-toggle-btn:last-child { border-radius: 0 8px 8px 0; border-left: none; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in { animation: fadeIn .25s ease; }
      `}</style>

      {/* ─── Header ─── */}
      <div style={{ padding: '24px 32px', borderBottom: '1px solid #1e2130', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: '#fff' }}>
            Deal Pipeline
          </div>
          <div style={{ fontSize: 12, color: '#4a5568', marginTop: 2 }}>Phase 1 MVP</div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn-ghost" onClick={() => setShowImport(true)}>↑ Import CSV</button>
          <button className="btn-primary" onClick={() => setShowNewDeal(true)}>+ New Deal</button>
        </div>
      </div>

      {/* ─── Stat Cards ─── */}
      {stats && (
        <div style={{ padding: '20px 32px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          <div className="stat-card fade-in">
            <div style={{ fontSize: 11, color: '#6b7a9e', textTransform: 'uppercase', letterSpacing: '.08em' }}>Total Active Deals</div>
            <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: '#fff', marginTop: 6 }}>{stats.totalDeals}</div>
          </div>
          <div className="stat-card fade-in">
            <div style={{ fontSize: 11, color: '#6b7a9e', textTransform: 'uppercase', letterSpacing: '.08em' }}>Total Asking Price</div>
            <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: '#10b981', marginTop: 6 }}>{formatCurrency(stats.totalAskingPrice)}</div>
          </div>
          <div className="stat-card fade-in">
            <div style={{ fontSize: 11, color: '#6b7a9e', textTransform: 'uppercase', letterSpacing: '.08em' }}>Weighted Pipeline</div>
            <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 28, fontWeight: 800, color: '#6366f1', marginTop: 6 }}>{formatCurrency(stats.weightedPipeline)}</div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4 }}>Stage probability weighted</div>
          </div>
          <div className="stat-card fade-in">
            <div style={{ fontSize: 11, color: '#6b7a9e', textTransform: 'uppercase', letterSpacing: '.08em' }}>Closing This Quarter</div>
            <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 32, fontWeight: 800, color: '#f59e0b', marginTop: 6 }}>{stats.closingThisQuarter}</div>
          </div>
        </div>
      )}

      {/* ─── Toolbar ─── */}
      <div style={{ padding: '0 32px 16px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          className="search-input"
          placeholder="Search deals…"
          value={search}
          onChange={e => handleSearch(e.target.value)}
        />
        <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
          <option value="">All Statuses</option>
          {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={filters.type} onChange={e => setFilters(f => ({...f, type: e.target.value}))}>
          <option value="">All Types</option>
          {['Acquisition','Disposition','Refinance','Development'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="filter-select" value={filters.assetType} onChange={e => setFilters(f => ({...f, assetType: e.target.value}))}>
          <option value="">All Asset Types</option>
          {['Multi-Family','Office','Retail','Industrial','Mixed-Use','Land','Hotel','Self-Storage','Other'].map(a => <option key={a} value={a}>{a}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex' }}>
          <button className={`view-toggle-btn ${view === 'table' ? 'active' : ''}`} onClick={() => setView('table')}>≡ Table</button>
          <button className={`view-toggle-btn ${view === 'kanban' ? 'active' : ''}`} onClick={() => setView('kanban')}>⬜ Kanban</button>
        </div>
      </div>

      {/* ─── Table View ─── */}
      {view === 'table' && (
        <div style={{ padding: '0 32px', overflowX: 'auto' }}>
          <table className="deals-table">
            <thead>
              <tr>
                {[
                  ['name','Deal'],['type','Type'],['status','Status'],['dealOwner','Owner'],
                  ['assetType','Asset Type'],['city','Location'],['closingDate','Closing'],
                  ['askingPrice','Asking Price'],['fundsNeeded','Funds Needed'],['capRate','Cap Rate'],
                ].map(([field, label]) => (
                  <th key={field} onClick={() => handleSort(field)}>
                    {label} {sort.field === field ? (sort.order === 'asc' ? '↑' : '↓') : ''}
                  </th>
                ))}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#4a5568' }}>Loading…</td></tr>
              ) : deals.length === 0 ? (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 40, color: '#4a5568' }}>No deals found. Import a CSV or create your first deal.</td></tr>
              ) : deals.map(deal => (
                <tr key={deal.id} className="fade-in">
                  <td>
                    <a href={`/deals/${deal.id}`} style={{ color: '#93c5fd', textDecoration: 'none', fontWeight: 500 }}>
                      {deal.name}
                    </a>
                  </td>
                  <td>
                    <span className="badge" style={{ background: `${TYPE_COLORS[deal.type] ?? '#6b7280'}22`, color: TYPE_COLORS[deal.type] ?? '#6b7280' }}>
                      {deal.type}
                    </span>
                  </td>
                  <td>
                    <select
                      value={deal.status}
                      onChange={e => handleStatusMove(deal.id, e.target.value)}
                      style={{
                        background: `${STATUS_COLORS[deal.status] ?? '#6b7280'}22`,
                        color: STATUS_COLORS[deal.status] ?? '#e2e8f0',
                        border: `1px solid ${STATUS_COLORS[deal.status] ?? '#6b7280'}44`,
                        borderRadius: 20,
                        padding: '3px 10px',
                        fontSize: 11,
                        fontFamily: 'inherit',
                        cursor: 'pointer',
                      }}
                    >
                      {PIPELINE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td style={{ color: '#a0aec0' }}>{deal.dealOwner}</td>
                  <td style={{ color: '#a0aec0' }}>{deal.assetType ?? '--'}</td>
                  <td style={{ color: '#a0aec0' }}>
                    {[deal.city, deal.state].filter(Boolean).join(', ') || '--'}
                  </td>
                  <td style={{ color: deal.closingDate && new Date(deal.closingDate) < new Date() ? '#f87171' : '#a0aec0' }}>
                    {formatDate(deal.closingDate)}
                  </td>
                  <td style={{ color: '#10b981', fontWeight: 500 }}>{formatCurrency(deal.askingPrice)}</td>
                  <td style={{ color: '#a0aec0' }}>{formatCurrency(deal.fundsNeeded)}</td>
                  <td style={{ color: '#a0aec0' }}>{formatPercent(deal.capRate)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <a href={`/deals/${deal.id}`} className="icon-btn" title="Edit">✎</a>
                      <button className="icon-btn" onClick={() => handleDelete(deal.id)} title="Delete" style={{ color: '#4a5568' }}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ padding: '12px 0', fontSize: 12, color: '#4a5568' }}>
            {deals.length} deal{deals.length !== 1 ? 's' : ''} shown
          </div>
        </div>
      )}

      {/* ─── Kanban View ─── */}
      {view === 'kanban' && (
        <div style={{ padding: '0 32px 32px', display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 32 }}>
          {PIPELINE_STAGES.map(stage => {
            const stageDeals = kanbanGroups[stage] ?? []
            const stageTotal = stageDeals.reduce((s, d) => s + (d.askingPrice ?? 0), 0)
            return (
              <div
                key={stage}
                className="kanban-col"
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('drag-over') }}
                onDragLeave={e => e.currentTarget.classList.remove('drag-over')}
                onDrop={e => {
                  e.currentTarget.classList.remove('drag-over')
                  if (dragging.current) handleStatusMove(dragging.current, stage)
                }}
              >
                {/* Column header */}
                <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid #1e2130' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[stage] ?? '#6b7280' }} />
                      <span style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0' }}>{stage}</span>
                    </div>
                    <span style={{ fontSize: 11, background: '#1e2130', color: '#6b7a9e', borderRadius: 12, padding: '2px 8px' }}>
                      {stageDeals.length}
                    </span>
                  </div>
                  {stageTotal > 0 && (
                    <div style={{ fontSize: 11, color: '#4a5568', marginTop: 4, paddingLeft: 16 }}>
                      {formatCurrency(stageTotal)}
                    </div>
                  )}
                </div>

                {/* Cards */}
                <div style={{ minHeight: 60 }}>
                  {stageDeals.map(deal => (
                    <div
                      key={deal.id}
                      className="kanban-card"
                      draggable
                      onDragStart={() => { dragging.current = deal.id }}
                      onDragEnd={() => { dragging.current = null }}
                      style={{ borderLeft: `3px solid ${TYPE_COLORS[deal.type] ?? '#6b7280'}` }}
                    >
                      <a href={`/deals/${deal.id}`} style={{ color: '#93c5fd', textDecoration: 'none', fontSize: 13, fontWeight: 500, display: 'block', marginBottom: 6 }}>
                        {deal.name}
                      </a>
                      <div style={{ fontSize: 11, color: '#6b7a9e', marginBottom: 4 }}>
                        {[deal.assetType, deal.city, deal.state].filter(Boolean).join(' · ') || '--'}
                      </div>
                      {deal.askingPrice != null && (
                        <div style={{ fontSize: 13, color: '#10b981', fontWeight: 500, marginBottom: 6 }}>
                          {formatCurrency(deal.askingPrice)}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <div style={{ fontSize: 11, color: '#4a5568' }}>{deal.dealOwner.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}</div>
                        {deal.closingDate && (
                          <div style={{ fontSize: 11, color: new Date(deal.closingDate) < new Date() ? '#f87171' : '#4a5568' }}>
                            ⏱ {formatDate(deal.closingDate)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add button */}
                <button
                  onClick={() => setShowNewDeal(true)}
                  style={{ width: '100%', background: 'transparent', border: 'none', color: '#4a5568', padding: '10px', fontSize: 12, cursor: 'pointer', borderTop: '1px solid #1e2130' }}
                >
                  + Add deal
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Import CSV Modal ─── */}
      {showImport && (
        <ImportModal onClose={() => { setShowImport(false); fetchDeals(); fetchStats() }} />
      )}

      {/* ─── New Deal Slide-over ─── */}
      {showNewDeal && (
        <NewDealSlideOver onClose={() => { setShowNewDeal(false); fetchDeals(); fetchStats() }} />
      )}
    </div>
  )
}

// ─── Import Modal ──────────────────────────────────────────────────────────────
function ImportModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    const form = new FormData()
    form.append('file', file)
    const res = await fetch('/api/deals/import', { method: 'POST', body: form })
    const json = await res.json()
    setResult(json)
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div style={{ background: '#141720', border: '1px solid #2d3348', borderRadius: 16, padding: 32, width: 480, fontFamily: "'DM Mono', monospace" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>Import CSV</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#6b7a9e', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        {!result ? (
          <>
            <div
              style={{ border: '2px dashed #2d3348', borderRadius: 10, padding: '32px 20px', textAlign: 'center', marginBottom: 20, background: file ? '#1a1d26' : 'transparent', cursor: 'pointer' }}
              onClick={() => document.getElementById('csv-input')?.click()}
            >
              <input id="csv-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <div style={{ fontSize: 13, color: '#6b7a9e' }}>
                {file ? file.name : 'Click or drag a CSV file here'}
              </div>
              <div style={{ fontSize: 11, color: '#4a5568', marginTop: 6 }}>
                Headers must match: Deal, Type, Status, Deal Owner, …
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={handleImport} disabled={!file || loading}>
                {loading ? 'Importing…' : 'Import'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ background: '#1a1d26', borderRadius: 10, padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, textAlign: 'center' }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{result.imported}</div>
                  <div style={{ fontSize: 11, color: '#6b7a9e' }}>Imported</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{result.skipped}</div>
                  <div style={{ fontSize: 11, color: '#6b7a9e' }}>Skipped</div>
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#f87171' }}>{result.errors?.length ?? 0}</div>
                  <div style={{ fontSize: 11, color: '#6b7a9e' }}>Errors</div>
                </div>
              </div>
            </div>
            {result.errors?.length > 0 && (
              <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 16 }}>
                {result.errors.map((e: any, i: number) => (
                  <div key={i} style={{ fontSize: 12, color: '#f87171', marginBottom: 6, background: '#1a1d26', padding: '6px 10px', borderRadius: 6 }}>
                    Row {e.row} · {e.field} · "{e.value}" — {e.reason}
                  </div>
                ))}
              </div>
            )}
            <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>Done</button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── New Deal Slide-Over ──────────────────────────────────────────────────────
function NewDealSlideOver({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    name: '', type: 'Acquisition', status: 'New', dealOwner: '',
    strategy: '', city: '', state: '', assetType: '',
    closingDate: '', askingPrice: '', fundsNeeded: '', capRate: '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    if (!form.name || !form.dealOwner) { alert('Deal name and owner are required'); return }
    setSaving(true)
    const parseCents = (v: string) => {
      const n = parseFloat(v.replace(/[$,]/g, ''))
      return isNaN(n) ? null : Math.round(n * 100)
    }
    await fetch('/api/deals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        askingPrice: parseCents(form.askingPrice),
        fundsNeeded: parseCents(form.fundsNeeded),
        capRate: form.capRate ? parseFloat(form.capRate.replace('%','')) / 100 : null,
        strategy:  form.strategy  || null,
        city:      form.city      || null,
        state:     form.state     || null,
        assetType: form.assetType || null,
        closingDate: form.closingDate || null,
      }),
    })
    setSaving(false)
    onClose()
  }

  const Field = ({ label, field, type = 'text', options }: { label: string, field: string, type?: string, options?: string[] }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, color: '#6b7a9e', marginBottom: 5, letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</label>
      {options ? (
        <select value={(form as any)[field]} onChange={e => setForm(f => ({...f, [field]: e.target.value}))} className="filter-select" style={{ width: '100%' }}>
          <option value="">-- Select --</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={(form as any)[field]}
          onChange={e => setForm(f => ({...f, [field]: e.target.value}))}
          style={{ width: '100%', background: '#1a1d26', color: '#e2e8f0', border: '1px solid #2d3348', padding: '8px 12px', borderRadius: 8, fontFamily: 'inherit', fontSize: 13 }}
        />
      )}
    </div>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ width: 440, background: '#141720', borderLeft: '1px solid #2d3348', height: '100%', overflowY: 'auto', padding: 28, fontFamily: "'DM Mono', monospace" }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Cabinet Grotesk', sans-serif", fontSize: 18, fontWeight: 800, color: '#fff' }}>New Deal</div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#6b7a9e', fontSize: 22, cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ fontSize: 11, color: '#5a67d8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12 }}>Overview</div>
        <Field label="Deal Name *" field="name" />
        <Field label="Type *" field="type" options={['Acquisition','Disposition','Refinance','Development']} />
        <Field label="Status *" field="status" options={PIPELINE_STAGES} />
        <Field label="Deal Owner *" field="dealOwner" />
        <Field label="Strategy" field="strategy" options={['Core','Core-Plus','Value-Add','Opportunistic','Development']} />

        <div style={{ fontSize: 11, color: '#5a67d8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12, marginTop: 20 }}>Location</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: 10 }}>
          <Field label="City" field="city" />
          <Field label="State" field="state" />
        </div>

        <div style={{ fontSize: 11, color: '#5a67d8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12, marginTop: 20 }}>Financials</div>
        <Field label="Asking Price" field="askingPrice" />
        <Field label="Funds Needed" field="fundsNeeded" />
        <Field label="Cap Rate (%)" field="capRate" />

        <div style={{ fontSize: 11, color: '#5a67d8', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 12, marginTop: 20 }}>Asset Details</div>
        <Field label="Asset Type" field="assetType" options={['Multi-Family','Office','Retail','Industrial','Mixed-Use','Land','Hotel','Self-Storage','Other']} />
        <Field label="Closing Date" field="closingDate" type="date" />

        <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid #1e2130' }}>
          <button className="btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit} disabled={saving} style={{ flex: 2 }}>
            {saving ? 'Creating…' : 'Create Deal'}
          </button>
        </div>
      </div>
    </div>
  )
}
