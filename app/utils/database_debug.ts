// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Database Debug Utilities
 * Use these functions in development to inspect WatermelonDB data
 */

import DatabaseManager from '@database/manager';

/**
 * Log all tables and their record counts
 */
export const logDatabaseStats = async (serverUrl?: string) => {
    if (!__DEV__) {
        return;
    }

    // eslint-disable-next-line no-console
    console.log('\n📊 DATABASE STATS');
    // eslint-disable-next-line no-console
    console.log('═'.repeat(50));

    // App Database
    const appDb = DatabaseManager.appDatabase?.database;
    if (appDb) {
        // eslint-disable-next-line no-console
        console.log('\n🗄️  APP DATABASE:');
        const appTables = ['Info', 'Global', 'Servers'];
        for (const table of appTables) {
            try {
                const count = await appDb.get(table.toLowerCase()).query().fetchCount();
                // eslint-disable-next-line no-console
                console.log(`   ${table}: ${count} records`);
            } catch {
                // Table doesn't exist
            }
        }
    }

    // Server Database
    if (serverUrl) {
        try {
            const serverDb = DatabaseManager.serverDatabases[serverUrl]?.database;
            if (serverDb) {
                // eslint-disable-next-line no-console
                console.log(`\n🗄️  SERVER DATABASE (${serverUrl}):`);
                const serverTables = [
                    'User', 'Channel', 'Post', 'Team', 'Thread',
                    'Category', 'Draft', 'File', 'Reaction', 'Preference',
                    'MyChannel', 'MyTeam', 'CustomEmoji',
                ];
                for (const table of serverTables) {
                    try {
                        const count = await serverDb.get(table.toLowerCase()).query().fetchCount();
                        // eslint-disable-next-line no-console
                        console.log(`   ${table}: ${count} records`);
                    } catch {
                        // Table doesn't exist
                    }
                }
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.log('   Error accessing server database:', e);
        }
    }

    // eslint-disable-next-line no-console
    console.log('\n' + '═'.repeat(50));
};

/**
 * Log all records from a specific table
 */
export const logTableData = async (serverUrl: string, tableName: string, limit = 10) => {
    if (!__DEV__) {
        return;
    }

    try {
        const serverDb = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (!serverDb) {
            // eslint-disable-next-line no-console
            console.log('❌ Server database not found');
            return;
        }

        const records = await serverDb.get(tableName.toLowerCase()).query().fetch();
        const limitedRecords = records.slice(0, limit);

        // eslint-disable-next-line no-console
        console.log(`\n📋 TABLE: ${tableName} (showing ${limitedRecords.length}/${records.length})`);
        // eslint-disable-next-line no-console
        console.log('─'.repeat(50));

        limitedRecords.forEach((record, index) => {
            // eslint-disable-next-line no-console
            console.log(`\n[${index + 1}] ID: ${record.id}`);
            // eslint-disable-next-line no-console
            console.log(JSON.stringify(record._raw, null, 2));
        });
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`❌ Error reading ${tableName}:`, e);
    }
};

/**
 * Log current user info
 */
export const logCurrentUser = async (serverUrl: string) => {
    if (!__DEV__) {
        return;
    }

    try {
        const serverDb = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (!serverDb) {
            return;
        }

        // Get current user ID from system table
        const systems = await serverDb.get('system').query().fetch();
        const currentUserSystem = systems.find((s: any) => s._raw.id === 'currentUserId');
        const currentUserId = currentUserSystem?._raw?.value;

        if (currentUserId) {
            const user = await serverDb.get('user').find(currentUserId);
            // eslint-disable-next-line no-console
            console.log('\n👤 CURRENT USER:');
            // eslint-disable-next-line no-console
            console.log(JSON.stringify(user._raw, null, 2));
        }
    } catch (e) {
        // eslint-disable-next-line no-console
        console.log('❌ Error getting current user:', e);
    }
};

/**
 * Log all channels
 */
export const logChannels = async (serverUrl: string, limit = 20) => {
    await logTableData(serverUrl, 'channel', limit);
};

/**
 * Log recent posts
 */
export const logPosts = async (serverUrl: string, limit = 10) => {
    await logTableData(serverUrl, 'post', limit);
};

/**
 * Log all drafts
 */
export const logDrafts = async (serverUrl: string) => {
    await logTableData(serverUrl, 'draft', 50);
};

// Make functions available globally in dev mode
if (__DEV__) {
    (global as any).dbDebug = {
        stats: logDatabaseStats,
        table: logTableData,
        user: logCurrentUser,
        channels: logChannels,
        posts: logPosts,
        drafts: logDrafts,
    };
}
