// Metro ayarlari. Buradaki iki sey sadece web icin gerekli,
// Android/iOS bu dosya olmadan da calisiyor.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// expo-sqlite web'de wa-sqlite.wasm'i yukluyor ama Metro .wasm dosyalarini
// varsayilan olarak asset saymiyor.
config.resolver.assetExts.push('wasm');

// wa-sqlite worker'i SharedArrayBuffer kullaniyor, tarayici da bunu sadece
// cross-origin izolasyonu varsa veriyor.
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  return middleware(req, res, next);
};

module.exports = config;
