// Traces to: L2-003, L2-018, L2-019
import type { Weather } from '@mondino/api';
import {
  defaultTemperatureUnit,
  formatDegrees,
  formatTemperature,
  foundWeather,
  isNightSky,
  weatherLabel,
  weatherWord,
} from './weather';

describe('formatTemperature and formatDegrees', () => {
  const cases: [number, 'celsius' | 'fahrenheit', string, string][] = [
    [13, 'celsius', '13°C', '13°'],
    [13, 'fahrenheit', '55°F', '55°'],
    [22, 'fahrenheit', '72°F', '72°'],
    [-0.4, 'celsius', '0°C', '0°'],
    [-17.9, 'fahrenheit', '0°F', '0°'],
    [-0.5, 'celsius', '0°C', '0°'],
    [-0.6, 'celsius', '-1°C', '-1°'],
    [12.5, 'celsius', '13°C', '13°'],
  ];
  for (const [celsius, unit, withUnit, degrees] of cases) {
    it(`gives ${withUnit} and ${degrees} for ${celsius} °C`, () => {
      expect(formatTemperature(celsius, unit)).toBe(withUnit);
      expect(formatDegrees(celsius, unit)).toBe(degrees);
    });
  }
  it('never writes a negative zero', () => {
    expect(formatTemperature(-0.4, 'celsius')).not.toContain('-');
    expect(formatDegrees(-0.01, 'celsius')).toBe('0°');
  });
});

describe('defaultTemperatureUnit', () => {
  it('is °F in the United States', () =>
    expect(defaultTemperatureUnit('United States')).toBe('fahrenheit'));
  for (const country of ['Canada', 'Italy', 'Mexico', ''])
    it(`is °C in ${country || 'no country'}`, () =>
      expect(defaultTemperatureUnit(country)).toBe('celsius'));
});

describe('weatherWord and weatherLabel', () => {
  const cases: [Parameters<typeof weatherWord>[0], string][] = [
    ['clear', 'Clear'],
    ['partly-cloudy', 'Partly cloudy'],
    ['cloudy', 'Cloudy'],
    ['rain', 'Rainy'],
    ['showers', 'Showers'],
    ['storm', 'Stormy'],
    ['fog', 'Foggy'],
    ['wind', 'Windy'],
  ];
  for (const [condition, word] of cases)
    it(`names ${condition} "${word}"`, () => expect(weatherWord(condition)).toBe(word));
  it('names a condition it does not know as cloudy, never blank', () =>
    expect(weatherWord('haze' as never)).toBe('Cloudy'));
  it('says "Foggy in Milan"', () => expect(weatherLabel('fog', 'Milan')).toBe('Foggy in Milan'));
});

describe('isNightSky', () => {
  const cases: [number, boolean][] = [
    [22, false],
    [23, true],
    [0, true],
    [6, true],
    [7, false],
    [14, false],
  ];
  for (const [hour, night] of cases)
    it(`is ${night} at ${hour}:00`, () => expect(isNightSky(hour)).toBe(night));
});

describe('foundWeather', () => {
  const fog: Weather = { temperatureC: 13, condition: 'fog', observedAt: '2025-10-27T14:00:00Z' };
  it('says "13° and foggy right now." in °C', () =>
    expect(foundWeather(fog, 'celsius')).toBe('13° and foggy right now.'));
  it('says "55° and foggy right now." in °F', () =>
    expect(foundWeather(fog, 'fahrenheit')).toBe('55° and foggy right now.'));
  it('says "and partly cloudy" in lower case', () =>
    expect(foundWeather({ ...fog, condition: 'partly-cloudy' }, 'celsius')).toBe(
      '13° and partly cloudy right now.',
    ));
  it('says nothing without weather', () => expect(foundWeather(null, 'celsius')).toBe(''));
});
