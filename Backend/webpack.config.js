const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

module.exports = (options) => {
  options.resolve = options.resolve || {};
  options.resolve.plugins = options.resolve.plugins || [];
  options.resolve.plugins.push(new TsconfigPathsPlugin({ configFile: './tsconfig.build.json' }));
  return options;
};
