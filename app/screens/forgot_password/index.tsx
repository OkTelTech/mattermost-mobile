// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {defineMessages, useIntl} from 'react-intl';
import {Image, Keyboard, Platform, StatusBar, Text, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';

import {sendPasswordResetEmail} from '@actions/remote/session';
import Button from '@components/button';
import FloatingTextInput from '@components/floating_input/floating_text_input_label';
import FormattedText from '@components/formatted_text';
import {Screens} from '@constants';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useAvoidKeyboard, useIsTablet} from '@hooks/device';
import SecurityManager from '@managers/security_manager';
import {isEmail} from '@utils/helpers';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Inbox from './inbox';

import type {AvailableScreens} from '@typings/screens/navigation';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const backgroundLogin = require('@assets/images/background_login.png');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const oktelLogo = require('@assets/images/logo_oktel.png');

type Props = {
    componentId: AvailableScreens;
    serverUrl: string;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
    },
    outerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    backgroundImage: {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        opacity: 1,
    },
    topSection: {
        paddingTop: Platform.select({ios: 60, android: 40}),
        paddingBottom: 40,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
    },
    topSectionTablet: {
        paddingTop: 100,
        paddingBottom: 60,
    },
    logo: {
        width: 200,
        height: 80,
        marginBottom: 24,
    },
    logoTablet: {
        width: 280,
        height: 110,
        marginBottom: 32,
    },
    title: {
        color: '#FFFFFF',
        marginBottom: 8,
        ...typography('Heading', 700, 'SemiBold'),
    },
    subtitle: {
        color: 'rgba(255,255,255,0.7)',
        paddingHorizontal: 24,
        textAlign: 'center' as const,
        ...typography('Body', 200, 'Regular'),
    },
    whiteCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginHorizontal: 16,
        padding: 24,
        gap: 24,
        ...Platform.select({
            ios: {
                shadowColor: '#FFFFFF',
                shadowOffset: {width: 0, height: 0.5},
                shadowOpacity: 0.25,
                shadowRadius: 9,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    whiteCardTablet: {
        maxWidth: 500,
        alignSelf: 'center' as const,
        marginHorizontal: 0,
    },
    form: {
        gap: 24,
    },
    buttonContainer: {
        marginTop: 20,
    },
    loginButton: {
        backgroundColor: '#212121',
        borderRadius: 8,
        height: 52,
    },
    loginButtonDisabled: {
        backgroundColor: 'rgba(33, 33, 33, 0.5)',
        borderRadius: 8,
        height: 52,
    },
    loginButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontFamily: 'OpenSans-SemiBold',
    },
    successContainer: {
        alignItems: 'center' as const,
        paddingHorizontal: 24,
        justifyContent: 'center' as const,
        flex: 1,
    },
    successText: {
        color: 'rgba(255,255,255,0.75)',
        ...typography('Body', 200, 'Regular'),
        textAlign: 'center' as const,
    },
    successTitle: {
        color: '#FFFFFF',
        marginTop: 24,
        marginBottom: 12,
        ...typography('Heading', 1000),
    },
    returnButtonContainer: {
        marginTop: 32,
    },
}));

const messages = defineMessages({
    reset: {
        id: 'password_send.reset',
        defaultMessage: 'Reset Your Password',
    },
});

const ForgotPassword = ({componentId, serverUrl, theme}: Props) => {
    const [email, setEmail] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [isPasswordLinkSent, setIsPasswordLinkSent] = useState<boolean>(false);
    const {formatMessage} = useIntl();
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const styles = getStyleSheet(theme);
    const isTablet = useIsTablet();

    useEffect(() => {
        Navigation.mergeOptions(componentId, {
            topBar: {
                backButton: {
                    color: '#FFFFFF',
                },
            },
        });
    }, [componentId]);

    useAvoidKeyboard(keyboardAwareRef);

    const changeEmail = useCallback((emailAddress: string) => {
        setEmail(emailAddress);
        setError('');
    }, []);

    const onReturn = useCallback(() => {
        Navigation.popTo(Screens.LOGIN);
    }, []);

    const submitResetPassword = useCallback(async () => {
        Keyboard.dismiss();
        if (!isEmail(email)) {
            setError(
                formatMessage({
                    id: 'password_send.error',
                    defaultMessage: 'Please enter a valid email address.',
                }),
            );
            return;
        }

        const {status} = await sendPasswordResetEmail(serverUrl, email);
        if (status === 'OK') {
            setIsPasswordLinkSent(true);
            return;
        }

        setError(formatMessage({
            id: 'password_send.generic_error',
            defaultMessage: 'We were unable to send you a reset password link. Please contact your System Admin for assistance.',
        }));
    }, [email, formatMessage, serverUrl]);

    useAndroidHardwareBackHandler(componentId, onReturn);

    if (isPasswordLinkSent) {
        return (
            <View
                style={styles.outerContainer}
                testID='password_send.link.sent'
                nativeID={SecurityManager.getShieldScreenId(componentId, false, true)}
            >
                <StatusBar
                    barStyle='light-content'
                    backgroundColor='transparent'
                    translucent={true}
                />
                <Image
                    source={backgroundLogin}
                    style={styles.backgroundImage}
                    resizeMode='cover'
                />
                <View style={styles.successContainer}>
                    <Inbox theme={theme}/>
                    <FormattedText
                        style={styles.successTitle}
                        id='password_send.link.title'
                        defaultMessage='Reset Link Sent'
                    />
                    <FormattedText
                        style={styles.successText}
                        id='password_send.link'
                        defaultMessage='If the account exists, a password reset email will be sent to:'
                    />
                    <Text style={styles.successText}>
                        {email}
                    </Text>
                    <View style={styles.returnButtonContainer}>
                        <Button
                            testID='password_send.return'
                            onPress={onReturn}
                            size='lg'
                            theme={theme}
                            text={formatMessage({id: 'password_send.return', defaultMessage: 'Return to Log In'})}
                            backgroundStyle={styles.loginButton}
                            textStyle={styles.loginButtonText}
                        />
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View
            style={styles.outerContainer}
            testID='forgot.password.screen'
            nativeID={SecurityManager.getShieldScreenId(componentId, false, true)}
        >
            <StatusBar
                barStyle='light-content'
                backgroundColor='transparent'
                translucent={true}
            />
            <Image
                source={backgroundLogin}
                style={styles.backgroundImage}
                resizeMode='cover'
            />
            <KeyboardAwareScrollView
                bounces={true}
                enableAutomaticScroll={true}
                enableOnAndroid={true}
                enableResetScrollToCoords={true}
                extraScrollHeight={20}
                keyboardDismissMode='on-drag'
                keyboardShouldPersistTaps='handled'
                ref={keyboardAwareRef}
                style={styles.flex}
                contentContainerStyle={{flexGrow: 1}}
            >
                {/* Dark top section with logo */}
                <View style={[styles.topSection, isTablet && styles.topSectionTablet]}>
                    <Image
                        source={oktelLogo}
                        style={[styles.logo, isTablet && styles.logoTablet]}
                        resizeMode='contain'
                    />
                    <FormattedText
                        {...messages.reset}
                        testID='password_send.reset'
                        style={styles.title}
                    />
                    <FormattedText
                        style={styles.subtitle}
                        id='password_send.description'
                        defaultMessage='To reset your password, enter the email address you used to sign up'
                    />
                </View>

                {/* White card with form */}
                <View style={[styles.whiteCard, isTablet && styles.whiteCardTablet]}>
                    <View style={styles.form}>
                        <FloatingTextInput
                            rawInput={true}
                            blurOnSubmit={true}
                            disableFullscreenUI={true}
                            enablesReturnKeyAutomatically={true}
                            error={error}
                            keyboardType='email-address'
                            label={formatMessage({id: 'login.email', defaultMessage: 'Email'})}
                            onChangeText={changeEmail}
                            onSubmitEditing={submitResetPassword}
                            returnKeyType='next'
                            testID='forgot.password.email'
                            theme={theme}
                            value={email}
                        />
                        <View style={styles.buttonContainer}>
                            <Button
                                testID='forgot.password.button'
                                disabled={!email}
                                onPress={submitResetPassword}
                                size='lg'
                                text={formatMessage(messages.reset)}
                                theme={theme}
                                backgroundStyle={!email ? styles.loginButtonDisabled : styles.loginButton}
                                textStyle={styles.loginButtonText}
                            />
                        </View>
                    </View>
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
};

export default ForgotPassword;
