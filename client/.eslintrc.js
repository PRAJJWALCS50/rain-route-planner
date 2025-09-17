/** @type {import('eslint').Linter.Config} */
module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Add any custom ESLint rules here
    'no-unused-vars': 'warn',
    'no-console': 'warn'
  },
  ignorePatterns: [
    'build/',
    'node_modules/',
    '*.config.js'
  ]
}
