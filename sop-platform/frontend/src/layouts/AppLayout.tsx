import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { JSX } from 'react'

export default function AppLayout(): JSX.Element {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg-primary)' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 'var(--sidebar-w)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Topbar />
        <main style={{ flex: 1, paddingTop: 'var(--topbar-h)', padding: 'var(--topbar-h) var(--sp-8) var(--sp-8)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', animation: 'fadeIn 200ms ease both' }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
