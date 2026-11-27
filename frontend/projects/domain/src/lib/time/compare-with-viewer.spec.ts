// Traces to: L2-016, L2-017
import type { Pin } from '@mondino/api';
import { compareWithViewer } from './compare-with-viewer';

const now = Date.UTC(2025, 9, 27, 14, 5);

const pin = (name: string, timeZoneId: string, more: Partial<Pin> = {}): Pin => ({
  teammateId: name,
  name,
  colour: 'teammate-1',
  cityName: '',
  country: '',
  position: { latitude: 0, longitude: 0 },
  timeZoneId,
  sharesStatus: true,
  isViewer: false,
  ...more,
});

const sofia = pin('Sofia Bianchi', 'Europe/Rome', { isViewer: true });
const tomas = pin('Tomás Herrera', 'America/Mexico_City');

describe('compareWithViewer', () => {
  it('gives Tomás’s offset and overlap with the viewer, the bar’s now on the viewer’s clock', () =>
    expect(compareWithViewer(tomas, sofia, now, '24-hour')).toEqual({
      offset: { minutes: 420, direction: 'behind' },
      overlap: {
        overlap: { startMinute: 960, endMinute: 1080, lengthMinutes: 120 },
        theirDay: { startMinute: 960, endMinute: 60 },
        nowMinute: 905,
        firstName: 'Tomás',
        text: {
          figure: '16:00–18:00 your time',
          sentence: 'You and Tomás share 2 hours of working hours: 16:00 to 18:00 on your clock.',
        },
      },
    }));

  it('words the overlap on the viewer’s 12-hour clock', () =>
    expect(compareWithViewer(tomas, sofia, now, '12-hour')?.overlap?.text.figure).toBe(
      '4 pm–6 pm your time',
    ));

  it('gives no offset and no overlap for the viewer’s own pin', () =>
    expect(compareWithViewer(sofia, sofia, now, '24-hour')).toBeNull());

  it('gives nothing while the viewer’s pin is not known', () =>
    expect(compareWithViewer(tomas, undefined, now, '24-hour')).toBeNull());

  it('gives the offset and no overlap for a teammate who does not share their status', () =>
    expect(compareWithViewer({ ...tomas, sharesStatus: false }, sofia, now, '24-hour')).toEqual({
      offset: { minutes: 420, direction: 'behind' },
      overlap: null,
    }));
});
