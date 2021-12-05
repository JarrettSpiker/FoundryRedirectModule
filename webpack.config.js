const path = require('path');

module.exports = {
  entry: './src/scripts/module.ts',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  optimization: { 
    minimize : false
  },
  output: {
    filename: 'module.js',
    path: path.resolve(__dirname, 'dist', 'scripts'),
  }
};