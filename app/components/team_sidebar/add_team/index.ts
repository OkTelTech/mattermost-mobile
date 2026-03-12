// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {distinctUntilChanged, map} from 'rxjs/operators';

import {observeCurrentUser} from '@queries/servers/user';
import {isSystemAdmin} from '@utils/user';

import AddTeam from './add_team';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => ({
    canCreateTeam: observeCurrentUser(database).pipe(
        map((user) => isSystemAdmin(user?.roles || '')),
        distinctUntilChanged(),
    ),
}));

export default withDatabase(enhanced(AddTeam));
