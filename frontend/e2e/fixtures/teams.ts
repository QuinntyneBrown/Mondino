import type { Answer } from './api';

/** Where Create Team looks a postal code up, searches the cities and makes the team. */
export const CREATE_LOOKUPS = '/api/postal-code-lookups';
export const CREATE_CITY_SEARCHES = '/api/city-searches';
export const TEAMS = '/api/teams';

/** Northwind's invite token, as the backend makes it for a new team: 22 random characters. */
export const NEW_INVITE_TOKEN = 'Xq7Lr2Vb9TzK4mNc8PwYdA';

/** What making Northwind answers: random ids, the team's name and its invite token, and nothing else. */
export const NORTHWIND_CREATED: Answer = {
  status: 201,
  json: {
    teamId: 'c8a2f0de-5b1e-4f7c-9a3d-2e6b8f1c4d07',
    teammateId: '5f3e9b2a-7c41-4d8e-b6a0-91d2c7e4f318',
    teamName: 'Northwind',
    inviteToken: NEW_INVITE_TOKEN,
  },
};

/** The supported countries, in the order Create Team lists them, as on Join. */
export const COUNTRY_NAMES = [
  'Australia',
  'Brazil',
  'Canada',
  'Germany',
  'Ghana',
  'India',
  'Ireland',
  'Italy',
  'Japan',
  'Mexico',
  'Sweden',
  'United Arab Emirates',
  'United States',
];
