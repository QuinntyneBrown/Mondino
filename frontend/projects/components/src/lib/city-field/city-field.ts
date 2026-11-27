import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
  signal,
} from '@angular/core';
import type { CityResult } from '@mondino/api';

/**
 * "Your city": the field that takes the postal code's place on Join while the lookup is down
 * (L2-004). A text input in the WAI-ARIA combobox pattern with a listbox of the matching cities:
 * Up and Down move through the list, Enter or a tap chooses, Escape closes it. Each city's name and
 * region are rendered as text. The screen holds the text and searches; this component injects
 * nothing.
 */
@Component({
  selector: 'mo-city-field',
  templateUrl: './city-field.html',
  styleUrl: './city-field.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CityField {
  readonly fieldId = input('city');
  readonly text = input('');
  readonly results = input<readonly CityResult[]>([]);
  /** The country's name, which names the list: "Cities in Italy". */
  readonly countryName = input('');

  readonly textChange = output<string>();
  readonly choose = output<CityResult>();

  /** The option Up and Down have reached, or -1. A new list starts with none. */
  protected readonly active = linkedSignal({ source: this.results, computation: () => -1 });
  /** Escape or leaving the field closes the list until something is typed again. */
  protected readonly closed = signal(false);

  protected readonly expanded = computed(() => !this.closed() && this.results().length > 0);
  protected readonly listId = computed(() => `${this.fieldId()}-list`);
  protected readonly helpId = computed(() => `${this.fieldId()}-help`);
  protected readonly listLabel = computed(() => `Cities in ${this.countryName()}`);

  protected optionId(index: number): string {
    return `${this.fieldId()}-option-${index}`;
  }

  protected typed(value: string): void {
    this.closed.set(false);
    this.textChange.emit(value);
  }

  protected key(event: KeyboardEvent): void {
    const count = this.results().length;
    switch (event.key) {
      case 'ArrowDown':
        if (count === 0) return;
        event.preventDefault();
        this.closed.set(false);
        this.active.set((this.active() + 1) % count);
        break;
      case 'ArrowUp':
        if (count === 0) return;
        event.preventDefault();
        this.closed.set(false);
        this.active.set(this.active() <= 0 ? count - 1 : this.active() - 1);
        break;
      case 'Enter':
        if (this.expanded() && this.active() >= 0) {
          event.preventDefault();
          this.choose.emit(this.results()[this.active()]);
        }
        break;
      case 'Escape':
        if (this.expanded()) {
          event.preventDefault();
          this.closed.set(true);
        }
        break;
    }
  }
}
