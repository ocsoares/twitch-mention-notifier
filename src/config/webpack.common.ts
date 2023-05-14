/* eslint-disable @typescript-eslint/naming-convention */

import { Configuration } from 'webpack';
import * as MiniCssExtractPlugin from 'mini-css-extract-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { resolve } from 'path';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';

import ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');

const config: Configuration = {
    entry: {
        content: './src/content.ts',
        popup: './src/popup.ts',
        background: './src/background.ts',
    },
    output: {
        path: resolve(__dirname, '..', 'webpack-dist'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: [MiniCssExtractPlugin.loader, 'css-loader'],
            },
        ],
    },
    resolve: {
        extensions: ['.ts', '.js'],
    },
    plugins: [
        new CleanWebpackPlugin({
            dry: false,
            dangerouslyAllowCleanPatternsOutsideProject: true,
        }),
        new CopyWebpackPlugin({
            patterns: [
                {
                    from: '**/*',
                    context: 'public',
                },
                {
                    from: 'dist/background.js',
                    to: 'background.js',
                    context: '.',
                },
            ],
        }),
        new ForkTsCheckerWebpackPlugin({
            typescript: {
                configFile: 'tsconfig.json',
            },
        }),
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].css',
            chunkFilename: '[id].[contenthash].css',
        }),
    ],
};

export default config;
