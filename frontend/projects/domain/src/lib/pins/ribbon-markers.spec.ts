// Traces to: L2-027
import { cast, pin } from './cast.testing';
import { ribbonMarkers, ribbonScale } from './ribbon-markers';

const now = Date.UTC(2025, 9, 27, 14, 5);

describe('ribbonMarkers', () => {
  it('places the cast as pages/team/default does: where, in which row and in what order', () => {
    const view = ribbonMarkers(cast, now, '24-hour');
    expect(view.markers.map(({ name, at, lane }) => `${name} ${at} ${lane}`)).toEqual([
      'Noah Williams 4.51 0',
      'Tomás Herrera 33.68 0',
      'Jordan Lee 37.85 1',
      'Chloé Martin 46.18 0',
      'Liam O’Connor 58.68 0',
      'Kwame Mensah 58.68 1',
      'Sofia Bianchi 62.85 2',
      'Luca Ferri 62.85 3',
      'Lena Fischer 62.85 4',
      'Mara Lindqvist 62.85 5',
      'Ahmed Al-Sayed 75.35 0',
      'Priya Raman 81.6 1',
      'Aiko Tanaka 96.18 0',
    ]);
    expect(view.rows).toBe(6);
    expect(view.markers[1].localTime).toBe('08:05');
  });

  it('places the edge mock’s Toronto two hours after Mexico City in a row of its own', () => {
    const view = ribbonMarkers(
      [
        pin('Tomás Herrera', 'America/Mexico_City', -99.13),
        pin('Jordan Lee', 'America/Chicago', -97.74),
        pin('Toronto', 'America/Toronto', -79.38),
        pin('Chloé Martin', 'America/Sao_Paulo', -46.63),
      ],
      now,
      '12-hour',
    );
    expect(view.markers.map(({ lane }) => lane)).toEqual([0, 1, 2, 0]);
    expect(view.markers[2].localTime).toBe('10:05 am');
  });

  it('gives a team of one one row', () =>
    expect(ribbonMarkers([cast[6]], now, '24-hour').rows).toBe(1));
});

describe('ribbonScale', () => {
  it('marks every three hours on the 24-hour clock', () =>
    expect(ribbonScale('24-hour')).toEqual([
      '00:00',
      '03:00',
      '06:00',
      '09:00',
      '12:00',
      '15:00',
      '18:00',
      '21:00',
      '00:00',
    ]));

  it('marks the hour alone on the 12-hour clock', () =>
    expect(ribbonScale('12-hour')).toEqual([
      '12 am',
      '3 am',
      '6 am',
      '9 am',
      '12 pm',
      '3 pm',
      '6 pm',
      '9 pm',
      '12 am',
    ]));
});
