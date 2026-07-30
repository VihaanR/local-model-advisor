import sharp from 'sharp';

await sharp('media/icon.svg', { density: 300 })
	.resize(256, 256)
	.png()
	.toFile('media/icon.png');
console.log('media/icon.png written');
