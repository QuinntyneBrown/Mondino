import { TestBed } from '@angular/core/testing';
import { Toaster, type ToastMessage } from './toaster';

const copied: ToastMessage = {
  tone: 'success',
  strong: null,
  text: 'Invite link copied. Paste it wherever your team talks.',
};
const refused: ToastMessage = {
  tone: 'danger',
  strong: 'Couldn’t copy the link.',
  text: 'It’s selected — press Ctrl+C or ⌘C to copy it yourself.',
};

describe('Toaster', () => {
  let toaster: Toaster;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [Toaster] });
    toaster = TestBed.inject(Toaster);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('a success goes by itself after 4 seconds', () => {
    toaster.show(copied);
    vi.advanceTimersByTime(3_999);
    expect(toaster.current()).toBe(copied);
    vi.advanceTimersByTime(1);
    expect(toaster.current()).toBeNull();
  });

  it('a danger stays until it is dismissed', () => {
    toaster.show(refused);
    vi.advanceTimersByTime(60_000);
    expect(toaster.current()).toBe(refused);
    toaster.dismiss();
    expect(toaster.current()).toBeNull();
  });

  it('held, a success’s time stands still, and once let go the rest of it runs', () => {
    toaster.show(copied);
    vi.advanceTimersByTime(1_000);
    toaster.hold();
    vi.advanceTimersByTime(60_000);
    expect(toaster.current()).toBe(copied);
    toaster.release();
    vi.advanceTimersByTime(2_999);
    expect(toaster.current()).toBe(copied);
    vi.advanceTimersByTime(1);
    expect(toaster.current()).toBeNull();
  });

  it('held twice, it is let go once', () => {
    toaster.show(copied);
    toaster.hold();
    vi.advanceTimersByTime(500);
    toaster.hold();
    toaster.release();
    toaster.release();
    vi.advanceTimersByTime(4_000);
    expect(toaster.current()).toBeNull();
  });

  it('a new toast shown while one is held runs its own 4 seconds', () => {
    toaster.show(copied);
    toaster.hold();
    toaster.show({ ...copied });
    vi.advanceTimersByTime(4_000);
    expect(toaster.current()).toBeNull();
  });

  it('a danger is not timed, held or let go', () => {
    toaster.show(refused);
    toaster.hold();
    toaster.release();
    vi.advanceTimersByTime(60_000);
    expect(toaster.current()).toBe(refused);
  });
});
