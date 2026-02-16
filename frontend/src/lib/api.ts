// =============================================================================
// API Client for Haskell Backend
// =============================================================================

import type {
  AuthResponse,
  UserCreate,
  UserLogin,
  Project,
  ProjectCreate,
  ProjectUpdate,
  Diagram,
  DiagramCreate,
  DiagramUpdate,
  Scale,
  ScaleShape,
  Tuning,
  ApiError,
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
export const AUTH_TOKENS_CLEARED_EVENT = 'auth:tokens-cleared';

// =============================================================================
// Token Management
// =============================================================================

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function setTokens(access: string, refresh: string): void {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
  }
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  if (typeof window !== 'undefined') {
    accessToken = localStorage.getItem('accessToken');
  }
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (refreshToken) return refreshToken;
  if (typeof window !== 'undefined') {
    refreshToken = localStorage.getItem('refreshToken');
  }
  return refreshToken;
}

export function clearTokens(): void {
  accessToken = null;
  refreshToken = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('auth-storage');
    window.dispatchEvent(new Event(AUTH_TOKENS_CLEARED_EVENT));
  }
}

// =============================================================================
// HTTP Client
// =============================================================================

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const token = getAccessToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 && token) {
    // Try to refresh token
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      // Retry request with new token
      (headers as Record<string, string>)['Authorization'] = `Bearer ${getAccessToken()}`;
      const retryResponse = await fetch(url, { ...options, headers });
      if (!retryResponse.ok) {
        throw await parseError(retryResponse);
      }
      return retryResponse.json();
    }
    clearTokens();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    throw await parseError(response);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

async function parseError(response: Response): Promise<Error> {
  try {
    const data = await response.json() as ApiError;
    return new Error(data.error?.message || 'An error occurred');
  } catch {
    return new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
}

async function tryRefreshToken(): Promise<boolean> {
  const refresh = getRefreshToken();
  if (!refresh) return false;

  try {
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: refresh }),
    });

    if (!response.ok) return false;

    const data = await response.json() as AuthResponse;
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

// =============================================================================
// Auth API
// =============================================================================

export async function register(data: UserCreate): Promise<AuthResponse> {
  const response = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  setTokens(response.accessToken, response.refreshToken);
  return response;
}

export async function login(data: UserLogin): Promise<AuthResponse> {
  const response = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  setTokens(response.accessToken, response.refreshToken);
  return response;
}

export function logout(): void {
  clearTokens();
}

// =============================================================================
// Projects API
// =============================================================================

export async function listProjects(): Promise<Project[]> {
  return request<Project[]>('/projects');
}

export async function createProject(data: ProjectCreate): Promise<Project> {
  return request<Project>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getProject(id: string): Promise<Project> {
  return request<Project>(`/projects/${id}`);
}

export async function updateProject(id: string, data: ProjectUpdate): Promise<Project> {
  return request<Project>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<void> {
  return request<void>(`/projects/${id}`, { method: 'DELETE' });
}

// =============================================================================
// Diagrams API
// =============================================================================

export async function listDiagrams(projectId: string): Promise<Diagram[]> {
  return request<Diagram[]>(`/projects/${projectId}/diagrams`);
}

export async function createDiagram(projectId: string, data: DiagramCreate): Promise<Diagram> {
  return request<Diagram>(`/projects/${projectId}/diagrams`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateDiagram(id: string, data: DiagramUpdate): Promise<Diagram> {
  return request<Diagram>(`/diagrams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDiagram(id: string): Promise<void> {
  return request<void>(`/diagrams/${id}`, { method: 'DELETE' });
}

// =============================================================================
// Scales API (Public)
// =============================================================================

export async function listScales(category?: string): Promise<Scale[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return request<Scale[]>(`/scales${query}`);
}

export async function getScale(id: string): Promise<Scale> {
  return request<Scale>(`/scales/${id}`);
}

export async function getScaleShapes(scaleId: string): Promise<ScaleShape[]> {
  return request<ScaleShape[]>(`/scales/${scaleId}/shapes`);
}

// =============================================================================
// Tunings API (Public)
// =============================================================================

export async function listTunings(category?: string): Promise<Tuning[]> {
  const query = category ? `?category=${encodeURIComponent(category)}` : '';
  return request<Tuning[]>(`/tunings${query}`);
}
