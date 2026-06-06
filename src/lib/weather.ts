const KARACHI = { lat: 24.8607, lng: 67.0011, timezone: 'Asia/Karachi' };

async function resolveCity(city: string): Promise<{ lat: number; lng: number; timezone: string; name: string }> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url, { next: { revalidate: 86400 } } as RequestInit);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();
  const r = data?.results?.[0];
  if (!r) throw new Error(`City not found: ${city}`);
  return { lat: r.latitude, lng: r.longitude, timezone: r.timezone, name: r.name };
}

export async function getWeather(city?: string) {
  let loc: { lat: number; lng: number; timezone: string; name?: string };

  if (city && city.toLowerCase() !== 'karachi') {
    loc = await resolveCity(city);
  } else {
    loc = { ...KARACHI, name: 'Karachi' };
  }

  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${loc.lat}&longitude=${loc.lng}` +
    `&current=temperature_2m,weather_code,relative_humidity_2m,precipitation,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=${encodeURIComponent(loc.timezone)}&forecast_days=1`;

  const res = await fetch(url, { next: { revalidate: 600 } } as RequestInit);
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  const data = await res.json();

  return {
    city: (loc as any).name ?? city,
    current_temp: data.current.temperature_2m,
    humidity: data.current.relative_humidity_2m,
    precipitation: data.current.precipitation,
    wind: data.current.wind_speed_10m,
    high: data.daily.temperature_2m_max[0],
    low: data.daily.temperature_2m_min[0],
    precip_today: data.daily.precipitation_sum[0],
    weather_code: data.current.weather_code,
  };
}
