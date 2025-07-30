import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Try to parse JSON and extract message
    try {
      const errorData = JSON.parse(text);
      const message = errorData.message || text;
      const error = new Error(message);
      (error as any).status = res.status;
      throw error;
    } catch {
      // If not JSON, use the raw text
      const error = new Error(`${res.status}: ${text}`);
      (error as any).status = res.status;
      throw error;
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Log network errors for monitoring
    if (error instanceof Error && (
      error.message.includes('Failed to fetch') || 
      error.message.includes('ERR_INTERNET_DISCONNECTED') ||
      error.message.includes('NetworkError') ||
      error.name === 'AbortError'
    )) {
      console.warn('Network error detected in apiRequest:', error.message);
      // Re-throw the error so it can be handled by the calling code
      throw new Error('Conexão com o servidor perdida');
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Handle network errors in queries
      if (error instanceof Error && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('ERR_INTERNET_DISCONNECTED') ||
        error.message.includes('NetworkError') ||
        error.name === 'AbortError'
      )) {
        console.warn('Network error detected in query:', error.message);
        throw new Error('Conexão com o servidor perdida');
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
