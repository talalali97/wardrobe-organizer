const KARACHI = { lat: 24.8607, lng: 67.0011 };

export async function getKarachiWeather() {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${KARACHI.lat}&longitude=${KARACHI.lng}` +
    `&current=temperature_2m,weather_code,relative_humidity_2m,precipitation,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum` +
    `&timezone=Asia%2FKarachi&forecast_days=1`;

  const res = await fetch(url, { next: { revalidate: 600 } } as RequestInit);
  if (!res.ok) throw new Error(`Weather fetch failed: ${res.status}`);
  const data = await res.json();

  return {
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
