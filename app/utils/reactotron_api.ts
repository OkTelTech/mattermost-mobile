// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Reactotron API logging utility
 * Uses the connected Reactotron instance from reactotron.ts
 */

/**
 * Log API request/response to Reactotron
 */
export const logApiToReactotron = (
    method: string,
    url: string,
    status: number,
    duration: number,
    requestBody?: unknown,
    responseBody?: unknown,
) => {
    if (!__DEV__) {
        return;
    }

    // Use console.tron which is set by reactotron.ts
    const reactotron = console.tron;
    if (!reactotron?.display) {
        return;
    }

    // Extract endpoint from URL for cleaner display
    const endpoint = url.replace(/^\/api\/v4/, '');

    const isError = status >= 400;
    const statusEmoji = isError ? '❌' : '✅';

    // Also log to console for Metro terminal
    // eslint-disable-next-line no-console
    console.log(`\n${statusEmoji} API ${method} ${status} ${endpoint} (${duration}ms)`);

    // Log request body if exists
    if (requestBody) {
        const requestStr = JSON.stringify(requestBody, null, 2);
        // eslint-disable-next-line no-console
        console.log('📤 Request:', requestStr.length > 500 ? requestStr.substring(0, 500) + '... (truncated)' : requestStr);
    }

    // Log response body (truncate if too long)
    if (responseBody) {
        const responseStr = JSON.stringify(responseBody, null, 2);
        const maxLength = 1000; // Show first 1000 chars
        // eslint-disable-next-line no-console
        console.log('📥 Response:', responseStr.length > maxLength ? responseStr.substring(0, maxLength) + `\n... (truncated, total ${responseStr.length} chars)` : responseStr);
    }
    // eslint-disable-next-line no-console
    console.log('─'.repeat(60));

    try {
        reactotron.display({
            name: `${statusEmoji} ${method} ${status}`,
            value: {
                url,
                endpoint,
                status,
                duration: `${duration}ms`,
                request: requestBody,
                response: responseBody,
            },
            preview: `${endpoint} (${duration}ms)`,
            important: isError,
        });
    } catch {
        // Reactotron not available
    }
};

/**
 * Log custom message to Reactotron
 */
export const logToReactotron = (name: string, value?: unknown) => {
    if (!__DEV__) {
        return;
    }

    const reactotron = console.tron;
    if (!reactotron?.display) {
        return;
    }

    try {
        reactotron.display({
            name,
            value,
            preview: typeof value === 'string' ? value : JSON.stringify(value)?.substring(0, 100),
        });
    } catch {
        // Reactotron not available
    }
};

/**
 * Log error to Reactotron
 */
export const logErrorToReactotron = (name: string, error: unknown) => {
    if (!__DEV__) {
        return;
    }

    const reactotron = console.tron;
    if (!reactotron?.display) {
        return;
    }

    try {
        reactotron.display({
            name: `❌ ${name}`,
            value: error,
            preview: error instanceof Error ? error.message : String(error),
            important: true,
        });
    } catch {
        // Reactotron not available
    }
};
