const sharp = require("sharp");

/**
 * Compress image before storing
 */
async function compressImage(buffer) {
  return sharp(buffer)
    .rotate() // auto-orient
    .resize({
      width: 1280,
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 70,
      mozjpeg: true,
    })
    .toBuffer();
}

module.exports = {
  compressImage,
};
