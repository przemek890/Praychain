// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Extend sourceExts
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'cjs'];

// Add assetExts if needed
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'svg');

// Enable package exports for @noble/hashes
config.resolver.unstable_enablePackageExports = true;

// DODAJ ALIAS DLA uuid
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  uuid: path.resolve(__dirname, 'node_modules/uuid'),
};

// Custom resolver
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Handle node builtins
  if (moduleName.startsWith('node:')) {
    return context.resolveRequest(
      context,
      moduleName.replace('node:', ''),
      platform
    );
  }

  // Handle viem
  if (moduleName === 'viem' || moduleName.startsWith('viem/')) {
    try {
      const viemPath = path.join(__dirname, 'node_modules', 'viem');
      return {
        type: 'sourceFile',
        filePath: require.resolve(moduleName, {
          paths: [viemPath, __dirname]
        })
      };
    } catch (e) {
      // Fallback to default resolver
    }
  }

  // Handle jose
  if (moduleName === 'jose') {
    const ctx = {
      ...context,
      unstable_conditionNames: ['browser', 'import', 'require'],
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  // Handle isows and zustand
  if (moduleName === 'isows' || moduleName.startsWith('zustand')) {
    const ctx = {
      ...context,
      unstable_enablePackageExports: false,
    };
    return ctx.resolveRequest(ctx, moduleName, platform);
  }

  // Default resolver
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
