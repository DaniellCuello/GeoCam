const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Soporte para archivos SQL y WebAssembly (.wasm) de expo-sqlite en web
config.resolver.sourceExts.push('sql');
if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

// Habilitar resolución moderna de paquetes
config.resolver.unstable_enablePackageExports = true;

// Inyectar headers COOP/COEP para WebAssembly y SharedArrayBuffer en Web
config.server = config.server || {};
const defaultEnhanceMiddleware = config.server.enhanceMiddleware;
config.server.enhanceMiddleware = (middleware, server) => {
  const enhanced = defaultEnhanceMiddleware ? defaultEnhanceMiddleware(middleware, server) : middleware;
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    return enhanced(req, res, next);
  };
};

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react-native-safe-area-context') {
    return {
      filePath: path.resolve(__dirname, 'src/lib/safe-area-context.js'),
      type: 'sourceFile',
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
