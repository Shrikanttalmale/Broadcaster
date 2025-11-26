import api from './api';

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  licenseId?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export const authService = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/api/v1/auth/login', { username, password });
    const { accessToken, refreshToken } = response.data.data;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    return response.data.data;
  },

  register: async (username: string, email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post('/api/v1/auth/register', { username, email, password });
    const { accessToken, refreshToken } = response.data.data;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    return response.data.data;
  },

  logout: async (): Promise<void> => {
    await api.post('/api/v1/auth/logout');
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/v1/auth/me');
    return response.data;
  },

  changePassword: async (oldPassword: string, newPassword: string): Promise<void> => {
    await api.post('/api/v1/auth/change-password', { oldPassword, newPassword });
  },
};

export const userService = {
  getUsers: async (): Promise<User[]> => {
    const response = await api.get('/users');
    return response.data;
  },

  getUserById: async (id: string): Promise<User> => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  createUser: async (userData: Partial<User>): Promise<User> => {
    const response = await api.post('/users', userData);
    return response.data;
  },

  updateUser: async (id: string, userData: Partial<User>): Promise<User> => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },

  deleteUser: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  changeUserRole: async (id: string, role: string): Promise<User> => {
    const response = await api.put(`/users/${id}/role`, { role });
    return response.data;
  },

  assignLicense: async (id: string, licenseId: string): Promise<User> => {
    const response = await api.put(`/users/${id}/license`, { licenseId });
    return response.data;
  },

  getUserPermissions: async (id: string): Promise<any> => {
    const response = await api.get(`/users/${id}/permissions`);
    return response.data;
  },
};

export const licenseService = {
  getLicenses: async (): Promise<any[]> => {
    const response = await api.get('/licenses');
    return response.data;
  },

  getLicenseById: async (id: string): Promise<any> => {
    const response = await api.get(`/licenses/${id}`);
    return response.data;
  },

  generateLicense: async (licenseData: any): Promise<any> => {
    const response = await api.post('/licenses', licenseData);
    return response.data;
  },

  updateLicense: async (id: string, licenseData: any): Promise<any> => {
    const response = await api.put(`/licenses/${id}`, licenseData);
    return response.data;
  },

  deleteLicense: async (id: string): Promise<void> => {
    await api.delete(`/licenses/${id}`);
  },

  validateLicense: async (id: string): Promise<any> => {
    const response = await api.post(`/licenses/${id}/validate`);
    return response.data;
  },

  getFeatures: async (id: string): Promise<any> => {
    const response = await api.get(`/licenses/${id}/features`);
    return response.data;
  },

  enableFeature: async (id: string, feature: string): Promise<any> => {
    const response = await api.post(`/licenses/${id}/features/${feature}/enable`);
    return response.data;
  },
};
