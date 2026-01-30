// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

const path = require('path');

const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
    resolver: {
        extraNodeModules: {
            'expo-asset': path.resolve(__dirname, 'node_modules/expo/node_modules/expo-asset'),
            'expo-constants': path.resolve(__dirname, 'node_modules/expo/node_modules/expo-constants'),
            'expo-file-system': path.resolve(__dirname, 'node_modules/expo/node_modules/expo-file-system'),
            'expo-font': path.resolve(__dirname, 'node_modules/expo/node_modules/expo-font'),
            'expo-keep-awake': path.resolve(__dirname, 'node_modules/expo/node_modules/expo-keep-awake'),
        },
    },
};

module.exports = mergeConfig(defaultConfig, config);
