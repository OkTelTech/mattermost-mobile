// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Reactotron from 'reactotron-react-native';
import {Platform} from 'react-native';

// Extend console for easy logging
declare global {
    interface Console {
        tron: typeof Reactotron | undefined;
    }
}

// Only initialize Reactotron in development mode
let reactotron: typeof Reactotron | undefined;

if (__DEV__) {
    // Configure Reactotron for development debugging
    reactotron = Reactotron
        .configure({
            name: 'Mattermost Mobile',
            host: Platform.OS === 'ios' ? 'localhost' : '10.0.2.2', // Android emulator uses 10.0.2.2
        })
        .useReactNative({
            asyncStorage: false, // We use WatermelonDB, not AsyncStorage
            networking: {
                ignoreUrls: /symbolicate|logs/,
            },
            editor: false,
            errors: {veto: () => false},
            overlay: false,
        })
        .connect();

    console.tron = reactotron;
}

// Custom logging functions
export const logToReactotron = (name: string, value?: unknown) => {
    if (__DEV__ && reactotron) {
        reactotron.display({
            name,
            value,
            preview: typeof value === 'string' ? value : JSON.stringify(value)?.substring(0, 100),
        });
    }
};

// API request logging helper
export const logApiRequest = (
    method: string,
    url: string,
    status: number,
    duration: number,
    requestBody?: unknown,
    responseBody?: unknown,
) => {
    if (__DEV__ && reactotron) {
        reactotron.display({
            name: `API ${method}`,
            value: {
                url,
                status,
                duration: `${duration}ms`,
                request: requestBody,
                response: responseBody,
            },
            preview: `${status} ${url}`,
            important: status >= 400,
        });
    }
};

// WebSocket event logging helper
export const logWebSocketEvent = (event: string, data?: unknown) => {
    if (__DEV__ && reactotron) {
        reactotron.display({
            name: `WS ${event}`,
            value: data,
            preview: typeof data === 'object' ? JSON.stringify(data)?.substring(0, 100) : String(data),
            important: event.includes('ERROR') || event.includes('CLOSE'),
        });
    }
};

export default reactotron;
