// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useIntl} from 'react-intl';
import {Image, Platform, StatusBar, Text, View} from 'react-native';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Navigation} from 'react-native-navigation';

import FormattedText from '@components/formatted_text';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import useNavButtonPressed from '@hooks/navigation_button_pressed';
import NetworkManager from '@managers/network_manager';
import SecurityManager from '@managers/security_manager';
import {dismissModal, popTopScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import Form from './form';
import LinkSent from './link_sent';

import type {LaunchProps} from '@typings/launch';
import type {AvailableScreens} from '@typings/screens/navigation';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const backgroundLogin = require('@assets/images/background_login.png');

// eslint-disable-next-line @typescript-eslint/no-var-requires
const oktelLogo = require('@assets/images/logo_oktel.png');

export interface LoginOptionsProps extends LaunchProps {
    closeButtonId?: string;
    componentId: AvailableScreens;
    config: ClientConfig;
    hasLoginForm: boolean;
    license: ClientLicense;
    serverDisplayName: string;
    serverUrl: string;
    ssoOptions: SsoWithOptions;
    theme: Theme;
}

const getStyles = makeStyleSheetFromTheme((theme: Theme) => ({
    flex: {
        flex: 1,
    },
    outerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    topSection: {
        paddingTop: Platform.select({ios: 60, android: 40}),
        paddingBottom: 40,
        alignItems: 'center' as const,
        justifyContent: 'center' as const,
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
    logo: {
        width: 200,
        height: 80,
        marginBottom: 24,
    },
    title: {
        color: '#FFFFFF',
        marginBottom: 8,
        ...typography('Heading', 700, 'SemiBold'),
    },
    subtitle: {
        color: 'rgba(255,255,255,0.7)',
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
    centered: {
        width: '100%',
        maxWidth: 600,
    },
    topSectionTablet: {
        paddingTop: 100,
        paddingBottom: 60,
    },
    logoTablet: {
        width: 280,
        height: 110,
        marginBottom: 32,
    },
    whiteCardTablet: {
        maxWidth: 500,
        alignSelf: 'center' as const,
        marginHorizontal: 0,
    },
    linkSentContainer: {
        flex: 1,
        justifyContent: 'center' as const,
        paddingHorizontal: 24,
        backgroundColor: '#000000',
    },
    linkSentTitle: {
        ...typography('Heading', 1000, 'SemiBold'),
        color: '#FFFFFF',
    },
    linkSentDescription: {
        ...typography('Body', 200, 'Regular'),
        color: 'rgba(255,255,255,0.72)',
    },
}));

const LoginOptions = ({
    closeButtonId, componentId, config, extra,
    hasLoginForm, launchType, launchError, license,
    serverDisplayName, serverUrl, theme,
}: LoginOptionsProps) => {
    const styles = getStyles(theme);
    const isTablet = useIsTablet();
    const keyboardAwareRef = useRef<KeyboardAwareScrollView>(null);
    const intl = useIntl();

    const [magicLinkSent, setMagicLinkSent] = useState(false);

    const dismiss = () => {
        dismissModal({componentId});
    };

    const pop = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useEffect(() => {
        const navigationEvents = Navigation.events().registerNavigationButtonPressedListener(({buttonId}) => {
            if (closeButtonId && buttonId === closeButtonId) {
                NetworkManager.invalidateClient(serverUrl);
                dismissModal({componentId});
            }
        });

        return () => navigationEvents.remove();
    }, [closeButtonId, componentId, serverUrl]);

    useNavButtonPressed(closeButtonId || '', componentId, dismiss, []);
    useAndroidHardwareBackHandler(componentId, pop);

    if (magicLinkSent) {
        return (
            <View style={styles.linkSentContainer}>
                <LinkSent/>
                <Text style={styles.linkSentTitle}>
                    {intl.formatMessage({id: 'login.magic_link.link.sent.title', defaultMessage: 'We sent you a link to login'})}
                </Text>
                <Text style={styles.linkSentDescription}>
                    {intl.formatMessage({id: 'login.magic_link.link.sent.description', defaultMessage: 'Please check your email for the link to login. Your link will expire in 5 minutes.'})}
                </Text>
            </View>
        );
    }

    return (
        <View
            style={styles.outerContainer}
            testID='login.screen'
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
                        defaultMessage='Log in to your account'
                        id='mobile.login_options.heading'
                        testID='login_options.title.login_to_account'
                        style={styles.title}
                    />
                    <FormattedText
                        defaultMessage='Collaborate with your team in real-time'
                        id='mobile.login_options.subtitle'
                        testID='login_options.subtitle'
                        style={styles.subtitle}
                    />
                </View>

                {/* White card with form */}
                <View style={[styles.whiteCard, isTablet && styles.whiteCardTablet]}>
                    {hasLoginForm &&
                    <Form
                        config={config}
                        extra={extra}
                        keyboardAwareRef={keyboardAwareRef}
                        license={license}
                        launchError={launchError}
                        launchType={launchType}
                        theme={theme}
                        serverDisplayName={serverDisplayName}
                        serverUrl={serverUrl}
                        setMagicLinkSent={setMagicLinkSent}
                    />
                    }
                    {!hasLoginForm &&
                    <FormattedText
                        style={styles.subtitle}
                        id='mobile.login_options.none'
                        testID='login_options.description.none'
                        defaultMessage="You can't log in to your account yet. At least one login option must be configured. Contact your System Admin for assistance."
                    />
                    }
                </View>
            </KeyboardAwareScrollView>
        </View>
    );
};

export default LoginOptions;
