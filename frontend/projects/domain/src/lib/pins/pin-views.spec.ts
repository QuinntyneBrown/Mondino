import type { Moment, Pin, PinView } from '@mondino/api';
import { describeGroup, pinViews } from './pin-views';

const now = Date.UTC(2025, 9, 27, 14, 5);
const pin = (name: string, cityName: string, timeZoneId: string, isViewer = false): Pin => ({
  teammateId: name,
  name,
  colour: 'teammate-1',
  cityName,
  country: '',
  position: { latitude: 0, longitude: 0 },
  timeZoneId,
  sharesStatus: true,
  isViewer,
  weather: null,
  weatherState: 'Unavailable',
});

describe('pinViews: weather', () => {
  const tomas: Pin = {
    ...pin('Tomás Herrera', 'Mexico City', 'America/Mexico_City'),
    weather: { temperatureC: 22, condition: 'partly-cloudy', observedAt: '' },
    weatherState: 'Available',
  };

  it('gives the weather’s word and degrees, in the name too', () => {
    const view = pinViews([tomas], now).get('Tomás Herrera');
    expect(view?.weather).toEqual({
      degrees: '22°',
      condition: 'partly-cloudy',
      word: 'Partly cloudy',
      night: false,
    });
    expect(view?.description).toBe(
      'Tomás Herrera, Mexico City, 08:05, Early morning, Partly cloudy 22°',
    );
  });

  it('gives the degrees in the viewer’s unit: 13 °C is 55° in °F', () => {
    const luca = { ...tomas, weather: { ...tomas.weather!, temperatureC: 13 } };
    expect(
      pinViews([luca], now, [], '24-hour', 'fahrenheit').get('Tomás Herrera')?.weather?.degrees,
    ).toBe('55°');
  });

  it('marks the sky as night while the city is probably asleep', () => {
    const aiko = { ...tomas, teammateId: 'Aiko', timeZoneId: 'Asia/Tokyo' };
    expect(pinViews([aiko], now).get('Aiko')?.weather?.night).toBe(true);
  });

  it('gives no weather, and leaves it out of the name, when it is unavailable or not shared', () => {
    for (const weatherState of ['Unavailable', 'NotShared'] as const) {
      const view = pinViews([{ ...tomas, weatherState }], now).get('Tomás Herrera');
      expect(view?.weather).toBeNull();
      expect(view?.description).toBe('Tomás Herrera, Mexico City, 08:05, Early morning');
    }
  });
});

describe('pinViews', () => {
  it('names a pin by its name, city, local time and status', () => {
    const view = pinViews([pin('Tomás Herrera', 'Mexico City', 'America/Mexico_City')], now).get(
      'Tomás Herrera',
    );
    expect(view?.initials).toBe('TH');
    expect(view?.localTime).toBe('08:05');
    expect(view?.status).toBe('early-morning');
    expect(view?.description).toBe('Tomás Herrera, Mexico City, 08:05, Early morning');
  });

  it('gives the local time on the viewer’s 12-hour clock', () => {
    const view = pinViews(
      [pin('Tomás Herrera', 'Mexico City', 'America/Mexico_City')],
      now,
      [],
      '12-hour',
    ).get('Tomás Herrera');
    expect(view?.localTime).toBe('8:05 am');
    expect(view?.description).toBe('Tomás Herrera, Mexico City, 8:05 am, Early morning');
  });

  it('gives no status for a teammate who does not share it', () => {
    const ahmed = { ...pin('Ahmed Al-Sayed', 'Dubai', 'Asia/Dubai'), sharesStatus: false };
    const view = pinViews([ahmed], now).get('Ahmed Al-Sayed');
    expect(view?.status).toBeNull();
    expect(view?.description).toBe('Ahmed Al-Sayed, Dubai, 18:05');
  });

  it('marks the viewer’s own pin "(you)"', () => {
    const view = pinViews([pin('Sofia Bianchi', 'Milan', 'Europe/Rome', true)], now).get(
      'Sofia Bianchi',
    );
    expect(view?.name).toBe('Sofia Bianchi (you)');
    expect(view?.description).toBe('Sofia Bianchi (you), Milan, 15:05, Working hours');
    expect(view?.initials).toBe('SB');
  });

  it('marks the new pins: the one just joined, and those a refresh brought', () => {
    const views = pinViews(
      [
        pin('A', 'Milan', 'Europe/Rome'),
        pin('B', 'Milan', 'Europe/Rome'),
        pin('C', 'Milan', 'Europe/Rome'),
      ],
      now,
      ['B', 'C'],
    );
    expect(['A', 'B', 'C'].map((id) => views.get(id)?.isNew)).toEqual([false, true, true]);
  });
});

describe('pinViews: moments', () => {
  const moment = (
    teammateId: string,
    kind: Moment['kind'],
    date: string,
    title: string,
  ): Moment => ({
    teammateId,
    teammateName: teammateId,
    cityName: '',
    countryCode: '',
    timeZoneId: 'Europe/Dublin',
    kind,
    title,
    date,
    detail: '',
    emblemKey: null,
  });
  const liam = pin('Liam O’Connor', 'Dublin', 'Europe/Dublin');
  const lena = pin('Lena Fischer', 'Berlin', 'Europe/Berlin');
  const moments = [
    moment('Liam O’Connor', 'holiday', '2025-10-27', 'October Bank Holiday'),
    moment('Lena Fischer', 'formula-1', '2025-10-30', 'Race screening'),
  ];

  it('gives each pin its own teammate’s marker, and ends its name with it', () => {
    const views = pinViews([liam, lena], now, [], '24-hour', 'celsius', moments);
    expect(views.get('Liam O’Connor')?.marker).toMatchObject({ count: 1, today: true });
    expect(views.get('Liam O’Connor')?.description).toBe(
      'Liam O’Connor, Dublin, 14:05, Working hours, October Bank Holiday, today',
    );
    expect(views.get('Lena Fischer')?.marker?.title).toBe('Race screening');
  });

  it('marks no pin with no moments, and only the chosen kinds', () => {
    expect(pinViews([liam], now).get('Liam O’Connor')?.marker).toBeNull();
    const views = pinViews([liam, lena], now, [], '24-hour', 'celsius', moments, ['holiday']);
    expect(views.get('Lena Fischer')?.marker).toBeNull();
    expect(views.get('Lena Fischer')?.description).toBe(
      'Lena Fischer, Berlin, 15:05, Working hours',
    );
  });
});

describe('describeGroup', () => {
  const views = (cities: string[], viewer = -1): PinView[] =>
    cities.map((cityName, index) => ({
      ...pinViews([pin(`Teammate ${index}`, cityName, 'UTC', index === viewer)], now).get(
        `Teammate ${index}`,
      )!,
    }));

  it('names the two teammates of a pair, the viewer first', () => {
    const pair = pinViews(
      [
        pin('Luca Ferri', 'Milan', 'Europe/Rome'),
        pin('Sofia Bianchi', 'Milan', 'Europe/Rome', true),
      ],
      now,
    );
    expect(describeGroup([...pair.values()])).toBe(
      '2 teammates close together: Sofia Bianchi (you), Luca Ferri',
    );
  });

  it('names the city of a larger group in one city', () => {
    expect(describeGroup(views(Array(14).fill('Mexico City')))).toBe(
      '14 teammates close together, Mexico City',
    );
  });

  it('counts the cities of a larger group in several', () => {
    expect(
      describeGroup(
        views([...Array(30).fill('Milan'), ...Array(20).fill('Turin'), ...Array(10).fill('Genoa')]),
      ),
    ).toBe('60 teammates close together, 3 cities');
  });
});
