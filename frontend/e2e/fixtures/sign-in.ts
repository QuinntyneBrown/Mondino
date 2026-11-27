import type { Answer } from './api';

/** Where Sign In asks for a link and opens one. */
export const SIGN_IN_LINKS = '/api/sign-in-links';
export const REDEMPTIONS = '/api/sign-in-links/redemptions';

/** What asking for a link answers, whatever the email: 202 and no body. */
export const LINK_ASKED: Answer = { status: 202 };

/** A sign-in token as the backend makes it: 43 random characters. */
export const SIGN_IN_TOKEN = 'h3ZSIRBy9Sa9NK7burl1q6JTN1KD2EB3KgdIlW7Vxuw';

/** What opening Sofia's link answers: Northwind, by ids and name, and no email. */
export const SOFIA_SIGNED_IN: Answer = {
  json: {
    membership: {
      teamId: 'c8a2f0de-5b1e-4f7c-9a3d-2e6b8f1c4d07',
      teammateId: '5f3e9b2a-7c41-4d8e-b6a0-91d2c7e4f318',
      teamName: 'Northwind',
    },
    email: null,
  },
};

/** What opening a good link answers when its email is on no team: the email, and no team. */
export const ON_NO_TEAM: Answer = { json: { membership: null, email: 'sofia@northwind.co' } };
