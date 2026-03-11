// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View} from 'react-native';

import {handleTeamChange} from '@actions/remote/team';
import Badge from '@components/badge';
import TouchableWithFeedback from '@components/touchable_with_feedback';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import PerformanceMetricsManager from '@managers/performance_metrics_manager';
import {makeStyleSheetFromTheme} from '@utils/theme';

import TeamIcon from './team_icon';

import type TeamModel from '@typings/database/models/servers/team';

type Props = {
    team?: TeamModel;
    hasUnreads: boolean;
    mentionCount: number;
    unreadCount: number;
    selected: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            height: 54,
            width: 54,
            flex: 0,
            padding: 3,
            borderRadius: 10,
            marginVertical: 3,
            overflow: 'hidden',
        },
        containerSelected: {
            borderWidth: 3,
            borderRadius: 14,
            borderColor: theme.sidebarTextActiveBorder,
        },
        mentionsOneDigit: {
            top: 1,
            left: 31,
        },
        mentionsTwoDigits: {
            top: 1,
            left: 30,
        },
        mentionsThreeDigits: {
            top: 1,
            left: 28,
        },
    };
});

export default function TeamItem({team, hasUnreads, mentionCount, unreadCount, selected}: Props) {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const onPress = useCallback(() => {
        if (!team || selected) {
            return;
        }

        PerformanceMetricsManager.startMetric('mobile_team_switch');
        handleTeamChange(serverUrl, team.id);
    }, [selected, team?.id, serverUrl]);

    if (!team) {
        return null;
    }

    const badgeValue = mentionCount > 0 ? mentionCount : (hasUnreads ? unreadCount : 0);
    const hasBadge = badgeValue > 0;
    let badgeStyle = styles.mentionsOneDigit;

    switch (true) {
        case badgeValue > 99:
            badgeStyle = styles.mentionsThreeDigits;
            break;
        case badgeValue > 9:
            badgeStyle = styles.mentionsTwoDigits;
            break;
    }

    const teamItem = `team_sidebar.team_list.team_item.${team.id}`;
    const teamItemTestId = selected ? `${teamItem}.selected` : `${teamItem}.not_selected`;

    return (
        <>
            <View style={[styles.container, selected ? styles.containerSelected : undefined]}>
                <TouchableWithFeedback
                    onPress={onPress}
                    type='opacity'
                    testID={teamItemTestId}
                >
                    <TeamIcon
                        displayName={team.displayName}
                        id={team.id}
                        lastIconUpdate={team.lastTeamIconUpdatedAt}
                        selected={selected}
                        testID={`${teamItem}.team_icon`}
                    />
                </TouchableWithFeedback>
            </View>
            <Badge
                borderColor={theme.sidebarHeaderBg}
                backgroundColor={'#f74343'}
                color={'#ffffff'}
                visible={hasBadge && !selected}
                style={badgeStyle}
                value={badgeValue}
            />
        </>
    );
}
