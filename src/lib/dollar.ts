const CACHE_KEY = 'mi-presupuesto-dolar-v1';
const TTL_MS = 60 * 60 * 1000;
const USD_QUOTE_URL = 'https://cl.dolarapi.com/v1/cotizaciones/usd';

export type DollarQuote = {
  rate: number;
  updatedAt: string;
};

type DollarCache = DollarQuote & { fetchedAt: number };

function parseCache(raw: string | null): DollarCache | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as DollarCache;
    if (typeof parsed.rate !== 'number' || !Number.isFinite(parsed.rate) || parsed.rate <= 0) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readDollarCache(): DollarQuote | null {
  if (typeof localStorage === 'undefined') return null;
  const cached = parseCache(localStorage.getItem(CACHE_KEY));
  if (!cached) return null;
  return { rate: cached.rate, updatedAt: cached.updatedAt };
}

let inFlight: Promise<DollarQuote | null> | null = null;

export async function loadDollarQuote(): Promise<DollarQuote | null> {
  const cached = parseCache(typeof localStorage === 'undefined' ? null : localStorage.getItem(CACHE_KEY));
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return { rate: cached.rate, updatedAt: cached.updatedAt };
  }

  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await fetch(USD_QUOTE_URL);
      if (!res.ok) throw new Error('usd-quote');
      const data = await res.json();
      const rate = Number(data.venta);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error('usd-quote');
      const quote: DollarQuote = {
        rate,
        updatedAt: typeof data.fechaActualizacion === 'string' ? data.fechaActualizacion : new Date().toISOString(),
      };
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ ...quote, fetchedAt: Date.now() } satisfies DollarCache)
      );
      return quote;
    } catch {
      return cached ? { rate: cached.rate, updatedAt: cached.updatedAt } : null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
