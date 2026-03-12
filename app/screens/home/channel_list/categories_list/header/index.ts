// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {combineLatest, of as of$} from 'rxjs';
import {distinctUntilChanged, switchMap} from 'rxjs/operators';

import {Permissions} from '@constants';
import {observePermissionForTeam} from '@queries/servers/role';
import {observeConfigBooleanValue, observePushVerificationStatus} from '@queries/servers/system';
import {observeCurrentTeam, observeMyTeamRoles} from '@queries/servers/team';
import {observeCurrentUser} from '@queries/servers/user';
import {isSystemAdmin} from '@utils/user';

import ChannelListHeader from './header';

import type {WithDatabaseArgs} from '@typings/database/database';

const enhanced = withObservables([], ({database}: WithDatabaseArgs) => {
    const team = observeCurrentTeam(database);

    const currentUser = observeCurrentUser(database);

    const enableOpenServer = observeConfigBooleanValue(database, 'EnableOpenServer');

    const canJoinChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.JOIN_PUBLIC_CHANNELS, true)),
        distinctUntilChanged(),
    );

    const canCreatePublicChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PUBLIC_CHANNEL, true)),
    );

    const canCreatePrivateChannels = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => observePermissionForTeam(database, t, u, Permissions.CREATE_PRIVATE_CHANNEL, false)),
    );

    const canCreateChannels = combineLatest([canCreatePublicChannels, canCreatePrivateChannels]).pipe(
        switchMap(([open, priv]) => of$(open || priv)),
        distinctUntilChanged(),
    );

    const canInvitePeople = combineLatest([currentUser, team]).pipe(
        switchMap(([u, t]) => {
            if (!u || !t) {
                return of$(false);
            }
            if (isSystemAdmin(u.roles)) {
                return of$(true);
            }
            return observeMyTeamRoles(database, t.id).pipe(
                switchMap((roles) => of$(Boolean(roles && roles.includes(Permissions.TEAM_ADMIN_ROLE)))),
            );
        }),
        distinctUntilChanged(),
    );

    return {
        canCreateChannels,
        canJoinChannels,
        canInvitePeople,
        displayName: team.pipe(
            switchMap((t) => of$(t?.displayName)),
            distinctUntilChanged(),
        ),
        pushProxyStatus: observePushVerificationStatus(database),
    };
});

export default withDatabase(enhanced(ChannelListHeader));
