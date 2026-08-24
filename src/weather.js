// WMO weather codes -> French label + emoji icon. Table verified against
// Open-Meteo's docs (https://open-meteo.com/en/docs), not guessed.
const WEATHER_LABELS = {
  0: { label: "Ciel dégagé", icon: "☀️" },
  1: { label: "Peu nuageux", icon: "🌤️" },
  2: { label: "Partiellement nuageux", icon: "⛅" },
  3: { label: "Couvert", icon: "☁️" },
  45: { label: "Brouillard", icon: "🌫️" },
  48: { label: "Brouillard givrant", icon: "🌫️" },
  51: { label: "Bruine légère", icon: "🌦️" },
  53: { label: "Bruine", icon: "🌦️" },
  55: { label: "Bruine dense", icon: "🌦️" },
  56: { label: "Bruine verglaçante", icon: "🌧️" },
  57: { label: "Bruine verglaçante dense", icon: "🌧️" },
  61: { label: "Pluie légère", icon: "🌧️" },
  63: { label: "Pluie", icon: "🌧️" },
  65: { label: "Pluie forte", icon: "🌧️" },
  66: { label: "Pluie verglaçante", icon: "🌧️" },
  67: { label: "Pluie verglaçante forte", icon: "🌧️" },
  71: { label: "Neige légère", icon: "🌨️" },
  73: { label: "Neige", icon: "🌨️" },
  75: { label: "Neige forte", icon: "🌨️" },
  77: { label: "Neige en grains", icon: "🌨️" },
  80: { label: "Averses légères", icon: "🌦️" },
  81: { label: "Averses", icon: "🌦️" },
  82: { label: "Averses violentes", icon: "🌧️" },
  85: { label: "Averses de neige", icon: "🌨️" },
  86: { label: "Averses de neige fortes", icon: "🌨️" },
  95: { label: "Orage", icon: "⛈️" },
  96: { label: "Orage avec grêle", icon: "⛈️" },
  99: { label: "Orage violent avec grêle", icon: "⛈️" },
};

export function describeWeatherCode(code) {
  return WEATHER_LABELS[code] || { label: "Météo indisponible", icon: "🌡️" };
}

export async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=Europe/Paris`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Échec du chargement de la météo (${response.status})`);
  const data = await response.json();
  const { label, icon } = describeWeatherCode(data.current.weather_code);
  return {
    temperature: Math.round(data.current.temperature_2m),
    label,
    icon,
  };
}
