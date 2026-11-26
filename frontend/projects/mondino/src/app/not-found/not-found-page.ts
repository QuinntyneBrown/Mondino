import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button, NoticePage } from '@mondino/components';
import { shownAddress } from './shown-address';

/** "This page fell off the map": an address that belongs to no screen. It reads no API. */
@Component({
  selector: 'mo-not-found-page',
  imports: [Button, NoticePage, RouterLink],
  templateUrl: './not-found-page.html',
  styleUrl: './not-found-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  protected readonly address = shownAddress(inject(DOCUMENT).location);
}
