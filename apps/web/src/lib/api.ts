const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

let tokenInMemory: string | null = null;

export function setAccessToken(token: string | null) {
  tokenInMemory = token;
}

export function getAccessToken() {
  return tokenInMemory;
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (tokenInMemory) {
    headers['Authorization'] = `Bearer ${tokenInMemory}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
    credentials: 'omit'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API Request failed');
  }

  return data;
}
