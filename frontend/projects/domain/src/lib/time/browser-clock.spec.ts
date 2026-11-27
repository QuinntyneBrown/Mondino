import { TestBed } from '@angular/core/testing';
import { BrowserClock } from './browser-clock';

describe('BrowserClock', () => {
  let hidden = false;

  beforeEach(() => {
    vi.useFakeTimers({ now: Date.parse('2025-10-27T14:05:20Z') });
    hidden = false;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    TestBed.configureTestingModule({ providers: [BrowserClock] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  const minute = (iso: string) => Date.parse(iso);
  const showOrHide = (isHidden: boolean) => {
    hidden = isHidden;
    document.dispatchEvent(new Event('visibilitychange'));
  };

  it('reads the time from the system clock', () => {
    expect(TestBed.inject(BrowserClock).now()).toBe(Date.parse('2025-10-27T14:05:20Z'));
  });

  it('starts at the current minute', () => {
    expect(TestBed.inject(BrowserClock).minute()).toBe(minute('2025-10-27T14:05:00Z'));
  });

  it('ticks when the next minute begins, and once a minute after', () => {
    const clock = TestBed.inject(BrowserClock);
    vi.advanceTimersByTime(39_999);
    expect(clock.minute()).toBe(minute('2025-10-27T14:05:00Z'));
    vi.advanceTimersByTime(1);
    expect(clock.minute()).toBe(minute('2025-10-27T14:06:00Z'));
    vi.advanceTimersByTime(60_000);
    expect(clock.minute()).toBe(minute('2025-10-27T14:07:00Z'));
  });

  it('rests while the tab is hidden, and ticks at once when it is shown again', () => {
    const clock = TestBed.inject(BrowserClock);
    showOrHide(true);
    expect(vi.getTimerCount()).toBe(0);
    vi.setSystemTime(Date.parse('2025-10-27T15:05:10Z'));
    showOrHide(false);
    expect(clock.minute()).toBe(minute('2025-10-27T15:05:00Z'));
    vi.advanceTimersByTime(50_000);
    expect(clock.minute()).toBe(minute('2025-10-27T15:06:00Z'));
  });

  it('stops ticking and listening when it is destroyed', () => {
    const clock = TestBed.inject(BrowserClock);
    TestBed.resetTestingModule();
    expect(vi.getTimerCount()).toBe(0);
    showOrHide(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(clock.minute()).toBe(minute('2025-10-27T14:05:00Z'));
  });
});
