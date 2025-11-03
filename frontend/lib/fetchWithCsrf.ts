// lib/fetchWithCsrf.ts

async function getCsrfToken(): Promise<string> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/csrf/`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Αποτυχία λήψης CSRF Token');
    }
  
    const data = await response.json();
  
    // Αποθήκευση token σε cookie για συμβατότητα
    document.cookie = `csrftoken=${data.csrfToken}; path=/`;
  
    return data.csrfToken;
  }
  
  export async function fetchWithCsrf(url: string, options: RequestInit = {}) {
    const csrfToken = await getCsrfToken();
  
    const headers = {
      ...(options.headers || {}),
      'X-CSRFToken': csrfToken,
      'Content-Type': 'application/json',
    };
  
    return fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Πάντα credentials για session auth
    });
  }
  