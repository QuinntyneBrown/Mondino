import { getJson, post, postJson } from './request';

describe('request', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const signal = new AbortController().signal;

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // The test document is not served over HTTPS, so it cannot hold a __Host- cookie itself.
  function cookies(value: string): void {
    vi.spyOn(document, 'cookie', 'get').mockReturnValue(value);
  }

  function headersSent(): Headers {
    return new Headers(fetchMock.mock.calls[0][1]?.headers);
  }

  it('returns the antiforgery token the backend gave in the header of a change', async () => {
    cookies('theme=dark; __Host-mondino-xsrf=CfDJ8%2Btoken');
    await postJson('/api/teams/t1/me', { name: 'Sofia' }, signal);
    expect(headersSent().get('x-xsrf-token')).toBe('CfDJ8+token');
  });

  it('posts to an endpoint that answers 202 with no body, and reads nothing back', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 202 }));
    await expect(post('/api/sign-in-links', { email: 'sofia@northwind.co' }, signal)).resolves.toBe(
      undefined,
    );
    expect(fetchMock.mock.calls[0][1]?.body).toBe('{"email":"sofia@northwind.co"}');
  });

  it('sends no token with a read', async () => {
    cookies('__Host-mondino-xsrf=CfDJ8token');
    await getJson('/api/teams/t1/pins', signal);
    expect(headersSent().has('x-xsrf-token')).toBe(false);
  });

  it('sends no token header when the backend has given none', async () => {
    cookies('theme=dark');
    await postJson('/api/teams', { teamName: 'Northwind' }, signal);
    expect(headersSent().has('x-xsrf-token')).toBe(false);
  });
});
