import { TestBed } from '@angular/core/testing';
import { Wordmark } from './wordmark';

describe('Wordmark', () => {
  it('writes the wordmark in lowercase, with the mark hidden from assistive technology', () => {
    const fixture = TestBed.createComponent(Wordmark);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('.wordmark')?.textContent).toBe('mondino');
    expect(element.querySelector('.mark')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('hides the word on a phone only when it collapses', () => {
    const fixture = TestBed.createComponent(Wordmark);
    fixture.detectChanges();
    const brand = fixture.nativeElement.querySelector('.brand') as HTMLElement;
    expect(brand.classList.contains('brand--collapses')).toBe(false);

    fixture.componentRef.setInput('collapses', true);
    fixture.detectChanges();
    expect(brand.classList.contains('brand--collapses')).toBe(true);
  });
});
