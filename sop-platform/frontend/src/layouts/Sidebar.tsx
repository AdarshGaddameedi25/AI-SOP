import { JSX } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Role } from '../types'

interface NavItem { label: string; path: string; roles: Role[] }

const NAV: NavItem[] = [
  { label: 'My SOPs',         path: '/author/sops',      roles: ['author']   },
  { label: 'Review Queue',    path: '/reviewer',         roles: ['reviewer'] },
  { label: 'Approval Queue',  path: '/approver',         roles: ['approver'] },
  { label: 'Dashboard',       path: '/admin',            roles: ['admin']    },
  { label: 'User Management', path: '/admin/users',      roles: ['admin']    },
  { label: 'Audit Logs',      path: '/admin/audit-logs', roles: ['admin']    },
]

export default function Sidebar(): JSX.Element {
  const { user } = useAuth()
  if (!user) return <div />

  const navItems = NAV.filter(item => item.roles.includes(user.role))

  return (
    <aside style={{ width: 'var(--sidebar-w)', backgroundColor: '#ffffff', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 100 }}>

      <div style={{ height: 'var(--topbar-h)', display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.04em', color: 'var(--text-primary)' }}>
          SOP COMPLIANCE
        </span>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {navItems.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              padding: '9px 14px',
              borderRadius: 'var(--r-sm)',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: '13px',
              transition: 'all 0.15s',
              textDecoration: 'none',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

    </aside>
  )
}
