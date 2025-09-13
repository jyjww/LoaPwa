// webpack.config.js
const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

module.exports = (options, webpack) => {
  if (!options.resolve.plugins) {
    options.resolve.plugins = [];
  }
  options.resolve.plugins.push(
    new TsconfigPathsPlugin({ configFile: './tsconfig.build.json' }), // ✅ 여기!
  );
  return options;
};
