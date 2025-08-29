const HtmlWebPack       = require('html-webpack-plugin'); 
const MiniCssExtract    = require('mini-css-extract-plugin');
const CopyPlugin = require("copy-webpack-plugin");


const CssMinimizer = require("css-minimizer-webpack-plugin");
const Terser = require("terser-webpack-plugin");


module.exports = {
    mode: 'production',

    optimization: {
        minimizer: [ new CssMinimizer(), new Terser() ]
    },

    output: {
        filename: 'main.js'
    },

    module: {

        rules: [

            {

                test: /\.html$/i,

                loader: 'html-loader',

                options: {

                    sources: false,

                },

            },

            {
                test: /\.css$/,
                exclude: /styles.css$/,
                use:[ 'style-loader','css-loader' ]
            },

            {
                test: /\.css$/,
                use: [MiniCssExtract.loader, "css-loader"],
            },

            {

                test: /\.(png|jpe?g|gif)$/,
                loader:'file-loader'

            },

            {
                test: /\.m?js$/,
                exclude: /node_modules/,
                use: {
                  loader: "babel-loader",
                  options: {
                    presets: ['@babel/preset-env']
                  }
                }
              }


        ]
    },

    plugins: [
        
        new HtmlWebPack({

            title: 'Mi webpack app',

            // filename: 'index.html'

            template: './src/index.html'

        }),

        new MiniCssExtract({

            filename:'Styles.css',
            ignoreOrder: false

        }),

        new CopyPlugin({
            patterns: [ 
                { from: "src/assets/", to: "assets/" }
            ],

          })

    ],

    devServer: {

        port:8080,
        liveReload:true,
        hot:false

    }

}

