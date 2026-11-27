// Traces to: L2-023
import type { Pin } from '@mondino/api';
import { groupCities } from './group-cities';

const now = Date.UTC(2025, 9, 27, 14, 5);

const pin = (name: string, cityName: string, longitude: number, more: Partial<Pin> = {}): Pin => ({
  teammateId: name,
  name,
  colour: 'teammate-1',
  cityName,
  country: '',
  position: { latitude: 45, longitude },
  timeZoneId: 'Europe/Rome',
  sharesStatus: true,
  isViewer: false,
  weather: null,
  weatherState: 'Unavailable',
  ...more,
});

const luca = pin('Luca Ferri', 'Milan', 9.19);
const sofia = pin('Sofia Bianchi', 'Milan', 9.19, { isViewer: true });
const lena = pin('Lena Fischer', 'Berlin', 13.4, { timeZoneId: 'Europe/Berlin' });
const liam = pin('Liam O’Connor', 'Dublin', -6.26, { timeZoneId: 'Europe/Dublin' });

describe('groupCities', () => {
  it('lists Sofia and Luca under Milan, the viewer first, as the group mock draws them', () =>
    expect(
      groupCities([luca, sofia, lena], ['Luca Ferri', 'Sofia Bianchi'], now, '24-hour'),
    ).toEqual({
      title: '2 teammates close together',
      lead: 'All in Milan · pick someone to see their pin',
      cities: [
        {
          cityName: 'Milan',
          localTime: '15:05',
          rows: [
            {
              teammateId: 'Sofia Bianchi',
              name: 'Sofia Bianchi',
              initials: 'SB',
              colour: 'teammate-1',
              isViewer: true,
            },
            {
              teammateId: 'Luca Ferri',
              name: 'Luca Ferri',
              initials: 'LF',
              colour: 'teammate-1',
              isViewer: false,
            },
          ],
        },
      ],
    }));

  it('gives the number of cities, the largest city first and the rest west to east', () => {
    const group = groupCities(
      [lena, luca, sofia, liam],
      ['Lena Fischer', 'Luca Ferri', 'Sofia Bianchi', 'Liam O’Connor'],
      now,
      '12-hour',
    );
    expect(group.lead).toBe('3 cities · pick someone to see their pin');
    expect(group.title).toBe('4 teammates close together');
    expect(group.cities.map((city) => `${city.cityName} ${city.localTime}`)).toEqual([
      'Milan 3:05 pm',
      'Dublin 2:05 pm',
      'Berlin 3:05 pm',
    ]);
  });

  it('leaves out a teammate who is no longer on the team', () =>
    expect(
      groupCities([luca], ['Luca Ferri', 'Sofia Bianchi'], now, '24-hour').cities[0].rows,
    ).toHaveLength(1));
});
