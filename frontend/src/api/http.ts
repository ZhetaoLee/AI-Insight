export async function fetchJson<T>(url: string, errorLabel = `GET ${url} failed`): Promise<T> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`${errorLabel}: ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchJsonWithNetworkFallback<T>(
  url: string,
  fallback: () => T,
  errorLabel: string
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    return fallback();
  }

  if (!res.ok) {
    throw new Error(`${errorLabel}: ${res.status}`);
  }
  return (await res.json()) as T;
}
