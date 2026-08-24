import { describe, it, expect, vi, afterEach } from "vitest";
import { describeWeatherCode, fetchWeather } from "../src/weather.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("describeWeatherCode", () => {
  it("maps known WMO codes to a French label and icon", () => {
    expect(describeWeatherCode(0)).toEqual({ label: "Ciel dégagé", icon: "☀️" });
    expect(describeWeatherCode(63)).toEqual({ label: "Pluie", icon: "🌧️" });
    expect(describeWeatherCode(95)).toEqual({ label: "Orage", icon: "⛈️" });
  });

  it("falls back to a neutral label for an unrecognized code", () => {
    expect(describeWeatherCode(999)).toEqual({ label: "Météo indisponible", icon: "🌡️" });
  });
});

describe("fetchWeather", () => {
  it("fetches and formats the current temperature and weather label", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ current: { temperature_2m: 22.6, weather_code: 61 } }),
      })
    );
    const result = await fetchWeather(48.892213, 2.29132);
    expect(result).toEqual({ temperature: 23, label: "Pluie légère", icon: "🌧️" });
  });

  it("throws a readable error on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
    await expect(fetchWeather(48.892213, 2.29132)).rejects.toThrow("500");
  });
});
