// Metro yapilandirmasi — yalnizca web hedefi icin gerekli iki ayar.
// Yerel (Android/iOS) derlemeler bu dosya olmadan da calisir.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite web tarafinda wa-sqlite.wasm'i yukluyor; Metro varsayilan olarak
// .wasm dosyalarini varlik saymiyor.
config.resolver.assetExts.push('wasm');

// wa-sqlite worker'i SharedArrayBuffer kullaniyor: tarayici bunu yalnizca
// cross-origin izolasyonu altinda veriyor.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = config;
