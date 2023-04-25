import { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import common from './webpack.common';

const config: Configuration = merge(common, {
    mode: 'development', // Defina o modo de construção para 'development'
    devtool: 'inline-source-map', // Fonte do mapa de origem para depuração
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
});

export default config;
