/**
 * Where Sign In stands (L2-052). `Opening` and `LinkUnusable` show the form, as `Idle` does, until
 * their own screens are designed (docs/adr/0011).
 */
export type SignInState =
  | { readonly kind: 'Idle' }
  | { readonly kind: 'Invalid' }
  | { readonly kind: 'Sending' }
  | { readonly kind: 'Sent'; readonly email: string }
  | { readonly kind: 'Failed' }
  | { readonly kind: 'Opening' }
  | { readonly kind: 'LinkUnusable' };
