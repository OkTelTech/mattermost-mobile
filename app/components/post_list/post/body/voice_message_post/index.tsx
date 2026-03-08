// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {View, StyleSheet} from 'react-native';

import {buildFileUrl} from '@actions/remote/file';
import AudioFile from '@components/files/audio_file';
import {useServerUrl} from '@context/server';
import {observeCanDownloadFiles, observeEnableSecureFilePreview} from '@queries/servers/security';
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';

import type {WithDatabaseArgs} from '@typings/database/database';
import type PostModel from '@typings/database/models/servers/post';

type Props = {
    post: PostModel;
    canDownloadFiles: boolean;
    enableSecureFilePreview: boolean;
}

const styles = StyleSheet.create({
    container: {
        marginTop: 5,
    },
});

const VoiceMessagePost = ({post, canDownloadFiles, enableSecureFilePreview}: Props) => {
    const serverUrl = useServerUrl();
    const fileId = post.props?.fileId as string | undefined;

    const fileInfo = useMemo((): FileInfo | null => {
        if (!fileId) {
            return null;
        }
        return {
            id: fileId,
            uri: buildFileUrl(serverUrl, fileId),
            name: 'voice_message',
            extension: 'mp3',
            mime_type: 'audio/mpeg',
            size: 0,
            user_id: post.userId,
            post_id: post.id,
            has_preview_image: false,
            height: 0,
            width: 0,
        };
    }, [fileId, serverUrl, post.userId, post.id]);

    if (!fileInfo) {
        return null;
    }

    return (
        <View style={styles.container}>
            <AudioFile
                file={fileInfo}
                canDownloadFiles={canDownloadFiles}
                enableSecureFilePreview={enableSecureFilePreview}
            />
        </View>
    );
};

type EnhanceProps = WithDatabaseArgs & {
    post: PostModel;
}

const enhance = withObservables([], ({database}: EnhanceProps) => ({
    canDownloadFiles: observeCanDownloadFiles(database),
    enableSecureFilePreview: observeEnableSecureFilePreview(database),
}));

export default withDatabase(enhance(VoiceMessagePost));
