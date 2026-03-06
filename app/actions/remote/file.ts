// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getOrCreateAPIClient, type ClientResponse, type ClientResponseError, type ProgressPromise} from '@mattermost/react-native-network-client';
import RNFS from 'react-native-fs';

import NetworkManager from '@managers/network_manager';
import {toMilliseconds} from '@utils/datetime';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug, logError} from '@utils/log';

import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

// Use RNFS (react-native-fs) for downloads on both platforms.
// RNFS uses NSURLSession (iOS) / OkHttp (Android) which follow redirects natively.
// On iOS, NSURLSession strips the Authorization header on cross-domain redirects
// (Mattermost → GCS), so GCS receives no Bearer token and accepts the presigned URL.
function createFileDownload(url: string, destination: string, authHeader: string | undefined): ProgressPromise<ClientResponse> {
    const dest = destination.startsWith('file://') ? destination.replace('file://', '') : destination;
    const progressCallbacks: Array<(fraction: number) => void> = [];
    let jobId: number | undefined;

    const doDownload = async (): Promise<ClientResponse> => {
        const headers: Record<string, string> = {};
        if (authHeader) {
            headers.Authorization = authHeader;
        }

        const {jobId: id, promise} = RNFS.downloadFile({
            fromUrl: url,
            toFile: dest,
            headers,
            progress: (res) => {
                if (res.contentLength > 0) {
                    const fraction = res.bytesWritten / res.contentLength;
                    progressCallbacks.forEach((cb) => cb(fraction));
                }
            },
        });
        jobId = id;

        const result = await promise;
        if (result.statusCode >= 200 && result.statusCode < 300) {
            return {
                ok: true,
                code: result.statusCode,
                data: {path: dest},
            };
        }
        throw new Error(`Download failed with status ${result.statusCode}`);
    };

    const promise = doDownload() as ProgressPromise<ClientResponse>;

    promise.progress = (cb) => {
        progressCallbacks.push(cb);
        return promise;
    };
    promise.cancel = () => {
        if (jobId !== undefined) {
            RNFS.stopDownload(jobId);
        }
    };

    return promise;
}

export const downloadFile = (serverUrl: string, fileId: string, destination: string): ProgressPromise<ClientResponse> => {
    const client = NetworkManager.getClient(serverUrl);
    const url = client.getFileUrl(fileId, 0);
    return createFileDownload(url, destination, client.requestHeaders.Authorization);
};

export const downloadProfileImage = (serverUrl: string, userId: string, lastPictureUpdate: number, destination: string): ProgressPromise<ClientResponse> => {
    const client = NetworkManager.getClient(serverUrl);
    const relativePath = client.getProfilePictureUrl(userId, lastPictureUpdate);
    const url = relativePath.startsWith('http') ? relativePath : `${client.apiClient.baseUrl}${relativePath}`;
    return createFileDownload(url, destination, client.requestHeaders.Authorization);
};

export const uploadFile = (
    serverUrl: string,
    file: FileInfo | ExtractedFileInfo,
    channelId: string,
    onProgress: (fractionCompleted: number, bytesRead?: number | null | undefined) => void = () => {/*Do Nothing*/},
    onComplete: (response: ClientResponse) => void = () => {/*Do Nothing*/},
    onError: (response: ClientResponseError) => void = () => {/*Do Nothing*/},
) => {
    let cancelled = false;
    let cancelUpload: (() => void) | undefined;

    const cancel = () => {
        cancelled = true;
        cancelUpload?.();
    };

    const run = async () => {
        try {
            const client = NetworkManager.getClient(serverUrl);
            const filename = file.name || 'upload';
            const fileSize = file.size || 0;

            if (cancelled) {
                return;
            }

            // Step 1: POST /api/v4/uploads — create upload session
            const session: {id: string; presigned_url: string} | undefined = await client.createUploadSession(channelId, filename, fileSize);

            if (cancelled) {
                return;
            }
            if (!session?.id) {
                onError({code: 0, message: 'Failed to create upload session', domain: ''});
                return;
            }

            // Step 2: PUT binary stream directly to the presigned GCS URL
            const localPath = file.localPath || '';
            const presignedUrl = session.presigned_url;
            const gcsBaseMatch = presignedUrl.match(/^(https?:\/\/[^/]+)([\s\S]*)$/);
            if (!gcsBaseMatch) {
                onError({code: 0, message: 'Invalid presigned URL format', domain: ''});
                return;
            }
            const gcsBaseUrl = gcsBaseMatch[1];
            const gcsPath = gcsBaseMatch[2];

            // Create a separate API client for GCS — no Mattermost auth headers
            const {client: gcsApiClient} = await getOrCreateAPIClient(gcsBaseUrl, {
                sessionConfiguration: {
                    allowsCellularAccess: true,
                    waitsForConnectivity: false,
                },
            });

            const uploadPromise = gcsApiClient.upload(
                gcsPath,
                localPath,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/octet-stream',
                        'Content-Length': String(fileSize),
                    },
                    timeoutInterval: toMilliseconds({minutes: 5}),
                },
            ) as ProgressPromise<ClientResponse>;

            cancelUpload = uploadPromise.cancel;

            if (cancelled) {
                uploadPromise.cancel?.();
                return;
            }

            await new Promise<void>((resolve, reject) => {
                uploadPromise.progress!((fraction, bytesRead) => {
                    onProgress(fraction ?? 0, bytesRead);
                }).then((response) => {
                    if (response.ok) {
                        resolve();
                    } else {
                        reject(new Error(`Upload failed with status ${response.code}`));
                    }
                }).catch((error) => {
                    reject(error);
                });
            });

            cancelUpload = undefined;

            if (cancelled) {
                return;
            }

            // Step 3: POST /api/v4/uploads/{id}/complete — finalize session
            const fileInfo: FileInfo | undefined = await client.completeUploadSession(session.id);
            if (cancelled) {
                return;
            }

            onComplete({
                ok: true,
                code: 200,
                data: fileInfo,
            } as ClientResponse);
        } catch (error) {
            if (cancelled) {
                return;
            }
            const message = getFullErrorMessage(error);
            logError('[uploadFile]', message);
            onError({code: 0, message, domain: ''});
        }
    };

    run();
    return {cancel};
};

export const fetchPublicLink = async (serverUrl: string, fileId: string) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const publicLink = await client!.getFilePublicLink(fileId);
        return publicLink;
    } catch (error) {
        logDebug('error on fetchPublicLink', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const buildFileUrl = (serverUrl: string, fileId: string, timestamp = 0) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return '';
    }

    return client.getFileUrl(fileId, timestamp);
};

export const buildAbsoluteUrl = (serverUrl: string, relativePath: string) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return '';
    }

    return client.getAbsoluteUrl(relativePath);
};

export const buildFilePreviewUrl = (serverUrl: string, fileId: string, timestamp = 0) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return '';
    }

    return client.getFilePreviewUrl(fileId, timestamp);
};

export const buildFileThumbnailUrl = (serverUrl: string, fileId: string, timestamp = 0) => {
    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return '';
    }

    return client.getFileThumbnailUrl(fileId, timestamp);
};
