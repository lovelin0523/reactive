const path = require('path')
module.exports = {
	entry: './src/Reactive.js', //入口文件
	output: { //输出
		path: path.resolve(__dirname, 'dist'),
		filename: "reactive.js",
		library: 'Reactive',
		libraryTarget: "umd"
	},
	module: {
		rules: [{
			test: /\.js$/,
			exclude: /node_modules/,
			loader: "babel-loader"
		}]
	},
	devtool: 'eval-source-map', //调试可看到源码
}
