import {it,expect} from 'vitest';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
it('bundles a pinned, licensed WOFF2 font rather than a network font dependency',()=>{
 const provenance=JSON.parse(fs.readFileSync('src/renderer/fonts/PROVENANCE.json','utf8'));
 const font=fs.readFileSync('src/renderer/fonts/InterVariable.woff2');
 expect(font.subarray(0,4).toString()).toBe('wOF2');
 expect(createHash('sha256').update(font).digest('hex')).toBe(provenance.files['InterVariable.woff2']);
 expect(provenance.revision).toMatch(/^[a-f0-9]{40}$/);
 expect(fs.readFileSync('public/licenses/Inter-OFL.txt')).toEqual(fs.readFileSync('src/renderer/fonts/OFL.txt'));
 expect(fs.readFileSync('public/licenses/Inter-OFL.txt','utf8')).toContain('SIL OPEN FONT LICENSE');
 const css=fs.readFileSync('src/renderer/typography.css','utf8');
 expect(css).toContain("url('./fonts/InterVariable.woff2')");
 expect(css).not.toMatch(/https?:\/\/|@import/);
 expect(css).toContain('tabular-nums');
});
