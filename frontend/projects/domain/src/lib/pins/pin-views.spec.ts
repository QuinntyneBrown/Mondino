import type { Pin, PinView } from '@mondino/api';
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
  isViewer,
});

describe('pinViews', () => {
  it('names a pin by its name, city and local time', () => {
    const view = pinViews([pin('Tomás Herrera', 'Mexico City', 'America/Mexico_City')], now).get(
      'Tomás Herrera',
    );
    expect(view?.initials).toBe('TH');
    expect(view?.localTime).toBe('08:05');
    expect(view?.description).toBe('Tomás Herrera, Mexico City, 08:05');
  });

  it('marks the viewer’s own pin "(you)"', () => {
    const view = pinViews([pin('Sofia Bianchi', 'Milan', 'Europe/Rome', true)], now).get(
      'Sofia Bianchi',
    );
    expect(view?.name).toBe('Sofia Bianchi (you)');
    expect(view?.description).toBe('Sofia Bianchi (you), Milan, 15:05');
    expect(view?.initials).toBe('SB');
  });

  it('marks the new pin', () => {
    const views = pinViews(
      [pin('A', 'Milan', 'Europe/Rome'), pin('B', 'Milan', 'Europe/Rome')],
      now,
      'B',
    );
    expect([views.get('A')?.isNew, views.get('B')?.isNew]).toEqual([false, true]);
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
