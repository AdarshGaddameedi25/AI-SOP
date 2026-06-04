import { JSX, createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User, LoginCredentials, RegisterPayload } from '../types'
import { loginApi, registerApi, getCurrentUserApi } from '../api/auth'
import { getToken, setToken, getStoredUser, setStoredUser, clearToken } from '../utils/tokenHelpers'

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  loading: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (payload: RegisterPayload) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUserState] = useState<User | null>(null)
  const [token, setTokenState] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    async function initializeAuth() {
      const savedToken = getToken()
      const savedUser = getStoredUser<User>()

      if (savedToken && savedUser) {
        setTokenState(savedToken)
        setUserState(savedUser)

        try {
          const res = await getCurrentUserApi()
          if (res.success && res.data) {
            setUserState(res.data)
            setStoredUser(res.data)
          }
        } catch (err) {
          console.error('Failed to sync user profile at startup:', err)
        }
      }
      setLoading(false)
    }

    initializeAuth()
  }, [])

  const login = async (credentials: LoginCredentials) => {
    setLoading(true)
    try {
      const res = await loginApi(credentials)
      if (res.success && res.data) {
        const { access_token, user: loggedUser } = res.data
        setToken(access_token)
        setStoredUser(loggedUser)
        setTokenState(access_token)
        setUserState(loggedUser)
      } else {
        throw new Error(res.error || 'Login failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const register = async (payload: RegisterPayload) => {
    setLoading(true)
    try {
      const res = await registerApi(payload)
      if (!res.success) {
        throw new Error(res.error || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    clearToken()
    setTokenState(null)
    setUserState(null)
  }

  const refreshUser = async () => {
    try {
      const res = await getCurrentUserApi()
      if (res.success && res.data) {
        setUserState(res.data)
        setStoredUser(res.data)
      }
    } catch (err) {
      console.error('Failed to refresh user:', err)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        loading,
        login,
        register,
        logout,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
