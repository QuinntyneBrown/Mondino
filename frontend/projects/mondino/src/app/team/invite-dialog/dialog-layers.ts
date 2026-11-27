// What the invite dialog's opener takes from the CDK, by name, so the build keeps only these and
// not every export of `@angular/cdk/overlay` (a dynamic import of a package keeps them all).
export { Dialog } from '@angular/cdk/dialog';
export { OVERLAY_DEFAULT_CONFIG } from '@angular/cdk/overlay';
