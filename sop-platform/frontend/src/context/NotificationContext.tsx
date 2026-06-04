import { JSX, createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { SOP } from '../types'
import { listSopsApi } from '../api/sop'
import { useAuth } from './AuthContext'

interface Notification {
  id: string
  sopId: string
  sopNumber: string
  title: string
  message: string
  type: 'rejection'
  read: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  markAllRead: () => void
  markRead: (id: string) => void
  refresh: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: ReactNode }): JSX.Element {
  const { user, isAuthenticated } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'author') {
      setNotifications([])
      return
    }
    try {
      const res = await listSopsApi(1, 50)
      if (res.success && res.data) {
        const rejectedSops: SOP[] = res.data.sops.filter(
          (s) => s.status === 'review_rejected' && s.rejection_comments
        )
        setNotifications((prev) => {
          const prevReadMap = new Map(prev.map((n) => [n.sopId, n.read]))
          return rejectedSops.map((sop) => ({
            id: sop.id,
            sopId: sop.id,
            sopNumber: sop.sop_number || `ID-${sop.id}`,
            title: sop.title,
            message: sop.rejection_comments || '',
            type: 'rejection' as const,
            read: prevReadMap.get(sop.id) ?? false,
          }))
        })
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }, [isAuthenticated, user?.role])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, markAllRead, markRead, refresh: fetchNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications(): NotificationContextType {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}
