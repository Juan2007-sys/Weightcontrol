import { apiClient, setAuthToken } from './apiClient';

export interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'TECNICO' | 'AUDITOR_SIC' | 'INSTITUCION_ACREDITACION' | 'CIUDADANO' | string;
  cargo?: string;
  activo: boolean;
}

export interface AuthResponse {
  access_token: string;
  user: UserProfile;
}

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    if (response.access_token) {
      setAuthToken(response.access_token);
      localStorage.setItem('wc_auth_user', JSON.stringify(response.user));
    }
    return response;
  },

  register: async (data: {
    nombre: string;
    email: string;
    password: string;
    rol?: string;
    cargo?: string;
  }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    if (response.access_token) {
      setAuthToken(response.access_token);
      localStorage.setItem('wc_auth_user', JSON.stringify(response.user));
    }
    return response;
  },

  getProfile: async (): Promise<UserProfile> => {
    return apiClient.get<UserProfile>('/auth/profile');
  },

  logout: (): void => {
    setAuthToken(null);
    localStorage.removeItem('wc_auth_user');
  },

  getStoredUser: (): UserProfile | null => {
    const userStr = localStorage.getItem('wc_auth_user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },
};
