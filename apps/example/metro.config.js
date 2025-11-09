const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

// This can be replaced with `find-yarn-workspace-root`
const monorepoRoot = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);

// 1. Watch all files within the monorepo
config.watchFolders = [monorepoRoot];
// 2. Let Metro know where to resolve packages and in what order
config.resolver = {
  ...config.resolver,
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
    path.resolve(monorepoRoot, 'node_modules'),
  ],
  unstable_enableSymlinks: true, 
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    // Router transform 기능 비활성화
    routerTransformEnabled: false,
  },
});

module.exports = config;