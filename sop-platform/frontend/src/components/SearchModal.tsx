import React, { useState, useEffect, useRef, JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../api/axiosInstance'

interface SearchResult {
  sop: {
    id: number;
    title: string;
    department: string;
    status: string;
    description: string | null;
  };
}

export default function SearchModal(): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get(`/sop/search?q=${encodeURIComponent(query)}&limit=5`)
      if (response.data.success) {
        setResults(response.data.data.results || [])
      } else {
        setError(response.data.error || 'Search failed')
      }
    } catch (err: unknown) {
      const e = err as any
      setError(e.response?.data?.error || e.message || 'An error occurred during search')
    } finally {
      setLoading(false)
    }
  }

  const handleResultClick = (sopId: string) => {
    setIsOpen(false)
    const userRole = localStorage.getItem('token') ? JSON.parse(atob(localStorage.getItem('token')!.split('.')[1])).role : 'author'

    if (userRole === 'admin') navigate(`/admin/sop/${sopId}`, { state: { highlightQuery: query } })
    else if (userRole === 'reviewer') navigate(`/reviewer/sop/${sopId}`, { state: { highlightQuery: query } })
    else if (userRole === 'approver') navigate(`/approver/sop/${sopId}`, { state: { highlightQuery: query } })
    else navigate(`/author/sop/${sopId}`, { state: { highlightQuery: query } })
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--sp-2)',
          padding: '6px 12px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-md)',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          fontSize: '13px',
          transition: 'all var(--transition-fast)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
      >
        <span style={{ opacity: 0.7 }}></span>
        <span>Search by Title...</span>
        <kbd style={{
          marginLeft: '8px',
          padding: '2px 6px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '4px',
          fontSize: '10px',
          border: '1px solid var(--border)',
          fontFamily: 'monospace'
        }}>Ctrl K</kbd>
      </button>

      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            paddingTop: '10vh'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '650px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--r-md)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '80vh',
              animation: 'slideDown 0.2s ease-out forwards'
            }}
          >
            <style>
              {`
                @keyframes slideDown {
                  from { opacity: 0; transform: translateY(-20px) scale(0.98); }
                  to { opacity: 1; transform: translateY(0) scale(1); }
                }
              `}
            </style>

            <form onSubmit={handleSearch} style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 var(--sp-4)' }}>
              <span style={{ fontSize: '18px', marginRight: 'var(--sp-2)', opacity: 0.7 }}></span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search SOPs by title..."
                style={{
                  width: '100%',
                  padding: 'var(--sp-4) 0',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '16px',
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--r-sm)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px'
                }}
              >
                Search
              </button>
            </form>

            <div style={{ overflowY: 'auto', padding: 'var(--sp-2)' }}>
              {loading && (
                <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  <div style={{ display: 'inline-block', border: '2px solid var(--border)', borderTop: '2px solid var(--accent)', borderRadius: '50%', width: '20px', height: '20px', animation: 'spin 1s linear infinite' }} />
                  <p style={{ marginTop: 'var(--sp-2)', fontSize: '13px' }}>Searching SOPs...</p>
                </div>
              )}

              {error && (
                <div style={{ padding: 'var(--sp-4)', color: 'var(--error)', backgroundColor: 'var(--error-subtle)', borderRadius: 'var(--r-sm)', margin: 'var(--sp-2)', fontSize: '13px' }}>
                  {error}
                </div>
              )}

              {!loading && !error && results.length === 0 && query && (
                <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No matches found. Try a different title.
                </div>
              )}

              {!loading && results.map((result, idx) => {
                return (
                  <div
                    key={idx}
                    onClick={() => handleResultClick(result.sop.id.toString())}
                    style={{
                      padding: 'var(--sp-3)',
                      margin: 'var(--sp-1) 0',
                      borderRadius: 'var(--r-sm)',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 'var(--sp-2)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                        {result.sop.title}
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', padding: '2px 6px', backgroundColor: 'var(--bg-primary)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                          {result.sop.department}
                        </span>
                      </div>
                    </div>
                    {result.sop.description && (
                      <div style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        backgroundColor: 'rgba(0,0,0,0.2)',
                        padding: 'var(--sp-2)',
                        borderRadius: '4px',
                        borderLeft: '2px solid var(--accent)'
                      }}>
                        "...{result.sop.description}..."
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
