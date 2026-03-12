// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {ActivityIndicator, Keyboard, ScrollView, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

import {createTeam, handleTeamChange, teamNameExists} from '@actions/remote/team';
import CompassIcon from '@components/compass_icon';
import FloatingTextInput, {type FloatingTextInputRef} from '@components/floating_input/floating_text_input_label';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import {usePreventDoubleTap} from '@hooks/utils';
import {buildNavigationButton, dismissModal, setButtons} from '@screens/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {AvailableScreens} from '@typings/screens/navigation';

type Props = {
    componentId: AvailableScreens;
    closeButtonId: string;
}

const CLOSE_BUTTON_ID = 'close-create-team';
const NEXT_BUTTON_ID = 'next-create-team';
const CREATE_BUTTON_ID = 'create-team-button';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 64;
const URL_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/;

function toSlug(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.centerChannelBg,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    inputContainer: {
        marginBottom: 16,
    },
    hint: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        marginTop: 8,
        ...typography('Body', 75, 'Regular'),
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
}));

export default function CreateTeam({componentId, closeButtonId}: Props) {
    const theme = useTheme();
    const serverUrl = useServerUrl();
    const intl = useIntl();
    const {formatMessage} = intl;
    const styles = getStyleSheet(theme);

    const [step, setStep] = useState<'name' | 'url'>('name');
    const [teamName, setTeamName] = useState('');
    const [teamUrl, setTeamUrl] = useState('');
    const [nameError, setNameError] = useState('');
    const [urlError, setUrlError] = useState('');
    const [creating, setCreating] = useState(false);

    const urlInputRef = useRef<FloatingTextInputRef>(null);

    const closeId = closeButtonId || CLOSE_BUTTON_ID;

    const buildRightButton = useCallback((id: string, testID: string, text: string, enabled: boolean) => {
        const btn = buildNavigationButton(id, testID, undefined, text);
        btn.enabled = enabled;
        btn.showAsAction = 'always';
        btn.color = theme.sidebarHeaderTextColor;
        return btn;
    }, [theme.sidebarHeaderTextColor]);

    useEffect(() => {
        const icon = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const leftButton = buildNavigationButton(closeId, 'close.create_team.button', icon);
        setButtons(componentId, {
            leftButtons: [leftButton],
        });
    }, [theme.sidebarHeaderTextColor, componentId, closeId]);

    useEffect(() => {
        if (step === 'name') {
            const enabled = teamName.trim().length >= MIN_NAME_LENGTH;
            const btn = buildRightButton(NEXT_BUTTON_ID, 'create_team.next.button', formatMessage({id: 'mobile.create_team.next', defaultMessage: 'Next'}), enabled);
            setButtons(componentId, {rightButtons: [btn]});
        } else {
            const enabled = !creating && teamUrl.length >= MIN_NAME_LENGTH && URL_REGEX.test(teamUrl);
            const btn = buildRightButton(CREATE_BUTTON_ID, 'create_team.create.button', formatMessage({id: 'mobile.create_team.create', defaultMessage: 'Create Team'}), enabled);
            setButtons(componentId, {rightButtons: [btn]});
        }
    }, [step, teamName, teamUrl, creating, buildRightButton, componentId, formatMessage]);

    const handleClose = useCallback(() => {
        Keyboard.dismiss();
        dismissModal({componentId});
    }, [componentId]);

    const handleNext = useCallback(() => {
        const trimmed = teamName.trim();
        if (trimmed.length < MIN_NAME_LENGTH) {
            setNameError(formatMessage({id: 'mobile.create_team.name.error_min', defaultMessage: 'Team name must be at least 2 characters'}));
            return;
        }
        if (trimmed.length > MAX_NAME_LENGTH) {
            setNameError(formatMessage({id: 'mobile.create_team.name.error_max', defaultMessage: 'Team name must be less than 64 characters'}));
            return;
        }
        setNameError('');
        const slug = toSlug(trimmed);
        setTeamUrl(slug);
        setStep('url');
    }, [teamName, formatMessage]);

    const handleCreate = usePreventDoubleTap(useCallback(async () => {
        const trimmedUrl = teamUrl.trim();
        if (trimmedUrl.length < MIN_NAME_LENGTH || !URL_REGEX.test(trimmedUrl)) {
            setUrlError(formatMessage({id: 'mobile.create_team.url.error_format', defaultMessage: 'Only lowercase letters, numbers and dashes allowed'}));
            return;
        }
        setUrlError('');
        Keyboard.dismiss();
        setCreating(true);

        const existsResult = await teamNameExists(serverUrl, trimmedUrl);
        if ('error' in existsResult) {
            setUrlError(formatMessage({id: 'mobile.create_team.error_generic', defaultMessage: 'Something went wrong. Please try again.'}));
            setCreating(false);
            return;
        }
        if (existsResult.exists) {
            setUrlError(formatMessage({id: 'mobile.create_team.url.error_taken', defaultMessage: 'This URL is already taken'}));
            setCreating(false);
            return;
        }

        const result = await createTeam(serverUrl, {
            display_name: teamName.trim(),
            name: trimmedUrl,
            type: 'O',
        });

        if ('error' in result || !result.data) {
            setUrlError(formatMessage({id: 'mobile.create_team.error_generic', defaultMessage: 'Something went wrong. Please try again.'}));
            setCreating(false);
            return;
        }

        await handleTeamChange(serverUrl, result.data.id);
        dismissModal({componentId});
    }, [serverUrl, teamName, teamUrl, componentId, formatMessage]));

    useNavButtonPressed(closeId, componentId, handleClose, [handleClose]);
    useNavButtonPressed(NEXT_BUTTON_ID, componentId, handleNext, [handleNext]);
    useNavButtonPressed(CREATE_BUTTON_ID, componentId, handleCreate, [handleCreate]);
    useAndroidHardwareBackHandler(componentId, handleClose);

    if (creating) {
        return (
            <SafeAreaView
                style={styles.container}
                edges={['bottom']}
            >
                <View style={styles.loadingContainer}>
                    <ActivityIndicator
                        size='large'
                        color={theme.buttonBg}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView
            style={styles.container}
            edges={['bottom']}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps='handled'
            >
                {step === 'name' && (
                    <View style={styles.inputContainer}>
                        <FloatingTextInput
                            autoFocus={true}
                            label={formatMessage({id: 'mobile.create_team.name.label', defaultMessage: 'Team Name'})}
                            placeholder={formatMessage({id: 'mobile.create_team.name.placeholder', defaultMessage: 'Enter team name'})}
                            value={teamName}
                            onChangeText={setTeamName}
                            error={nameError}
                            theme={theme}
                            testID='create_team.name.input'
                            returnKeyType='next'
                            onSubmitEditing={handleNext}
                            maxLength={MAX_NAME_LENGTH}
                        />
                    </View>
                )}
                {step === 'url' && (
                    <View style={styles.inputContainer}>
                        <FloatingTextInput
                            ref={urlInputRef}
                            autoFocus={true}
                            label={formatMessage({id: 'mobile.create_team.url.label', defaultMessage: 'Team URL'})}
                            placeholder={formatMessage({id: 'mobile.create_team.url.placeholder', defaultMessage: 'e.g. my-team'})}
                            value={teamUrl}
                            onChangeText={setTeamUrl}
                            error={urlError}
                            theme={theme}
                            testID='create_team.url.input'
                            returnKeyType='done'
                            onSubmitEditing={handleCreate}
                            maxLength={MAX_NAME_LENGTH}
                            rawInput={true}
                        />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}
