// Traces to: L2-017
import { TestBed } from '@angular/core/testing';
import type { ClockFormat, DaySpan, Overlap, OverlapText } from '@mondino/api';
import { OverlapBar } from './overlap-bar';

const tomas = {
  overlap: { startMinute: 960, endMinute: 1080, lengthMinutes: 120 } as Overlap | null,
  theirDay: { startMinute: 960, endMinute: 60 } as DaySpan,
  firstName: 'Tomás',
  text: {
    figure: '16:00–18:00 your time',
    sentence: 'You and Tomás share 2 hours of working hours: 16:00 to 18:00 on your clock.',
  } as OverlapText,
};

function render(inputs: typeof tomas, clockFormat: ClockFormat = '24-hour') {
  const fixture = TestBed.createComponent(OverlapBar);
  for (const [name, value] of Object.entries({ ...inputs, clockFormat, nowMinute: 905 }))
    fixture.componentRef.setInput(name, value);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

const texts = (element: HTMLElement, selector: string) =>
  [...element.querySelectorAll(selector)].map((node) => node.textContent?.trim());

/** What a screen reader reads: the text outside everything hidden from it. */
function readAloud(element: HTMLElement): string {
  const read = (node: Node): string => {
    if (node instanceof HTMLElement && node.getAttribute('aria-hidden') === 'true') return '';
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    return [...node.childNodes].map(read).join(' ');
  };
  return read(element).replace(/\s+/g, ' ').trim();
}

describe('OverlapBar', () => {
  it('heads the overlap and gives its span and its sentence', () => {
    const element = render(tomas);
    const section = element.querySelector('section.overlap')!;
    const title = element.querySelector('h3.overlap__title')!;
    expect(title.textContent?.trim()).toBe('Working-hours overlap');
    expect(section.getAttribute('aria-labelledby')).toBe(title.id);
    expect(element.querySelector('.overlap__when')?.textContent?.trim()).toBe(
      '16:00–18:00 your time',
    );
    expect(element.querySelector('.overlap__text')?.textContent?.trim()).toBe(tomas.text.sentence);
  });

  it('gives a screen reader the overlap’s start, end and length as text, and hides the drawing', () => {
    const element = render(tomas);
    for (const part of ['.overlap__track', '.overlap__scale', '.overlap__legend'])
      expect(element.querySelector(part)?.getAttribute('aria-hidden')).toBe('true');
    expect(readAloud(element)).toBe(
      'Working-hours overlap 16:00–18:00 your time ' +
        'You and Tomás share 2 hours of working hours: 16:00 to 18:00 on your clock.',
    );
  });

  it('draws their day in two parts past midnight, the shared part, your day and now, as the mock places them', () => {
    const element = render(tomas);
    const placed = (selector: string) =>
      [...element.querySelectorAll<HTMLElement>(selector)].map((part) => [
        part.style.getPropertyValue('--from'),
        part.style.getPropertyValue('--span'),
      ]);
    expect(placed('.overlap__theirs')).toEqual([
      ['66.67%', '33.33%'],
      ['0%', '4.17%'],
    ]);
    expect(placed('.overlap__both')).toEqual([['66.67%', '8.33%']]);
    expect(placed('.overlap__you')).toEqual([['37.5%', '37.5%']]);
    expect(placed('.overlap__now')).toEqual([['62.85%', '']]);
  });

  it('draws no shared part when there is none, and still both working days', () => {
    const element = render({
      overlap: null,
      theirDay: { startMinute: 1380, endMinute: 480 },
      firstName: 'Noah',
      text: {
        figure: 'None today',
        sentence:
          'You and Noah share no working hours. Noah’s working day is 23:00 to 08:00 on your clock.',
      },
    });
    expect(element.querySelectorAll('.overlap__both').length).toBe(0);
    expect(element.querySelectorAll('.overlap__theirs').length).toBe(2);
    expect(element.querySelectorAll('.overlap__you').length).toBe(1);
    expect(element.querySelector('.overlap__when')?.textContent?.trim()).toBe('None today');
    expect(texts(element, '.overlap__legend li')).toEqual(['You', 'Noah', 'Both']);
  });

  it('gives the scale on the viewer’s clock', () => {
    expect(texts(render(tomas), '.overlap__scale li')).toEqual([
      '00:00',
      '06:00',
      '12:00',
      '18:00',
      '00:00',
    ]);
    expect(texts(render(tomas, '12-hour'), '.overlap__scale li')).toEqual([
      '12 am',
      '6 am',
      '12 pm',
      '6 pm',
      '12 am',
    ]);
  });

  it('names the teammate in the legend as text, never as markup', () => {
    const element = render({ ...tomas, firstName: '<b>Tomás</b>' });
    expect(texts(element, '.overlap__legend li')).toEqual(['You', '<b>Tomás</b>', 'Both']);
    expect(element.querySelector('.overlap__legend b')).toBeNull();
  });
});
