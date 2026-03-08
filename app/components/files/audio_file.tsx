// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    Platform,
    View,
    TouchableOpacity,
    Text,
    TouchableWithoutFeedback,
    type GestureResponderEvent,
} from 'react-native';
import RNFS from 'react-native-fs';
import Video, {type OnLoadData, type OnProgressData, type OnVideoErrorData, type VideoRef} from 'react-native-video';

import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {useDownloadFileAndPreview} from '@hooks/files';
import useThrottled from '@hooks/throttled';
import NetworkManager from '@managers/network_manager';
import {alertDownloadDocumentDisabled, alertOnlyPDFSupported} from '@utils/document';
import {logDebug} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import CompassIcon from '../compass_icon';
import FormattedText from '../formatted_text';
import ProgressBar from '../progress_bar';

type Props = {
    file: FileInfo;
    canDownloadFiles: boolean;
    enableSecureFilePreview: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    audioFileWrapper: {
        position: 'relative',
        borderColor: changeOpacity(theme.centerChannelColor, 0.2),
        borderRadius: 4,
        borderWidth: 1,
        padding: 12,
        overflow: 'hidden',
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    playButton: {
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: changeOpacity(theme.buttonBg, 0.12),
        borderRadius: 100,
        width: 40,
        height: 40,
    },
    playIcon: {
        color: theme.buttonBg,
    },
    downloadIcon: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
    },
    progressBar: {
        flex: 1,
    },
    timerText: {
        color: theme.centerChannelColor,
        ...typography('Body', 75, 'SemiBold'),
    },
}));

const AudioFile = ({file, canDownloadFiles, enableSecureFilePreview}: Props) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const [hasPaused, setHasPaused] = useState<boolean>(true);
    const [hasError, setHasError] = useState<boolean>(false);
    const [hasEnded, setHasEnded] = useState<boolean>(false);
    const [progress, setProgress] = useState<number>(0);
    const [timeInMinutes, setTimeInMinutes] = useState<string>('0:00');
    const [duration, setDuration] = useState<number>(0);
    const videoRef = useRef<VideoRef>(null);

    useEffect(() => {
        if (hasEnded) {
            const timer = setTimeout(() => {
                setHasPaused(true);
                setProgress(0);
                setHasEnded(false);
            }, 100);

            return () => clearTimeout(timer);
        }

        return () => null;
    }, [hasEnded]);

    const [androidLocalUri, setAndroidLocalUri] = useState<string | null>(null);

    useEffect(() => {
        if (Platform.OS !== 'android' || !file.id || !file.uri) {
            return;
        }

        let cancelled = false;
        const ext = file.extension || 'm4a';
        const tempPath = `${RNFS.CachesDirectoryPath}/audio_${file.id}.${ext}`;

        const downloadAudio = async () => {
            try {
                const exists = await RNFS.exists(tempPath);
                if (!exists) {
                    let authHeader: string | undefined;
                    try {
                        authHeader = NetworkManager.getClient(serverUrl).requestHeaders.Authorization;
                    } catch {
                        // client not available
                    }
                    await RNFS.downloadFile({
                        fromUrl: file.uri!,
                        toFile: tempPath,
                        ...(authHeader ? {headers: {Authorization: authHeader}} : {}),
                    }).promise;
                }
                if (!cancelled) {
                    setAndroidLocalUri(`file://${tempPath}`);
                }
            } catch {
                // fall back to direct URI on error
                if (!cancelled) {
                    setAndroidLocalUri(file.uri ?? null);
                }
            }
        };

        downloadAudio();
        return () => {
            cancelled = true;
        };

        // eslint-disable-next-line react-hooks/exhaustive-deps -- file.id and serverUrl identify the resource; file.uri and file.extension are stable for the same file
    }, [file.id, serverUrl]);

    const source = useMemo(() => {
        if (Platform.OS === 'android') {
            return {uri: androidLocalUri ?? ''};
        }
        let authHeader: string | undefined;
        try {
            authHeader = NetworkManager.getClient(serverUrl).requestHeaders.Authorization;
        } catch {
            // client not available
        }
        return {
            uri: file.uri,
            ...(authHeader ? {headers: {Authorization: authHeader}} : {}),
        };
    }, [androidLocalUri, file.uri, serverUrl]);

    const {toggleDownloadAndPreview} = useDownloadFileAndPreview(enableSecureFilePreview);

    const onPlayPress = () => {
        setHasPaused(!hasPaused);
    };

    const onDownloadPress = useCallback(async () => {
        if (enableSecureFilePreview) {
            alertOnlyPDFSupported(intl);
            return;
        }

        if (!canDownloadFiles) {
            alertDownloadDocumentDisabled(intl);
            return;
        }

        toggleDownloadAndPreview(file);
    }, [enableSecureFilePreview, canDownloadFiles, toggleDownloadAndPreview, file, intl]);

    const loadTimeInMinutes = useCallback((timeInSeconds: number) => {
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        setTimeInMinutes(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    }, []);

    const onLoad = useCallback((loadData: OnLoadData) => {
        loadTimeInMinutes(loadData.duration);
        setDuration(loadData.duration);
    }, [loadTimeInMinutes]);

    const throttledLoadTimeOneSecond = useThrottled(loadTimeInMinutes, 1000);
    const throttledLoadTime100Milliseconds = useThrottled(loadTimeInMinutes, 100);

    const onProgress = useCallback((progressData: OnProgressData) => {
        if (hasPaused) {
            return;
        }
        const {currentTime, playableDuration} = progressData;
        setProgress(currentTime / playableDuration);
        throttledLoadTimeOneSecond(currentTime);
    }, [hasPaused, throttledLoadTimeOneSecond]);

    const onEnd = useCallback(() => {
        if (videoRef.current) {
            videoRef.current.seek(0);
        }
        setHasEnded(true);
    }, []);

    const onError = useCallback(({error}: OnVideoErrorData) => {
        setHasError(true);
        logDebug((error && typeof error === 'object' && 'errorString' in error) ? error.errorString : error);
    }, []);

    const onSeek = useCallback((seekPosition: number) => {
        if (videoRef.current && duration > 0) {
            const newTime = seekPosition * duration;
            videoRef.current.seek(newTime);
            setProgress(seekPosition);
            throttledLoadTime100Milliseconds(newTime);
        }
    }, [duration, throttledLoadTime100Milliseconds]);

    const onAudioFocusChanged = useCallback(({hasAudioFocus}: {hasAudioFocus: boolean}) => {
        if (!hasAudioFocus) {
            setHasPaused(true);
        }
    }, []);

    const stopPropagation = useCallback((e: GestureResponderEvent) => {
        e.stopPropagation();
    }, []);

    if (hasError) {
        return (
            <FormattedText
                id={'audio.loading_error'}
                defaultMessage={'Error loading audio.'}
            />
        );
    }

    return (
        <TouchableWithoutFeedback
            onPress={stopPropagation}
        >
            <View style={style.audioFileWrapper}>
                <TouchableOpacity
                    style={style.playButton}
                    onPress={onPlayPress}
                >
                    <CompassIcon
                        name={hasPaused ? 'play' : 'pause'}
                        size={24}
                        style={style.playIcon}
                    />
                </TouchableOpacity>

                {(Platform.OS !== 'android' || androidLocalUri) &&
                <Video
                    ref={videoRef}
                    source={source}
                    paused={hasPaused}
                    onLoad={onLoad}
                    onProgress={onProgress}
                    onError={onError}
                    onEnd={onEnd}
                    onAudioFocusChanged={onAudioFocusChanged}
                />
                }

                <View style={style.progressBar}>
                    <ProgressBar
                        progress={progress}
                        color={theme.buttonBg}
                        withCursor={true}
                        onSeek={onSeek}
                    />
                </View>

                <Text style={style.timerText}>{timeInMinutes}</Text>

                {!enableSecureFilePreview &&
                <TouchableOpacity
                    onPress={onDownloadPress}
                >
                    <CompassIcon
                        name='download-outline'
                        size={24}
                        style={style.downloadIcon}
                    />
                </TouchableOpacity>
                }
            </View>
        </TouchableWithoutFeedback>
    );
};

export default AudioFile;
