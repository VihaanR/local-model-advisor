// One-off: re-renders media/icon.png from media/icon.svg.
//
// `sharp` is deliberately NOT a devDependency — it is a large platform-specific binary that
// would slow down (and occasionally break) `npm ci` in CI for a script that runs maybe once
// per icon change, and media/icon.png is committed. Install it on demand instead:
//
//   npm i --no-save sharp && node scripts/render-icon.mjs
//
import sharp from 'sharp';

await sharp('media/icon.svg', { density: 300 })
	.resize(256, 256)
	.png()
	.toFile('media/icon.png');
console.log('media/icon.png written');
