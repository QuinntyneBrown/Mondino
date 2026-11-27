import type { Locator, Page } from '@playwright/test';

/** One stop of the keyboard's walk through a screen: what took focus, and how it showed it. */
export interface Stop {
  /** Its tag, its first class and its accessible text, enough to name it in a failure. */
  name: string;
  /** Its place among the screen's focusable elements, in the order the page reads. */
  readingIndex: number;
  /** The focus ring's contrast against what is around it, and its width in px. */
  ringContrast: number;
  ringWidth: number;
  /** The area that takes a touch, in px. */
  width: number;
  height: number;
}

/**
 * Presses Tab from the top of the screen until focus leaves the page or comes back round, and
 * records each stop (L2-039). Each stop is measured while it has focus, so a control shown only
 * on focus, as "Skip to content" is, is measured as it is seen.
 */
export async function walkWithTab(page: Page, limit = 120): Promise<Stop[]> {
  await page.evaluate(() => {
    (document.activeElement as HTMLElement | null)?.blur();
    window.getSelection()?.removeAllRanges();
  });
  const stops: Stop[] = [];
  for (let i = 0; i < limit; i++) {
    await page.keyboard.press('Tab');
    await settled(page);
    const stop = await page.evaluate(measureFocus);
    if (!stop || (stops.length > 0 && stop.readingIndex === stops[0].readingIndex)) break;
    stops.push(stop);
  }
  return stops;
}

/** Runs in the browser: the element that has focus, measured; null when focus left the page. */
function measureFocus(): Stop | null {
  const active = document.activeElement as HTMLElement | null;
  if (!active || active === document.body) return null;

  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
  const rgba = (colour: string): [number, number, number, number] => {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = '#000';
    probe.fillStyle = colour;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top: number[], under: number[]): number[] =>
    [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
  const backgroundOf = (element: Element | null): number[] => {
    const layers: number[][] = [];
    for (let at = element; at; at = at.parentElement) {
      const layer = rgba(getComputedStyle(at).backgroundColor);
      if (layer[3] > 0) layers.push(layer);
      if (layer[3] >= 1) break;
    }
    return layers.reduceRight((under, top) => over(top, under), [255, 255, 255, 1]);
  };
  const luminance = (c: number[]): number => {
    const [r, g, b] = c
      .slice(0, 3)
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: number[], b: number[]): number => {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;
  };

  // The ring is the control's outline; or the outline of the box that grows its target, as a
  // table's row link draws it; or, on a field, its border with a hairline around it.
  const style = getComputedStyle(active);
  const grownRing = getComputedStyle(active, '::after');
  const [ringColour, ringWidth] =
    style.outlineStyle !== 'none'
      ? [style.outlineColor, parseFloat(style.outlineWidth) || 0]
      : grownRing.content !== 'none' && grownRing.outlineStyle !== 'none'
        ? [grownRing.outlineColor, parseFloat(grownRing.outlineWidth) || 0]
        : style.boxShadow !== 'none'
          ? [
              style.boxShadow.split(') ')[0] + ')',
              (parseFloat(style.boxShadow.split(' ').slice(-1)[0]) || 0) +
                (style.borderTopColor === style.boxShadow.split(') ')[0] + ')'
                  ? parseFloat(style.borderTopWidth) || 0
                  : 0),
            ]
          : ['transparent', 0];
  const around = backgroundOf(active.parentElement);
  const ringContrast = contrast(over(rgba(ringColour), around), around);

  // A small drawn control grows its target with a transparent box before or after it.
  const drawn = active.getBoundingClientRect();
  let [width, height] = [drawn.width, drawn.height];
  for (const pseudo of ['::before', '::after']) {
    const grown = getComputedStyle(active, pseudo);
    if (grown.content === 'none' || grown.position !== 'absolute') continue;
    // Its box as drawn, once laid out; its insets, where the browser gives no size.
    const out = (side: string) => Math.max(0, -parseFloat(side) || 0);
    width = Math.max(
      width,
      grown.width.endsWith('px')
        ? parseFloat(grown.width)
        : drawn.width + out(grown.left) + out(grown.right),
    );
    height = Math.max(
      height,
      grown.height.endsWith('px')
        ? parseFloat(grown.height)
        : drawn.height + out(grown.top) + out(grown.bottom),
    );
  }

  const focusable = [
    ...document.querySelectorAll<HTMLElement>(
      'a[href], button, input, select, textarea, [tabindex]',
    ),
  ];
  const text = (active.getAttribute('aria-label') ?? active.textContent ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
  return {
    name: `${active.localName}.${active.classList[0] ?? ''} “${text}”`,
    readingIndex: focusable.indexOf(active),
    ringContrast,
    ringWidth,
    width,
    height,
  };
}

/**
 * The controls a keyboard should reach on the screen, in the order the page reads: every shown,
 * enabled link, button, field and focusable element outside an inert part, named as `Stop`s are.
 * A radio group is one stop, its chosen radio.
 */
export function readingOrder(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const shown = (element: HTMLElement): boolean => {
      if (element.closest('[inert]')) return false;
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden' || style.display === 'none') return false;
      // "Skip to content" waits off the screen until it has focus.
      if (element.classList.contains('skip-link')) return true;
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0;
    };
    return [
      ...document.querySelectorAll<HTMLElement>(
        'a[href], button, input, select, textarea, [tabindex]',
      ),
    ]
      .filter((element) => element.tabIndex >= 0 && !(element as HTMLButtonElement).disabled)
      .filter((element) => !(element instanceof HTMLInputElement && element.type === 'hidden'))
      .filter(
        (element) =>
          !(element instanceof HTMLInputElement && element.type === 'radio' && !element.checked),
      )
      .filter(shown)
      .map((element) => {
        const text = (element.getAttribute('aria-label') ?? element.textContent ?? '')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 40);
        return `${element.localName}.${element.classList[0] ?? ''} “${text}”`;
      });
  });
}

/** Elements with a positive `tabindex`, which would take focus out of reading order. */
export function positiveTabIndex(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[tabindex]')]
      .filter((element) => element.tabIndex > 0)
      .map((element) => element.outerHTML.slice(0, 80)),
  );
}

/**
 * Every line of shown text whose contrast with the background painted behind it is under
 * WCAG 2.2 AA: 4.5:1, or 3:1 for large text (24 px, or 18.66 px bold) (L2-041). Text over a
 * picture or a gradient is left out, as is the text of a disabled control.
 */
export async function lowContrastText(page: Page): Promise<string[]> {
  await settled(page);
  return page.evaluate(() => {
    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    const rgba = (colour: string): number[] => {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = '#000';
      probe.fillStyle = colour;
      probe.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
      return [r, g, b, a / 255];
    };
    const over = (top: number[], under: number[]): number[] =>
      [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3])).concat(1);
    const luminance = (c: number[]): number => {
      const [r, g, b] = c
        .slice(0, 3)
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const contrast = (a: number[], b: number[]): number => {
      const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (l1 + 0.05) / (l2 + 0.05);
    };

    const found: string[] = [];
    for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
      const ownText = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join('')
        .trim();
      if (!ownText || element.closest('svg, script, style, .visually-hidden, .skip-link')) continue;
      if (element.closest(':disabled, [aria-disabled="true"]')) continue;
      const box = element.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1) continue;
      const style = getComputedStyle(element);
      if (style.visibility === 'hidden') continue;

      let picture = false;
      let opacity = 1;
      const layers: number[][] = [];
      for (let at: Element | null = element; at; at = at.parentElement) {
        const each = getComputedStyle(at);
        opacity *= parseFloat(each.opacity);
        if (layers.every((layer) => layer[3] < 1)) {
          if (each.backgroundImage !== 'none') picture = true;
          const layer = rgba(each.backgroundColor);
          if (layer[3] > 0) layers.push(layer);
        }
      }
      // A toast or a dialog fading in is measured as it ends up.
      if (picture || opacity === 0) continue;
      const background = layers.reduceRight((under, top) => over(top, under), [255, 255, 255, 1]);
      const ink = rgba(style.color);
      const text = over([ink[0], ink[1], ink[2], ink[3] * opacity], background);
      const size = parseFloat(style.fontSize);
      const large = size >= 24 || (size >= 18.66 && Number(style.fontWeight) >= 700);
      const ratio = contrast(text, background);
      if (ratio < (large ? 3 : 4.5) - 0.01)
        found.push(
          `${element.localName}.${element.classList[0] ?? ''} “${ownText.slice(0, 30)}” ${ratio.toFixed(2)}:1`,
        );
    }
    return found;
  });
}

/**
 * Every shown time ("08:05", "2:05 PM") and temperature ("22°") whose figures are not tabular, so
 * they would shift as they change (L2-041).
 */
export function proportionalFigures(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const figures = /^(\d{1,2}:\d{2}\b|[-−]?\d+\s?°)/;
    const found: string[] = [];
    for (const element of document.body.querySelectorAll<HTMLElement>('*')) {
      const ownText = [...element.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? '')
        .join('')
        .trim();
      if (!figures.test(ownText) || element.closest('svg, script, style')) continue;
      const box = element.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1) continue;
      if (!getComputedStyle(element).fontVariantNumeric.includes('tabular-nums'))
        found.push(`${element.localName}.${element.classList[0] ?? ''} “${ownText.trim()}”`);
    }
    return found;
  });
}

/**
 * What still moves on the screen under reduced motion (L2-042): every running animation, and
 * every element whose transition or animation would take longer than a frame.
 */
export function motionUnderReduce(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const seconds = (list: string): number =>
      Math.max(
        ...list.split(',').map((each) => parseFloat(each) * (each.includes('ms') ? 1 : 1000)),
      );
    const found: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>('*')) {
      for (const pseudo of [null, '::before', '::after']) {
        const style = getComputedStyle(element, pseudo);
        const name = `${element.localName}.${element.classList[0] ?? ''}${pseudo ?? ''}`;
        if (style.animationName !== 'none' && seconds(style.animationDuration) > 1)
          found.push(`${name} animates ${style.animationName} for ${style.animationDuration}`);
        if (style.transitionProperty !== 'none' && seconds(style.transitionDuration) > 1)
          found.push(`${name} transitions over ${style.transitionDuration}`);
      }
    }
    for (const animation of document.getAnimations()) {
      const timing = animation.effect?.getComputedTiming();
      if (animation.playState === 'running' && Number(timing?.duration) > 1)
        found.push(`a running animation of ${String(timing?.duration)} ms`);
    }
    return found;
  });
}

/**
 * Every animation on the screen that repeats faster than three times in a second (L2-042),
 * whether it is running now or declared in a stylesheet.
 */
export function fastRepeats(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const ms = (value: string): number => parseFloat(value) * (value.includes('ms') ? 1 : 1000);
    const found: string[] = [];
    for (const element of document.querySelectorAll<HTMLElement>('*')) {
      for (const pseudo of [null, '::before', '::after']) {
        const style = getComputedStyle(element, pseudo);
        if (style.animationName === 'none') continue;
        const durations = style.animationDuration.split(',');
        style.animationIterationCount.split(',').forEach((count, i) => {
          const each = ms(durations[i] ?? durations[0]);
          if (count.trim() !== '1' && each < 1000 / 3)
            found.push(
              `${element.localName}.${element.classList[0] ?? ''}${pseudo ?? ''} repeats every ${each} ms`,
            );
        });
      }
    }
    for (const animation of document.getAnimations()) {
      const timing = animation.effect?.getComputedTiming();
      if (timing && Number(timing.iterations) > 1 && Number(timing.duration) < 1000 / 3)
        found.push(`a running animation repeats every ${String(timing.duration)} ms`);
    }
    return found;
  });
}

/** Waits for every animation that ends (a fade, an entrance) to end, so a screen is read as shown. */
export function settled(page: Page): Promise<void> {
  return page.evaluate(async () => {
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
}

/** Presses Tab until `target` has focus, as a person on a keyboard would. */
export async function tabTo(target: Locator, limit = 80): Promise<void> {
  const page = target.page();
  for (let i = 0; i < limit; i++) {
    if (await target.evaluate((element) => element === document.activeElement).catch(() => false))
      return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Tab never reached ${target.toString()}`);
}

/** What a screen reader was told: each change of a live region's spoken text, and how. */
export interface Announcement {
  politeness: 'polite' | 'assertive';
  text: string;
}

/**
 * Starts listening to every live region on the page, as a screen reader does: from now on each
 * change of a region's spoken text (what is not `aria-hidden`) is one announcement. Regions added
 * later are heard too.
 */
export function listenForAnnouncements(page: Page): Promise<void> {
  return page.evaluate(() => {
    const live = '[aria-live], [role="status"], [role="alert"], [role="log"]';
    const spoken = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
      if (node instanceof Element && node.getAttribute('aria-hidden') === 'true') return '';
      return [...node.childNodes].map(spoken).join('');
    };
    const regions = () =>
      [...document.querySelectorAll(live)].filter((region) => !region.parentElement?.closest(live));
    const heard = new WeakMap<Element, string>();
    const said: { politeness: string; text: string }[] = [];
    const listen = () => {
      for (const region of regions()) {
        const text = spoken(region).replace(/\s+/g, ' ').trim();
        if (text === (heard.get(region) ?? '')) continue;
        heard.set(region, text);
        if (!text) continue;
        const assertive =
          region.getAttribute('aria-live') === 'assertive' ||
          (!region.hasAttribute('aria-live') && region.getAttribute('role') === 'alert');
        said.push({ politeness: assertive ? 'assertive' : 'polite', text });
      }
    };
    for (const region of regions()) heard.set(region, spoken(region).replace(/\s+/g, ' ').trim());
    new MutationObserver(listen).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
    (window as unknown as { __said: typeof said }).__said = said;
  });
}

/** Everything announced since `listenForAnnouncements`. */
export function announcements(page: Page): Promise<Announcement[]> {
  return page.evaluate(
    () => (window as unknown as { __said: Announcement[] }).__said.slice() as Announcement[],
  );
}

/** Whether the page's canvas is drawn dark, as the dark theme draws it (L2-041). */
export function canvasIsDark(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true })!;
    probe.fillStyle = getComputedStyle(document.body).backgroundColor;
    probe.fillRect(0, 0, 1, 1);
    const [r, g, b] = probe.getImageData(0, 0, 1, 1).data;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
  });
}

/**
 * Sets the browser's text to 200%, as its own setting does: the default font size goes from 16 to
 * 32 px, so every size in `rem` doubles and every breakpoint in `rem` moves with it (ADR 0029).
 */
export async function enlargeText(page: Page): Promise<string> {
  const browser = await page.context().newCDPSession(page);
  await browser.send('Page.setFontSizes', { fontSizes: { standard: 32, fixed: 26 } });
  await browser.detach();
  await settled(page);
  return page.evaluate(() => getComputedStyle(document.documentElement).fontSize);
}
