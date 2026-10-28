import fs from 'node:fs';
const wanted = ['jose','electron','playwright','playwright-core','react','react-dom','sql.js','zod','yauzl','vite','vitest','esbuild','typescript','electron-builder','tailwindcss'];
const pkgs = wanted.map(n => {
  try {
    const p = JSON.parse(fs.readFileSync(`node_modules/${n}/package.json`,'utf8'));
    return `${n}@${p.version} — ${p.license ?? 'see LICENSE file'} — ${p.homepage ?? ''}`;
  } catch { return `${n} — not installed`; }
});
console.log(pkgs.join('\n'));
const directory = `browser-runtime/chromium-1248/${process.platform === 'win32' ? 'chrome-win64' : 'chrome-linux64'}`;
const notices = ['LICENSE', 'ABOUT'].filter(name => fs.existsSync(`${directory}/${name}`));
if (notices.length) console.log('\nBundled browser notices: ' + notices.map(name => `${directory}/${name}`).join(', ') + '. Browser component credits: chrome://credits. This listing is not a full license-compliance audit.');
else console.log('\nBrowser notices unavailable. Run npm run provision for this platform.');

console.log('Inter Variable — SIL Open Font License 1.1 — self-hosted font; public/licenses/Inter-OFL.txt; pinned provenance: src/renderer/fonts/PROVENANCE.json');
