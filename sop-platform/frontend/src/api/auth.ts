import axiosInstance from './axiosInstance'
import { ApiResponse, User, LoginCredentials, RegisterPayload } from '../types'

export async function loginApi(credentials: LoginCredentials): Promise<ApiResponse<{ access_token: string; user: User }>> {
  const response = await axiosInstance.post<ApiResponse<{ access_token: string; user: User }>>('/auth/login', credentials)
  return response.data
}

export async function registerApi(payload: RegisterPayload): Promise<ApiResponse<User>> {
  const response = await axiosInstance.post<ApiResponse<User>>('/auth/register', payload)
  return response.data
}

export async function getCurrentUserApi(): Promise<ApiResponse<User>> {
  const response = await axiosInstance.get<ApiResponse<User>>('/auth/me')
  return response.data
}
