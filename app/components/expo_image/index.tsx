// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Image, ImageBackground, type ImageBackgroundProps, type ImageProps, type ImageSource} from 'expo-image';
import React, {forwardRef, useMemo} from 'react';
import Animated from 'react-native-reanimated';

import {useServerUrl} from '@context/server';
import NetworkManager from '@managers/network_manager';
import {urlSafeBase64Encode} from '@utils/security';

type ExpoImagePropsWithId = ImageProps & {id: string};
type ExpoImagePropsMemoryOnly = ImageProps & {cachePolicy: 'memory'; id?: string};
type ExpoImageProps = ExpoImagePropsWithId | ExpoImagePropsMemoryOnly;

type ExpoImageBackgroundPropsWithId = ImageBackgroundProps & {id: string};
type ExpoImageBackgroundPropsMemoryOnly = ImageBackgroundProps & {cachePolicy: 'memory'; id?: string};
type ExpoImageBackgroundProps = ExpoImageBackgroundPropsWithId | ExpoImageBackgroundPropsMemoryOnly;

// Get the Authorization header for the given server URL.
// On Android, expo-image's HTTP client does not share the app's Bearer token,
// so we must inject it manually into the ImageSource headers.
// NOTE: Read fresh every call — no memoization — to avoid stale values after token refresh.
function getAuthHeader(serverUrl: string): string | undefined {
    try {
        return NetworkManager.getClient(serverUrl).requestHeaders.Authorization;
    } catch (e) {
        return undefined;
    }
}

// Adds Authorization header to a source/placeholder ImageSource if its URI
// points to the current Mattermost server (skips data URIs and external URLs).
function addAuthToSource(
    src: ImageSource | undefined,
    serverUrl: string,
    authHeader: string | undefined,
): ImageSource | undefined {
    if (!src || !authHeader || !src.uri) {
        return src;
    }
    if (!src.uri.startsWith(serverUrl)) {
        return src;
    }
    return {...src, headers: {...src.headers, Authorization: authHeader}};
}

const ExpoImage = forwardRef<Image, ExpoImageProps>(({id, ...props}, ref) => {
    const serverUrl = useServerUrl();

    /**
     * SECURITY NOTE: cachePath uses base64 encoding for URL safety, NOT encryption.
     * Server URLs are not considered sensitive information, and this encoding is purely
     * for filesystem path compatibility (avoiding special characters in directory names).
     */
    const cachePath = useMemo(() => urlSafeBase64Encode(serverUrl), [serverUrl]);

    // Read auth header fresh each render — avoids stale useMemo if token changes or client
    // wasn't ready on first render.
    const authHeader = getAuthHeader(serverUrl);

    const source: ImageSource = useMemo(() => {
        if (typeof props.source === 'number') {
            return props.source;
        }

        const srcWithAuth = addAuthToSource(props.source as ImageSource, serverUrl, authHeader);

        // Only add cacheKey and cachePath if id is provided (i.e., not memory-only caching)
        if (id) {
            return {
                ...srcWithAuth,
                cacheKey: id,
                cachePath,
            };
        }

        return srcWithAuth ?? props.source;
    }, [id, props.source, cachePath, serverUrl, authHeader]);

    // Process placeholder to add cachePath, cacheKey and auth headers if it has a uri
    const placeholder: ImageSource | undefined = useMemo(() => {
        if (!props.placeholder || typeof props.placeholder === 'number' || typeof props.placeholder === 'string') {
            return props.placeholder;
        }

        const phWithAuth = addAuthToSource(props.placeholder as ImageSource, serverUrl, authHeader);

        // If placeholder has a uri and id is provided, add cachePath and cacheKey
        if (phWithAuth?.uri && id) {
            return {
                ...phWithAuth,
                cacheKey: `${id}-thumb`,
                cachePath,
            };
        }

        return phWithAuth ?? props.placeholder;
    }, [props.placeholder, id, cachePath, serverUrl, authHeader]);

    return (
        <Image
            ref={ref}
            {...props}
            source={source}
            placeholder={placeholder}
        />
    );
});
ExpoImage.displayName = 'ExpoImage';

const ExpoImageBackground = ({id, ...props}: ExpoImageBackgroundProps) => {
    const serverUrl = useServerUrl();
    const cachePath = useMemo(() => urlSafeBase64Encode(serverUrl), [serverUrl]);
    const authHeader = getAuthHeader(serverUrl);

    const source: ImageSource = useMemo(() => {
        if (typeof props.source === 'number') {
            return props.source;
        }

        const srcWithAuth = addAuthToSource(props.source as ImageSource, serverUrl, authHeader);

        // Only add cacheKey and cachePath if id is provided (i.e., not memory-only caching)
        if (id) {
            return {
                ...srcWithAuth,
                cacheKey: id,
                cachePath,
            };
        }

        return srcWithAuth ?? props.source;
    }, [id, props.source, cachePath, serverUrl, authHeader]);

    // Process placeholder to add cachePath, cacheKey and auth headers if it has a uri
    const placeholder: ImageSource | undefined = useMemo(() => {
        if (!props.placeholder || typeof props.placeholder === 'number' || typeof props.placeholder === 'string') {
            return props.placeholder;
        }

        const phWithAuth = addAuthToSource(props.placeholder as ImageSource, serverUrl, authHeader);

        // If placeholder has a uri and id is provided, add cachePath and cacheKey
        if (phWithAuth?.uri && id) {
            return {
                ...phWithAuth,
                cacheKey: `${id}-thumb`,
                cachePath,
            };
        }

        return phWithAuth ?? props.placeholder;
    }, [props.placeholder, id, cachePath, serverUrl, authHeader]);

    return (
        <ImageBackground
            {...props}
            source={source}
            placeholder={placeholder}
        >
            {props.children}
        </ImageBackground>
    );
};

const ExpoImageAnimated = Animated.createAnimatedComponent(ExpoImage);

export {
    ExpoImageAnimated,
    ExpoImageBackground,
};

export default ExpoImage;
