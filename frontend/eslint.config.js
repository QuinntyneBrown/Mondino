// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

/**
 * The dependency direction of AGENTS.md:
 *   mondino → components, api, domain, globe;  domain → api;
 *   components → api (types only);  globe → api;  api → nothing.
 * No library imports the app. A new library takes its place here in the same change.
 */
const boundary = (project, forbidden, message) => ({
  files: [`projects/${project}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          { group: forbidden, message },
          {
            group: ['**/projects/*', '../../../*/src/*'],
            message: 'Import another project as @mondino/<library>, never by a relative path.',
          },
        ],
      },
    ],
  },
});

module.exports = defineConfig([
  { ignores: ['dist/', '.angular/', 'test-results/', 'playwright-report/'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: 'mo', style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: ['element', 'attribute'], prefix: 'mo', style: 'kebab-case' },
      ],
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/use-component-view-encapsulation': 'error',
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
  boundary('api', ['@mondino/*'], '`api` depends on nothing.'),
  boundary(
    'domain',
    ['@mondino/components', '@mondino/globe', '@mondino/domain'],
    '`domain` depends on `api` only.',
  ),
  boundary(
    'components',
    ['@mondino/domain', '@mondino/globe', '@mondino/components', '@angular/router'],
    '`components` is presentation: it depends on `api` for types only and injects no router.',
  ),
  boundary(
    'globe',
    ['@mondino/components', '@mondino/domain', '@mondino/globe'],
    '`globe` depends on `api` only.',
  ),
  {
    files: ['projects/components/**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
  {
    files: ['e2e/specs/**/*.ts', 'e2e/sweeps/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.property.name=/^(locator|getByRole|getByText|getByLabel|getByTestId|getByPlaceholder|getByTitle|getByAltText|\\$|\\$\\$)$/]',
          message: 'A selector belongs in a page object, never in a spec.',
        },
        {
          selector: "CallExpression[callee.property.name='waitForTimeout']",
          message: 'Never sleep: wait for what the screen shows, or advance the clock.',
        },
      ],
    },
  },
]);
