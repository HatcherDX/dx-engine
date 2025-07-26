const path = require('node:path')
const TerserPlugin = require('terser-webpack-plugin')

/** @type { import('webpack').Configuration } */
module.exports = {
  mode: 'production', // or 'development'
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
  optimization: {
    minimize: true, // enable code compression and obfuscation
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
