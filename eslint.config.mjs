export default [
  {
    files: ["_temp_analysis.js"],
    languageOptions: { ecmaVersion: 2021, globals: { window: true, document: true, navigator: true, console: true, setTimeout: true, setInterval: true, clearTimeout: true, clearInterval: true, fetch: true, URL: true, Blob: true, File: true, FileReader: true, Promise: true, performance: true, indexedDB: true, location: true, alert: true, confirm: true, naver: true, JSZip: true } },
    rules: { "no-unused-vars": ["warn", { "vars": "all", "args": "none" }] }
  }
];
