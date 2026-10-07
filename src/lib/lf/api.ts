// ─── Learn & Fun — typed fetch client for API routes ───

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(
  url: string,
  options?: RequestInit & { json?: unknown }
): Promise<T> {
  const { json, ...rest } = options ?? {}
  const res = await fetch(url, {
    ...rest,
    headers: {
      ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    credentials: 'same-origin',
  })
  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    const message =
      (data as { error?: string } | null)?.error ??
      'Something went wrong. Please try again.'
    throw new ApiError(res.status, message)
  }
  return data as T
}

export const api = {
  get: <T>(url: string) => request<T>(url),
  post: <T>(url: string, json?: unknown) => request<T>(url, { method: 'POST', json }),
  patch: <T>(url: string, json?: unknown) => request<T>(url, { method: 'PATCH', json }),
  put: <T>(url: string, json?: unknown) => request<T>(url, { method: 'PUT', json }),
  del: <T>(url: string) => request<T>(url, { method: 'DELETE' }),
}
