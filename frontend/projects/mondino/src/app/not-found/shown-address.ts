/**
 * An address as a screen may show it: the host and the path, as text. The query string and the
 * fragment are left out, because either may carry something that is not for the screen.
 */
export function shownAddress(location: Pick<Location, 'host' | 'pathname'>): string {
  return `${location.host}${location.pathname}`;
}
