const path = require('node:path')
const TerserPlugin = require('terser-webpack-plugin')

/** @type { import('webpack').Configuration } */
module.exports = {
  mode: process.env.MODE === 'development' ? 'development' : 'production',
  target: 'electron-main', // target environment set to Node.js
  entry: {
    main: './dist-vite/index.cjs',
    // extensionWorker: './dist-vite/extensionWorker.cjs',
  },
  output: {
    path: path.resolve(__dirname, 'dist'), // output directory
    filename: '[name].cjs', // use [name] placeholder to ensure each chunk has unique filename
  },
  node: {
    __dirname: false, // keep __dirname as is (important in Node.js)
    __filename: false,
  },
  // Externalize native modules and node_modules to prevent bundling errors
  // Context7 best practice: Let Electron load these at runtime from node_modules
  externals: [
    // Native modules that require compilation
    'node-pty',
    'better-sqlite3',
    'argon2',
    'sqlite3',

    // Optional dependencies of argon2 that may not be installed
    'mock-aws-s3',
    'aws-sdk',
    'nock',

    // Build tools and their dependencies (not needed at runtime)
    '@mapbox/node-pre-gyp',
    'node-pre-gyp',
    'node-gyp',
    'node-gyp-build',
    'prebuild-install',
    'napi-build-utils',
    'node-abi',
    'detect-libc',

    // Node.js built-in modules
    /^node:.*/,

    // Workspace packages (already handled by Vite)
    '@hatcherdx/terminal-system',
    '@hatcherdx/ai-cli',
    '@hatcherdx/storage',
    // Externalize all preload package subpaths (main, storage, etc.)
    /^@hatcherdx\/dx-engine-preload/,

    // Externalize any relative path imports (from Vite build artifacts)
    /^\.\.\/preload\/.*/,
  ],
  optimization: {
    // Only minimize in production to avoid Terser errors with modern JS syntax
    minimize: process.env.MODE !== 'development',
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: true, // enable code compression
          mangle: true, // obfuscate variable names
        },
        extractComments: false, // disable generation of LICENSE.txt file
      }),
    ],
    splitChunks: {
      chunks: 'all', // split all types of code
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
        common: {
          name: 'common',
          minChunks: 2, // modules shared by at least two chunks will be extracted to common chunk
          priority: -10,
          reuseExistingChunk: true,
        },
      },
    },
  },
  // module: {
  //   rules: [
  //     {
  //       test: /\.js$/,
  //       exclude: /node_modules/,
  //       use: 'babel-loader', // if need to transform modern JavaScript syntax
  //     },
  //   ],
  // },
}
