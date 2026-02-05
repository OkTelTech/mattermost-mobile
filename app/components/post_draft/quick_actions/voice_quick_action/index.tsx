// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform, StyleSheet} from 'react-native';
import Permissions from 'react-native-permissions';

import CompassIcon from '@components/compass_icon';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {ICON_SIZE} from '@constants/post_draft';
import {useTheme} from '@context/theme';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet} from '@screens/navigation';
import {fileMaxWarning} from '@utils/file';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity} from '@utils/theme';

import VoiceRecorder from './voice_recorder';

import type {QuickActionAttachmentProps} from '@typings/components/post_draft_quick_action';

const style = StyleSheet.create({
    icon: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 10,
    },
});

const RECORDER_HEIGHT = 180;

export default function VoiceQuickAction({
    disabled,
    onUploadFiles,
    maxFilesReached,
    maxFileCount,
    testID,
}: QuickActionAttachmentProps) {
    const intl = useIntl();
    const theme = useTheme();

    const openRecorder = useCallback(() => {
        if (maxFilesReached) {
            Alert.alert(
                intl.formatMessage({
                    id: 'mobile.link.error.title',
                    defaultMessage: 'Error',
                }),
                fileMaxWarning(intl, maxFileCount),
            );
            return;
        }

        bottomSheet({
            title: intl.formatMessage({id: 'mobile.voice_message.title', defaultMessage: 'Voice message'}),
            renderContent: () => (
                <VoiceRecorder onUploadFiles={onUploadFiles}/>
            ),
            snapPoints: [1, bottomSheetSnapPoint(1, RECORDER_HEIGHT) + TITLE_HEIGHT],
            theme,
            closeButtonId: 'voice-recorder-close-id',
        });
    }, [intl, theme, onUploadFiles, maxFilesReached, maxFileCount]);

    const handlePress = useCallback(async () => {
        const micPermission = Platform.select({
            ios: Permissions.PERMISSIONS.IOS.MICROPHONE,
            default: Permissions.PERMISSIONS.ANDROID.RECORD_AUDIO,
        });

        const status = await Permissions.check(micPermission);

        switch (status) {
            case Permissions.RESULTS.DENIED: {
                const result = await Permissions.request(micPermission);
                if (result === Permissions.RESULTS.GRANTED) {
                    openRecorder();
                }
                break;
            }
            case Permissions.RESULTS.BLOCKED: {
                Alert.alert(
                    intl.formatMessage({
                        id: 'mobile.voice_message.permission_denied_title',
                        defaultMessage: 'Microphone access required',
                    }),
                    intl.formatMessage({
                        id: 'mobile.voice_message.permission_denied_description',
                        defaultMessage: 'To send voice messages, allow microphone access in Settings.',
                    }),
                    [
                        {
                            text: intl.formatMessage({
                                id: 'mobile.permission_denied_retry',
                                defaultMessage: 'Settings',
                            }),
                            onPress: () => Permissions.openSettings(),
                        },
                        {
                            text: intl.formatMessage({
                                id: 'mobile.permission_denied_dismiss',
                                defaultMessage: "Don't Allow",
                            }),
                        },
                    ],
                );
                break;
            }
            default:
                openRecorder();
                break;
        }
    }, [intl, openRecorder]);

    const actionTestID = disabled ? `${testID}.disabled` : testID;
    const color = disabled ? changeOpacity(theme.centerChannelColor, 0.16) : changeOpacity(theme.centerChannelColor, 0.64);

    return (
        <TouchableWithFeedback
            testID={actionTestID}
            disabled={disabled}
            onPress={handlePress}
            style={style.icon}
            type='opacity'
        >
            <CompassIcon
                color={color}
                name='microphone'
                size={ICON_SIZE}
            />
        </TouchableWithFeedback>
    );
}
