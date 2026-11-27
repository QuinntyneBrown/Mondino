import { TestBed } from '@angular/core/testing';
import { ApiError, SIGN_IN_API, type SignInApi } from '@mondino/api';
import { SignInStore } from './sign-in-store';

function storeAnswering(rest: Partial<SignInApi> = {}): { store: SignInStore; api: SignInApi } {
  const api: SignInApi = {
    requestLink: vi.fn(() => Promise.resolve()),
    redeem: vi.fn(() => Promise.resolve({ membership: null, email: null })),
    ...rest,
  };
  TestBed.configureTestingModule({
    providers: [SignInStore, { provide: SIGN_IN_API, useValue: api }],
  });
  return { store: TestBed.inject(SignInStore), api };
}

describe('SignInStore', () => {
  it('marks text that is not an email invalid and sends nothing', async () => {
    const { store, api } = storeAnswering();
    store.setEmail('sofia@northwind');

    await store.requestLink();

    expect(store.state().kind).toBe('Invalid');
    expect(api.requestLink).not.toHaveBeenCalled();
  });

  it('takes the invalid mark away as soon as the field is edited', async () => {
    const { store } = storeAnswering();
    store.setEmail('sofia');
    await store.requestLink();

    store.setEmail('sofia@');

    expect(store.state().kind).toBe('Idle');
  });

  it('sends the email trimmed, and reads "Sent" with the email as typed', async () => {
    const { store, api } = storeAnswering();
    store.setEmail(' sofia@northwind.co ');

    await store.requestLink();

    expect(api.requestLink).toHaveBeenCalledWith('sofia@northwind.co', expect.any(AbortSignal));
    expect(store.state()).toEqual({ kind: 'Sent', email: ' sofia@northwind.co ' });
  });

  it('is "Sending" while the request is out, and a second press sends nothing more', async () => {
    let answer!: () => void;
    const { store, api } = storeAnswering({
      requestLink: vi.fn(() => new Promise<void>((resolve) => (answer = resolve))),
    });
    store.setEmail('sofia@northwind.co');

    const first = store.requestLink();
    await store.requestLink();
    expect(store.state().kind).toBe('Sending');
    answer();
    await first;

    expect(api.requestLink).toHaveBeenCalledTimes(1);
    expect(store.state().kind).toBe('Sent');
  });

  for (const code of [ApiError.unreachable, 'unexpected', 'rate_limited', 'validation_failed']) {
    it(`reads "Failed" for ${code}, keeping the email`, async () => {
      const { store } = storeAnswering({
        requestLink: () => Promise.reject(new ApiError(code, 0)),
      });
      store.setEmail('sofia@northwind.co');

      await store.requestLink();

      expect(store.state().kind).toBe('Failed');
      expect(store.email()).toBe('sofia@northwind.co');
    });
  }

  it('shows the form again for another email', async () => {
    const { store } = storeAnswering();
    store.setEmail('sofia@northwind.co');
    await store.requestLink();

    store.useAnotherEmail();

    expect(store.state().kind).toBe('Idle');
  });

  it('aborts the pending request when it is destroyed', () => {
    let signal!: AbortSignal;
    const { store } = storeAnswering({
      requestLink: (_email, given) => {
        signal = given;
        return new Promise<void>(() => undefined);
      },
    });
    store.setEmail('sofia@northwind.co');
    void store.requestLink();

    TestBed.resetTestingModule();

    expect(signal.aborted).toBe(true);
  });
});
