import type { Locator, Page } from '@playwright/test';

/** The widths L2-037 names: a narrow phone, a phone, and each breakpoint up to a large display. */
export const WIDTHS = [320, 375, 576, 768, 992, 1200, 1920] as const;

/** True when the page does not scroll sideways at its current width. */
export function fitsItsWidth(page: Page): Promise<boolean> {
  return page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
}

/** The smaller of a control's width and height, in px: a touch target is at least 44. */
export async function smallestTarget(control: Locator): Promise<number> {
  const box = await control.boundingBox();
  return box ? Math.min(box.width, box.height) : 0;
}

/**
 * The area that takes a touch on a control, in px: the control's box, grown by a transparent
 * `::after` where a small drawn control widens its target to 44 px.
 */
export function touchTarget(control: Locator): Promise<{ width: number; height: number }> {
  return control.evaluate((element) => {
    const drawn = element.getBoundingClientRect();
    const grown = getComputedStyle(element, '::after');
    const absolute = grown.content !== 'none' && grown.position === 'absolute';
    const out = (side: string) => (absolute ? Math.max(0, -parseFloat(side) || 0) : 0);
    return {
      width: drawn.width + out(grown.left) + out(grown.right),
      height: drawn.height + out(grown.top) + out(grown.bottom),
    };
  });
}

/**
 * What a person would find cut off at the page's current width (L2-037): any text or control that
 * sticks out past the window's sides or out of a box that hides its overflow, and any two controls
 * that lie over each other. Each is named by its tag, its class and its text. What the globe draws
 * (its pins and their labels, at its own rim) and a box that scrolls on its own are left to their
 * own specs.
 */
export function cutOff(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found: string[] = [];
    const width = document.documentElement.clientWidth;
    const name = (element: Element): string =>
      `${element.tagName.toLowerCase()}.${[...element.classList].join('.')} “${(element.textContent ?? '').trim().slice(0, 40)}”`;
    const shown = (element: Element): boolean => {
      const box = element.getBoundingClientRect();
      if (box.width <= 1 || box.height <= 1) return false;
      const style = getComputedStyle(element);
      return style.visibility !== 'hidden' && style.opacity !== '0';
    };
    const ancestors = function* (element: Element): Generator<Element> {
      for (
        let parent = element.parentElement;
        parent && parent !== document.body;
        parent = parent.parentElement
      )
        yield parent;
    };
    const inGlobe = (element: Element): boolean => !!element.closest('.globe, .globe-stage');
    const isControl = (element: Element): boolean =>
      element.matches('a[href], button, input, select, textarea, [role="switch"], [role="radio"]');
    const hasText = (element: Element): boolean =>
      [...element.childNodes].some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== '',
      );

    const controls: Element[] = [];
    for (const element of document.body.querySelectorAll('*')) {
      if (!(isControl(element) || hasText(element)) || inGlobe(element) || !shown(element))
        continue;
      if (element.closest('[aria-hidden="true"]') && !isControl(element)) continue;
      const box = element.getBoundingClientRect();
      // Inside a box that scrolls sideways on its own, it is reached by scrolling that box.
      const scroller = [...ancestors(element)].find((parent) =>
        ['auto', 'scroll'].includes(getComputedStyle(parent).overflowX),
      );
      if (scroller) {
        const outer = scroller.getBoundingClientRect();
        if (outer.left < -0.5 || outer.right > width + 0.5)
          found.push(`${name(scroller)} runs past the window`);
        continue;
      }
      // Past the window's sides.
      if (box.left < -0.5 || box.right > width + 0.5) {
        found.push(
          `${name(element)} runs past the window (${Math.round(box.left)}–${Math.round(box.right)} of ${width})`,
        );
        continue;
      }
      // Out of a box that hides its overflow.
      for (const parent of ancestors(element)) {
        const style = getComputedStyle(parent);
        if (style.overflowX === 'visible' && style.overflowY === 'visible') continue;
        const outer = parent.getBoundingClientRect();
        if (box.left < outer.left - 0.5 || box.right > outer.right + 0.5)
          found.push(`${name(element)} is cut off by ${name(parent).split(' ')[0]}`);
        break;
      }
      if (isControl(element)) controls.push(element);
    }

    // Two controls over each other, neither holding the other, outside an overlay.
    const flat = controls.filter((control) => !control.closest('.cdk-overlay-container'));
    for (let i = 0; i < flat.length; i++) {
      for (let j = i + 1; j < flat.length; j++) {
        const [a, b] = [flat[i], flat[j]];
        if (a.contains(b) || b.contains(a)) continue;
        const [p, q] = [a.getBoundingClientRect(), b.getBoundingClientRect()];
        const across = Math.min(p.right, q.right) - Math.max(p.left, q.left);
        const down = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
        if (across > 1 && down > 1) found.push(`${name(a)} lies over ${name(b)}`);
      }
    }
    return found;
  });
}
