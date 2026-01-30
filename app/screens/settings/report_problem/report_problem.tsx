// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';

import SettingItem from '@components/settings/item';
import {tryOpenURL} from '@utils/url';

const ReportProblem = () => {
    const onPress = useCallback(() => {
        tryOpenURL('https://oktel.io');
    }, []);

    return (
        <SettingItem
            onPress={onPress}
            optionName='report_problem'
            separator={false}
            testID='settings.report_problem.option'
            type='link'
        />
    );
};

export default ReportProblem;
