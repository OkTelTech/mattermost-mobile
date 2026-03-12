// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {withServerUrl} from '@context/server';
import {observeCurrentUser} from '@queries/servers/user';
import EphemeralStore from '@store/ephemeral_store';
import {isSystemAdmin} from '@utils/user';

import TeamSidebar from './team_sidebar';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({serverUrl, database}: {serverUrl: string} & WithDatabaseArgs) => {
    return {
        canJoinOtherTeams: EphemeralStore.observeCanJoinOtherTeams(serverUrl),
        canCreateTeam: observeCurrentUser(database).pipe(
            map((user) => isSystemAdmin(user?.roles || '')),
            distinctUntilChanged(),
        ),
    };
});

export default withServerUrl(withDatabase(enhanced(TeamSidebar)));
