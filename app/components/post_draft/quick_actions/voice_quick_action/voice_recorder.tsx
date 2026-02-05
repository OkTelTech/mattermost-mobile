// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform, View, Text} from 'react-native';
import {cacheDirectory, documentDirectory} from 'expo-file-system';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useTheme} from '@context/theme';
import {dismissBottomSheet} from '@screens/navigation';
import {extractFileInfo} from '@utils/file';
import {logError} from '@utils/log';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {PastedFile} from '@mattermost/react-native-paste-input';

const MAX_RECORDING_DURATION_MS = 5 * 60 * 1000; // 5 minutes

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        padding: 24,
        alignItems: 'center' as const,
        gap: 24,
    },
    timerText: {
        color: theme.centerChannelColor,
        ...typography('Heading', 600),
    },
    recordingIndicator: {
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        gap: 8,
    },
    redDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#D24B4E',
    },
    recordingText: {
        color: changeOpacity(theme.centerChannelColor, 0.64),
        ...typography('Body', 200),
    },
    buttonsRow: {
        flexDirection: 'row' as const,
        gap: 32,
        alignItems: 'center' as const,
    },
    cancelButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    sendButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.buttonBg,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
}));

type Props = {
    onUploadFiles: (files: ExtractedFileInfo[]) => void;
}

// Lazy-load native module to avoid crashing the import chain
let recorderInstance: any = null;
let audioSetConfig: any = null;

async function getRecorder() {
    if (!recorderInstance) {
        const module = await import('react-native-audio-recorder-player');
        const AudioRecorderPlayer = module.default;
        recorderInstance = new AudioRecorderPlayer();
        audioSetConfig = {
            AudioEncoderAndroid: module.AudioEncoderAndroidType.AAC,
            AudioSourceAndroid: module.AudioSourceAndroidType.MIC,
            OutputFormatAndroid: module.OutputFormatAndroidType.MPEG_4,
            AVEncoderAudioQualityKeyIOS: module.AVEncoderAudioQualityIOSType.high,
            AVFormatIDKeyIOS: module.AVEncodingOption.aac,
            AVNumberOfChannelsKeyIOS: 1,
            AVSampleRateKeyIOS: 44100,
        };
    }
    return {recorder: recorderInstance, audioSet: audioSetConfig};
}

export default function VoiceRecorder({onUploadFiles}: Props) {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState('0:00');
    const recordingPathRef = useRef<string | undefined>();
    const recordingStarted = useRef(false);
    const maxDurationTimer = useRef<ReturnType<typeof setTimeout>>();

    const formatTime = useCallback((ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    const cleanup = useCallback(async () => {
        if (maxDurationTimer.current) {
            clearTimeout(maxDurationTimer.current);
        }
        try {
            const {recorder} = await getRecorder();
            recorder.removeRecordBackListener();
        } catch {
            // ignore cleanup errors
        }
        recordingStarted.current = false;
    }, []);

    const handleStop = useCallback(async () => {
        try {
            const {recorder} = await getRecorder();
            const result = await recorder.stopRecorder();
            await cleanup();
            setIsRecording(false);

            const filePath = result || recordingPathRef.current;
            if (!filePath) {
                return;
            }

            const uri = filePath.startsWith('file://') ? filePath : `file://${filePath}`;
            const fileName = filePath.split('/').pop() || `voice_message_${Date.now()}.m4a`;

            const voiceFile: PastedFile = {
                uri,
                fileName,
                type: 'audio/mp4',
                fileSize: 0,
            };
            const fileInfo = await extractFileInfo([voiceFile]);

            if (fileInfo.length > 0) {
                dismissBottomSheet();
                onUploadFiles(fileInfo);
            }
        } catch (error) {
            logError('[VoiceRecorder.handleStop]', error);
        }
    }, [cleanup, onUploadFiles]);

    const handleCancel = useCallback(async () => {
        try {
            if (recordingStarted.current) {
                const {recorder} = await getRecorder();
                await recorder.stopRecorder();
                await cleanup();
            }
            setIsRecording(false);
            dismissBottomSheet();
        } catch (error) {
            logError('[VoiceRecorder.handleCancel]', error);
            dismissBottomSheet();
        }
    }, [cleanup]);

    const startRecording = useCallback(async () => {
        try {
            const {recorder, audioSet} = await getRecorder();
            const fileName = `voice_message_${Date.now()}.m4a`;
            const androidDir = cacheDirectory || documentDirectory || '';
            const path = Platform.select({
                ios: fileName,
                android: `${androidDir}${fileName}`,
            });

            const result = await recorder.startRecorder(path, audioSet);
            recordingPathRef.current = result;
            setIsRecording(true);
            recordingStarted.current = true;

            recorder.addRecordBackListener((e: {currentPosition: number}) => {
                setRecordingTime(formatTime(e.currentPosition));
            });

            // Auto-stop after max duration
            maxDurationTimer.current = setTimeout(() => {
                if (recordingStarted.current) {
                    handleStop();
                }
            }, MAX_RECORDING_DURATION_MS);
        } catch (error) {
            logError('[VoiceRecorder.startRecording]', error);
            Alert.alert(
                intl.formatMessage({id: 'mobile.voice_message.error_title', defaultMessage: 'Recording Error'}),
                intl.formatMessage({id: 'mobile.voice_message.error_start', defaultMessage: 'Failed to start recording. Please try again.'}),
            );
        }
    }, [formatTime, intl, handleStop]);

    // Start recording immediately when component mounts
    useEffect(() => {
        startRecording();

        return () => {
            if (recordingStarted.current) {
                getRecorder().then(({recorder}) => {
                    recorder.stopRecorder().catch(() => {});
                }).catch(() => {});
                cleanup();
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps -- only run on mount

    return (
        <View style={style.container}>
            <Text style={style.timerText}>{recordingTime}</Text>
            {isRecording && (
                <View style={style.recordingIndicator}>
                    <View style={style.redDot}/>
                    <Text style={style.recordingText}>
                        {intl.formatMessage({id: 'mobile.voice_message.recording', defaultMessage: 'Recording...'})}
                    </Text>
                </View>
            )}
            <View style={style.buttonsRow}>
                <TouchableWithFeedback
                    onPress={handleCancel}
                    style={style.cancelButton}
                    type='opacity'
                >
                    <CompassIcon
                        name='close'
                        size={24}
                        color={changeOpacity(theme.centerChannelColor, 0.64)}
                    />
                </TouchableWithFeedback>
                <TouchableWithFeedback
                    onPress={handleStop}
                    style={style.sendButton}
                    type='opacity'
                >
                    <CompassIcon
                        name='check'
                        size={24}
                        color='#FFFFFF'
                    />
                </TouchableWithFeedback>
            </View>
        </View>
    );
}
