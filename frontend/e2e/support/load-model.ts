import { gzipSync } from 'node:zlib';
import type { Page, Request, Route } from '@playwright/test';

/**
 * The reference phone's connection (L2-046): 4G throttled to 1.6 Mbps with 150 ms of round trip.
 * A new connection costs three round trips (the name, TCP and TLS) before its first request.
 */
export const ReferencePhone = { roundTripMs: 150, bytesPerSecond: 1_600_000 / 8, setupTrips: 3 };

/** Text the server compresses (docs/adr/0030); images and fonts are sent as they are. */
const compressed = /\.(js|css|html|json|svg|glb)$|\/api\/|^\/[^.]*$/;

/** Text found only in the globe's renderer: three.js's own name for it. */
export const RendererMark = 'THREE.WebGLRenderer';

interface Sent {
  readonly path: string;
  /** Round trips from the start: one more than the deepest request that had arrived before it was sent. */
  readonly trips: number;
  bytes: number;
  done: boolean;
}

/**
 * The cost of a visit on the reference phone, worked out from what the browser fetched rather
 * than timed (docs/adr/0030). Each request is placed one round trip after the deepest request
 * that had arrived before it was sent (the page itself first, and whatever its first bytes name
 * one trip after it), so a chain of requests that wait on one another costs a round trip each.
 * Every byte of every earlier trip is counted as if it were sent alone, one after another, and no
 * round trip overlaps another or a byte. On the last trip, the requests awaited share the
 * connection with the others sent alongside them, each of which takes at most as many bytes of it
 * as the largest awaited one. The sum is an upper bound on the time the connection takes.
 */
export class LoadRecord {
  private readonly sent = new Map<Request, Sent>();
  private readonly reading: Promise<void>[] = [];
  private deepest = 0;

  constructor(page: Page) {
    page.on('request', (request) => {
      const path = new URL(request.url()).pathname;
      const trips = this.sent.size === 0 ? 1 : Math.max(this.deepest, 1) + 1;
      this.sent.set(request, { path, trips, bytes: 0, done: false });
    });
    page.on('requestfinished', (request) => {
      const sent = this.sent.get(request);
      if (!sent) return;
      sent.done = true;
      this.deepest = Math.max(this.deepest, sent.trips);
      this.reading.push(this.weigh(request, sent));
    });
  }

  /** The modelled time, in seconds, until every request `awaited` names has arrived. */
  async secondsUntil(awaited: RegExp): Promise<number> {
    await Promise.all(this.reading);
    const { trips, bytes } = this.cost(awaited);
    const { roundTripMs, bytesPerSecond, setupTrips } = ReferencePhone;
    return ((setupTrips + trips) * roundTripMs) / 1000 + bytes / bytesPerSecond;
  }

  /** What the model counted until `awaited`, for a failure's message. */
  describe(awaited: RegExp): string {
    const { trips, bytes } = this.cost(awaited);
    const lines = [...this.sent.values()]
      .filter((sent) => sent.done && sent.trips <= trips)
      .map((sent) => `${sent.trips} ${sent.path} ${sent.bytes} B`);
    return [...lines, `${trips} round trips, ${bytes} bytes`].join('\n');
  }

  private cost(awaited: RegExp): { trips: number; bytes: number } {
    const arrived = [...this.sent.values()].filter((sent) => sent.done);
    const waitedFor = arrived.filter((sent) => awaited.test(sent.path));
    if (waitedFor.length === 0) throw new Error(`Nothing matching ${awaited} has arrived`);
    const trips = Math.max(...waitedFor.map((sent) => sent.trips));
    const largest = Math.max(...waitedFor.map((sent) => sent.bytes));
    let bytes = 0;
    for (const sent of arrived) {
      if (sent.trips < trips || waitedFor.includes(sent)) bytes += sent.bytes;
      else if (sent.trips === trips) bytes += Math.min(sent.bytes, largest);
    }
    return { trips, bytes };
  }

  private async weigh(request: Request, sent: Sent): Promise<void> {
    // A request that arrives as the spec ends is not counted, and its page may be gone.
    try {
      const response = await request.response();
      const body = await response?.body().catch(() => null);
      if (body?.length && compressed.test(sent.path)) sent.bytes = gzipSync(body).length;
      else sent.bytes = body?.length || (await request.sizes()).responseBodySize;
    } catch {
      sent.bytes = 0;
    }
  }
}

/**
 * Holds the globe's renderer back until `release` is called, so a spec can see what the screen
 * offers before the 3D globe arrives.
 */
export async function holdTheRenderer(page: Page): Promise<{ release(): void }> {
  let release!: () => void;
  const released = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/chunk-*.js', async (route: Route) => {
    const response = await route.fetch();
    if ((await response.text()).includes(RendererMark)) await released;
    await route.fulfill({ response });
  });
  return { release };
}

/** Adds up the layout shifts the page makes from its first moment, as Chromium reports them. */
export async function watchLayoutShifts(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const shifts = { score: 0 };
    Object.assign(window, { __shifts: shifts });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as (PerformanceEntry & {
        value: number;
        hadRecentInput: boolean;
      })[])
        if (!entry.hadRecentInput) shifts.score += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });
}

/** Every layout shift so far, added up: never less than the layout shift score. */
export async function layoutShift(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __shifts: { score: number } }).__shifts.score);
}
