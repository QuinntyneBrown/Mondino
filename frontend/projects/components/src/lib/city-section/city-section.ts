import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CitySectionContent } from '@mondino/api';
import { TeamTable } from '../team-table/team-table';

/**
 * One city of a large team's list (L2-056), the mocks' `city-section`: a heading whose button
 * gives the city, how many teammates it has and its local time, and opens or closes it, its state
 * in `aria-expanded`. Open, it holds the city's rows in a `TeamTable`, at most 50, and then a line
 * saying how many more there are and to search for them; closed, it holds none. The city's name is
 * data.
 */
@Component({
  selector: 'mo-city-section',
  imports: [TeamTable],
  templateUrl: './city-section.html',
  styleUrl: './city-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CitySection {
  readonly content = input.required<CitySectionContent>();
  /** The address that selects a teammate on the Globe: "/globe?teammate=…". */
  readonly address = input.required<(teammateId: string) => string>();

  /** The city's key, when its button is used. */
  readonly toggled = output<string>();
  readonly teammateChosen = output<string>();

  /**
   * "14 more teammates in London.": one string, so the template needs no interpolation of three
   * values, whose runtime would land in the initial chunk.
   */
  protected readonly moreLine = computed(() => {
    const { more, name } = this.content();
    return `${more} more ${more === 1 ? 'teammate' : 'teammates'} in ${name}.`;
  });

  /** The id of the city's table, which its button names: "city-honolulu-united-states". */
  protected readonly tableId = computed(
    () =>
      'city-' +
      this.content()
        .key.normalize('NFD')
        .replace(/\p{M}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
  );
}
