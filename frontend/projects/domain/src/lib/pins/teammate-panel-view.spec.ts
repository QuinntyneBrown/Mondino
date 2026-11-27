// Traces to: L2-014, L2-016, L2-017, L2-018, L2-019, L2-023
import type { Pin } from '@mondino/api';
import { teammatePanelView } from './teammate-panel-view';

const now = Date.UTC(2025, 9, 27, 14, 5);

const pin = (name: string, cityName: string, timeZoneId: string, more: Partial<Pin> = {}): Pin => ({
  teammateId: name,
  name,
  colour: 'teammate-11',
  cityName,
  country: 'Mexico',
  position: { latitude: 0, longitude: 0 },
  timeZoneId,
  sharesStatus: true,
  isViewer: false,
  weather: { temperatureC: 22, condition: 'partly-cloudy', observedAt: '2025-10-27T14:00:00Z' },
  weatherState: 'Available',
  ...more,
});

const sofia = pin('Sofia Bianchi', 'Milan', 'Europe/Rome', { isViewer: true, country: 'Italy' });
const tomas = pin('Tomás Herrera', 'Mexico City', 'America/Mexico_City');

describe('teammatePanelView', () => {
  it('gives Tomás’s panel as the selected mock draws it', () => {
    const view = teammatePanelView(tomas, sofia, now, '24-hour', 'celsius');
    expect(view).toEqual(
      expect.objectContaining({
        name: 'Tomás Herrera',
        firstName: 'Tomás',
        initials: 'TH',
        isViewer: false,
        cityName: 'Mexico City',
        country: 'Mexico',
        localTime: '08:05',
        localDay: 'Monday 27 Oct',
        offset: '7h behind you',
        status: 'early-morning',
        weather: {
          temperature: '22°C',
          condition: 'partly-cloudy',
          night: false,
          sky: 'Partly cloudy in Mexico City',
        },
        weatherNote: null,
        privateNote: null,
      }),
    );
    expect(view.overlap?.text.figure).toBe('16:00–18:00 your time');
  });

  it('gives the viewer’s own panel no offset and no overlap', () => {
    const view = teammatePanelView(sofia, sofia, now, '24-hour', 'celsius');
    expect(view.isViewer).toBe(true);
    expect(view.offset).toBeNull();
    expect(view.overlap).toBeNull();
  });

  it('gives Melbourne’s own day and the panel’s offset', () => {
    const noah = pin('Noah Williams', 'Melbourne', 'Australia/Melbourne');
    const view = teammatePanelView(noah, sofia, now, '24-hour', 'celsius');
    expect(view.localDay).toBe('Tuesday 28 Oct');
    expect(view.offset).toBe('10h ahead of you');
    expect(view.status).toBe('probably-asleep');
  });

  it('says "same time as you" for a teammate on the viewer’s clock', () =>
    expect(
      teammatePanelView(pin('Luca Ferri', 'Milan', 'Europe/Rome'), sofia, now, '24-hour', 'celsius')
        .offset,
    ).toBe('same time as you'));

  it('gives the temperature in °F on the 12-hour clock, and never −0', () => {
    const view = teammatePanelView(tomas, sofia, now, '12-hour', 'fahrenheit');
    expect(view.localTime).toBe('8:05 am');
    expect(view.weather?.temperature).toBe('72°F');
    const cold = { ...tomas, weather: { ...tomas.weather!, temperatureC: -0.4 } };
    expect(teammatePanelView(cold, sofia, now, '24-hour', 'celsius').weather?.temperature).toBe(
      '0°C',
    );
  });

  it('names the city whose weather is unavailable', () => {
    const view = teammatePanelView(
      { ...tomas, weather: null, weatherState: 'Unavailable' },
      sofia,
      now,
      '24-hour',
      'celsius',
    );
    expect(view.weather).toBeNull();
    expect(view.weatherNote).toBe(
      'Weather for Mexico City isn’t available right now. We’ll try again in a few minutes.',
    );
  });

  it('keeps private a teammate who shares neither their weather nor their status', () => {
    const ahmed = pin('Ahmed Al-Sayed', 'Dubai', 'Asia/Dubai', {
      sharesStatus: false,
      weather: null,
      weatherState: 'NotShared',
    });
    const view = teammatePanelView(ahmed, sofia, now, '24-hour', 'celsius');
    expect(view.privateNote).toBe(
      'Ahmed keeps their weather and working hours private. You’ll still see their local time and city.',
    );
    expect(view.status).toBeNull();
    expect(view.weather).toBeNull();
    expect(view.weatherNote).toBeNull();
    expect(view.overlap).toBeNull();
    expect(view.offset).toBe('3h ahead of you');
  });

  it('omits what one switch hides and says no note, as the note for one is not designed', () => {
    const view = teammatePanelView(
      { ...tomas, sharesStatus: false },
      sofia,
      now,
      '24-hour',
      'celsius',
    );
    expect(view.privateNote).toBeNull();
    expect(view.status).toBeNull();
    expect(view.overlap).toBeNull();
    expect(view.weather?.temperature).toBe('22°C');
  });
});
