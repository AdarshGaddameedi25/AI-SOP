import React, { useState, useRef, useEffect, JSX } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { Role } from '../types'

import SearchModal from '../components/SearchModal'

export default function Topbar(): JSX.Element {
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications()
  const navigate = useNavigate()

  const [bellOpen, setBellOpen] = useState(false)

  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false)
      }
    }
    if (bellOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [bellOpen])

  if (!user) return <div />

  const getRoleBadgeStyle = (role: Role) => {
    const styles: Record<Role, { bg: string; color: string }> = {
      author: { bg: 'rgba(71,85,105,0.15)', color: '#94a3b8' },
      reviewer: { bg: 'rgba(217,119,6,0.15)', color: '#fbbf24' },
      approver: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa' },
      admin: { bg: 'rgba(99,102,241,0.15)', color: '#c7d2fe' }
    }
    return styles[role] || { bg: 'var(--bg-card)', color: 'var(--text-secondary)' }
  }

  const badgeStyle = getRoleBadgeStyle(user.role)

  const handleBellClick = () => {
    setBellOpen((prev) => !prev)
  }

  const handleNotificationClick = (n: typeof notifications[0]) => {
    markRead(n.id)
    setBellOpen(false)
    navigate(`/author/sop/${n.sopId}`)
  }

  return (
    <header style={{
      height: 'var(--topbar-h)',
      backgroundColor: 'var(--bg-primary)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--sp-6)',
      position: 'fixed',
      top: 0,
      left: 'var(--sidebar-w)',
      right: 0,
      zIndex: 90
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-6)' }}>
        {user.role === 'author' && <SearchModal />}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--sp-4)'
      }}>
        {user.role === 'author' && (
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              id="notification-bell-btn"
              onClick={handleBellClick}
              title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
              style={{
                position: 'relative',
                background: bellOpen ? 'var(--bg-card-hover)' : 'none',
                border: '1px solid ' + (bellOpen ? 'var(--border-strong)' : 'transparent'),
                borderRadius: 'var(--r-sm)',
                color: unreadCount > 0 ? 'var(--warning)' : 'var(--text-muted)',
                cursor: 'pointer',
                padding: '6px 8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                if (!bellOpen) {
                  e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'
                  e.currentTarget.style.borderColor = 'var(--border)'
                }
              }}
              onMouseLeave={(e) => {
                if (!bellOpen) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.borderColor = 'transparent'
                }
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  minWidth: '16px',
                  height: '16px',
                  backgroundColor: 'var(--error)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  borderRadius: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                  lineHeight: 1,
                  border: '2px solid var(--bg-primary)',
                  animation: 'fadeInFast 200ms ease both',
                }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            {bellOpen && (
              <div
                id="notification-dropdown"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  width: '360px',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--r-md)',
                  boxShadow: 'var(--shadow-modal)',
                  zIndex: 200,
                  overflow: 'hidden',
                  animation: 'fadeIn 180ms ease both',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  borderBottom: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-primary)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Notifications
                    </span>
                    {unreadCount > 0 && (
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 700,
                        backgroundColor: 'var(--error)',
                        color: '#fff',
                        padding: '1px 6px',
                        borderRadius: '100px',
                      }}>
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {notifications.length > 0 && unreadCount > 0 && (
                    <button
                      onClick={markAllRead}
                      style={{
                        fontSize: '11px',
                        color: 'var(--accent-text)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '2px 4px',
                        borderRadius: 'var(--r-sm)',
                        fontWeight: 500,
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div style={{ maxHeight: '340px', overflowY: 'auto' }}>
                  {notifications.length === 0 ? (
                    <div style={{
                      padding: '32px 16px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                    }}>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>No notifications</div>
                      <div style={{ fontSize: '12px', marginTop: '4px', color: 'var(--text-muted)' }}>
                        Reviewer feedback will appear here
                      </div>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        style={{
                          padding: '12px 16px',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          backgroundColor: n.read ? 'transparent' : 'rgba(220, 38, 38, 0.03)',
                          transition: 'background var(--transition-fast)',
                          display: 'flex',
                          gap: '10px',
                          alignItems: 'flex-start',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = n.read ? 'transparent' : 'rgba(220, 38, 38, 0.03)'}
                      >
                        <div style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: n.read ? 'transparent' : 'var(--error)',
                          flexShrink: 0,
                          marginTop: '5px',
                          border: n.read ? '1.5px solid var(--border)' : 'none',
                        }} />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: '12px',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            marginBottom: '2px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}>
                            <span style={{
                              backgroundColor: 'var(--error-subtle)',
                              color: 'var(--error)',
                              padding: '1px 5px',
                              borderRadius: '4px',
                              fontSize: '10px',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}>
                              REJECTED
                            </span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {n.sopNumber}
                            </span>
                          </div>

                          <div style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {n.title}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.4,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {n.message}
                          </div>

                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginTop: '6px',
                          }}>
                            <span style={{ fontSize: '11px', color: 'var(--accent-text)', fontWeight: 500 }}>
                              Click to view &amp; edit →
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                {notifications.length > 0 && (
                  <div style={{
                    padding: '8px 16px',
                    borderTop: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-primary)',
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                  }}>
                    Showing rejected SOP feedback · Click to open document
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <div style={{
          width: '1px',
          height: '16px',
          backgroundColor: 'var(--border)'
        }} />
        <span style={{
          color: 'var(--text-primary)',
          fontWeight: 500,
          fontSize: '13px'
        }}>
          {user.username}
        </span>
        <span style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          padding: '2px 8px',
          borderRadius: '100px',
          backgroundColor: badgeStyle.bg,
          color: badgeStyle.color,
          border: `1px solid ${badgeStyle.color}20`
        }}>
          {user.role}
        </span>
        <div style={{
          width: '1px',
          height: '16px',
          backgroundColor: 'var(--border)'
        }} />
        <button
          onClick={logout}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '4px 8px',
            borderRadius: 'var(--r-sm)',
            transition: 'all var(--transition-fast)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--error)'
            e.currentTarget.style.backgroundColor = 'var(--error-subtle)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-secondary)'
            e.currentTarget.style.backgroundColor = 'transparent'
          }}
        >
          Sign Out
        </button>
      </div>
    </header>
  )
}
