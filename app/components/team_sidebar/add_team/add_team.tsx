// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View} from 'react-native';

import CompassIcon from '@components/compass_icon';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {Screens} from '@constants';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {TITLE_HEIGHT} from '@screens/bottom_sheet/content';
import {bottomSheet, dismissBottomSheet, showModal} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    canCreateTeam: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flex: 0,
            backgroundColor: changeOpacity(theme.sidebarText, 0.08),
            borderRadius: 10,
            height: 48,
            width: 48,
            marginTop: 6,
            marginBottom: 12,
            marginHorizontal: 12,
            overflow: 'hidden',
        },
        touchable: {
            width: '100%',
            height: '100%',
            alignItems: 'center',
            justifyContent: 'center',
        },
    };
});

export default function AddTeam({canCreateTeam}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const intl = useIntl();

    const openJoinTeam = useCallback(() => {
        const title = intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'});
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const closeButtonId = 'close-join-team';
        const options = {
            topBar: {
                leftButtons: [{
                    id: closeButtonId,
                    icon: closeButton,
                    testID: 'close.join_team.button',
                }],
            },
        };
        showModal(Screens.JOIN_TEAM, title, {closeButtonId}, options);
    }, [intl, theme.sidebarHeaderTextColor]);

    const openCreateTeam = useCallback(() => {
        const title = intl.formatMessage({id: 'mobile.create_team.title', defaultMessage: 'Create a Team'});
        const closeButton = CompassIcon.getImageSourceSync('close', 24, theme.sidebarHeaderTextColor);
        const closeButtonId = 'close-create-team';
        const options = {
            topBar: {
                leftButtons: [{
                    id: closeButtonId,
                    icon: closeButton,
                    testID: 'close.create_team.button',
                }],
            },
        };
        showModal(Screens.CREATE_TEAM, title, {closeButtonId}, options);
    }, [intl, theme.sidebarHeaderTextColor]);

    const renderContent = useCallback(() => {
        return (
            <>
                <SlideUpPanelItem
                    leftIcon='account-multiple-plus-outline'
                    onPress={() => {
                        dismissBottomSheet();
                        openJoinTeam();
                    }}
                    testID='team_sidebar.add_team.join_team.option'
                    text={intl.formatMessage({id: 'mobile.add_team.join_team', defaultMessage: 'Join Another Team'})}
                />
                <SlideUpPanelItem
                    leftIcon='plus'
                    onPress={() => {
                        dismissBottomSheet();
                        openCreateTeam();
                    }}
                    testID='team_sidebar.add_team.create_team.option'
                    text={intl.formatMessage({id: 'mobile.create_team.title', defaultMessage: 'Create a Team'})}
                />
            </>
        );
    }, [intl, openJoinTeam, openCreateTeam]);

    const onPress = usePreventDoubleTap(useCallback(() => {
        if (!canCreateTeam) {
            openJoinTeam();
            return;
        }

        bottomSheet({
            title: intl.formatMessage({id: 'mobile.add_team.title', defaultMessage: 'Add a Team'}),
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(2, ITEM_HEIGHT) + TITLE_HEIGHT],
            theme,
            closeButtonId: 'close-add-team-bottom-sheet',
        });
    }, [canCreateTeam, intl, theme, openJoinTeam, renderContent]));

    return (
        <View style={styles.container}>
            <TouchableWithFeedback
                onPress={onPress}
                type='opacity'
                style={styles.touchable}
                testID='team_sidebar.add_team.button'
            >
                <CompassIcon
                    size={28}
                    name='plus'
                    color={changeOpacity(theme.sidebarText, 0.64)}
                />
            </TouchableWithFeedback>
        </View>
    );
}
