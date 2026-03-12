# Development Rules — Mattermost Mobile

> **MANDATORY**: Read this file before implementing any new feature, UI change, or bug fix.

---

## 1. BEFORE STARTING ANY FEATURE

### 1.1 Impact Analysis Checklist
Before writing a single line of code, answer these questions:

- [ ] Which **database tables** does this feature read or write? Are other features using the same tables?
- [ ] Which **API endpoints** does this feature call? Do other features rely on responses from the same endpoints?
- [ ] Which **WebSocket events** are affected? Will handling a new event break existing event handlers?
- [ ] Which **screens/components** will be modified? What else renders in those components?
- [ ] Does this feature affect **navigation flow**? Will adding a screen break existing deep links or back-navigation?
- [ ] Does this feature touch **shared utilities** (`app/utils/`, `app/helpers/`)? Who else calls those functions?
- [ ] Does this feature require **new permissions**? Are those permissions available on the minimum supported server version?

### 1.2 Search Before Building
Always search the codebase first:
```bash
# Find existing implementations before creating new ones
grep -r "featureName" app/ --include="*.ts" --include="*.tsx"
```
- Check `app/constants/` for existing constants before defining new ones
- Check `app/queries/servers/` for existing queries before writing new ones
- Check `app/utils/` for existing helpers before writing new ones
- Check `app/components/` for reusable components before building new ones

---

## 2. UI & STYLING RULES

### 2.1 Always Use Theme — Never Hardcode Colors
```typescript
// ❌ WRONG
backgroundColor: '#ffffff'
color: '#3f4350'

// ✅ CORRECT
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {backgroundColor: theme.centerChannelBg},
    text: {color: changeOpacity(theme.centerChannelColor, 0.72)},
}));
```

### 2.2 Available Theme Tokens
| Token | Use For |
|-------|---------|
| `theme.centerChannelBg` | Main content background |
| `theme.centerChannelColor` | Main content text |
| `theme.sidebarBg` | Sidebar background |
| `theme.sidebarText` | Sidebar text/icons |
| `theme.sidebarHeaderBg` | Sidebar header background |
| `theme.sidebarHeaderTextColor` | Sidebar header text |
| `theme.buttonBg` | Primary button background |
| `theme.buttonColor` | Primary button text |
| `theme.errorTextColor` | Error messages |
| `theme.linkColor` | Links |
| `theme.mentionBg` | Mention highlight background |
| `theme.mentionColor` | Mention highlight text |
| `theme.newMessageSeparator` | Unread separator line |
| `theme.onlineIndicator` | Online status dot |
| `theme.awayIndicator` | Away status dot |
| `theme.dndIndicator` | DnD status dot |

Use `changeOpacity(theme.token, 0.0–1.0)` to apply transparency.

### 2.3 StyleSheet Rules
- Use `makeStyleSheetFromTheme` — it memoizes styles per theme (no re-computation on re-render)
- Place `getStyleSheet` at the **top of the file**, after imports, before interfaces and components
- Do **NOT** wrap the return value in `StyleSheet.create()` — `makeStyleSheetFromTheme` handles this
- Never create inline style objects inside JSX: `style={{color: theme.x}}` — define them in the stylesheet
- Use `Platform.select({ios: ..., android: ...})` for platform differences, not ternaries

### 2.4 Existing UI Components — Use These First
| Need | Use |
|------|-----|
| Loading spinner | `<Loading>` from `@components/loading` |
| Button | `<Button>` — not `<TouchableOpacity>` directly |
| Safe tap | `usePreventDoubleTap` hook on all press handlers |
| Server URL | `useServerUrl()` hook — never pass as prop |
| Open URL | `tryOpenURL()` from `@utils/url` — not `Linking.openURL()` |
| Parse URL | `getUrlDomain()` with `urlParse` — not `new URL()` |
| JSON parse | `safeParseJSON()` from utils — not bare `JSON.parse()` |
| Animations | `react-native-reanimated` — not React Native's `Animated` API |

### 2.5 Bubble / Chat Message Styling (Custom)
The app uses a Telegram-style bubble layout:
- **Own messages**: white bg (`centerChannelBg`), border `changeOpacity(centerChannelColor, 0.16)`, right-aligned, `borderBottomRightRadius: 4`
- **Other messages**: `changeOpacity(centerChannelColor, 0.08)` bg, left-aligned, `borderBottomLeftRadius: 4`
- **Media-only posts** (images, files, voice): no bubble — positioning only (`maxWidth: '85%'`, `alignSelf`)
- `overflow: 'hidden'` required on bubble views to clip child content to rounded corners
- Do **not** apply bubble styling inside child components — bubble is applied in `Body` (`app/components/post_list/post/body/index.tsx`)

---

## 3. COMPONENT ARCHITECTURE RULES

### 3.1 HOC Pattern (index.ts + component.tsx)
Every component that needs database data **must** follow the two-file pattern:

**`index.ts`** — data layer only:
```typescript
import {withDatabase, withObservables} from '@nozbe/watermelondb/react';
import {observeSomething} from '@queries/servers/something';

const enhanced = withObservables(['prop'], ({database, prop}) => ({
    data: observeSomething(database, prop.id),
}));

export default withDatabase(enhanced(MyComponent));
```

**`component.tsx`** — pure UI, receives resolved values as props:
```typescript
type Props = {
    data: SomeModel;
    // other resolved props
};

export default function MyComponent({data}: Props) {
    // UI only — no database calls here
}
```

### 3.2 Data Fetching Rules
| What | Where |
|------|-------|
| Reactive UI data | `observe*()` in `index.ts` HOC |
| One-time async data | `get*()` inside `useEffect` |
| Write to DB only | `app/actions/local/` |
| Fetch from API + write to DB | `app/actions/remote/` |
| Never | Call `database.get()` directly inside a component |

### 3.3 Observable / RxJS Rules
- Use `distinctUntilChanged()` on all observables to prevent unnecessary re-renders
- Use `switchMap` when chaining observables (auto-cancels previous subscription)
- Use `combineLatest` when combining multiple observables
- Use `of$` (aliased `of` from rxjs) to wrap static values in observables

---

## 4. NAVIGATION RULES

### 4.1 Adding a New Screen
1. Add the screen name constant to `app/constants/screens.ts`
2. Register the screen component in `app/screens/index.tsx` (lazy case in switch)
3. Wrap with HOCs: `withGestures(withSafeAreaInsets(withManagedConfig(screen)))`
4. If server-data needed: also wrap with `withServerDatabase`
5. Remove from `NOT_READY` array only when the screen is fully implemented

### 4.2 Navigation Functions
```typescript
import {goToScreen, showModal, showOverlay, dismissModal, popTopScreen} from '@screens/navigation';

// Push screen onto stack
goToScreen(Screens.MY_SCREEN, 'Title', {propA: value});

// Show as modal
showModal(Screens.MY_SCREEN, 'Title', {propA: value}, options);

// Dismiss current modal
dismissModal({componentId});

// Go back in stack
popTopScreen(componentId);
```

### 4.3 Deep Links
If a new screen can be reached via deep link, register the route in `app/utils/deep_link/`.
Never use custom URL schemes (`myscheme://`) without adding a handler there.

---

## 5. DATABASE RULES

### 5.1 Query Naming Convention
```typescript
query*()    // Returns WatermelonDB Query — lazy, not yet executed
observe*()  // Returns RxJS Observable — live updates
get*()      // Returns Promise — immediate one-time fetch
prepare*()  // Returns prepared records for batch operations
```

### 5.2 Write Operations
- **Never** write to the database directly from a component
- Always write through `app/actions/local/` functions
- Batch multiple writes: `operator.batchRecords(models, 'operationName')`
- Always wrap writes in `database.write(async () => {...})`

### 5.3 App vs Server Database
```typescript
// App database (server list, app state)
const {database} = DatabaseManager.getAppDatabaseAndOperator();

// Server database (channels, posts, users)
const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
```
Never mix data from the two databases.

### 5.4 Protecting Existing Data
- When adding new columns to existing tables: provide a **default value** — never assume non-null
- When modifying queries used by other features: search all usages with `grep` before changing
- When adding new WatermelonDB models: add migration in `app/database/migration/`

---

## 6. API / NETWORK RULES

### 6.1 Adding a New API Call
1. Define method signature in the interface: `app/client/rest/[domain].ts`
2. Implement as a mixin method using `this.doFetch()`
3. Create remote action in `app/actions/remote/[domain].ts`
4. Never call `client.doFetch()` directly from action files — use the typed method

```typescript
// ✅ In app/client/rest/teams.ts
export interface ClientTeamsMix {
    createTeam: (team: Team) => Promise<Team>;
}
// implementation inside the class mixin...

// ✅ In app/actions/remote/team.ts
export async function createTeam(serverUrl: string, team: Partial<Team>) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const data = await client.createTeam(team);
        // persist to DB via operator
        return {data};
    } catch (error) {
        logDebug('[createTeam]', error);
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}
```

### 6.2 Error Handling Pattern
All remote actions must:
- Wrap in `try/catch`
- Call `forceLogoutIfNecessary(serverUrl, error)` on error
- Return `{error}` on failure, `{data}` on success
- Log with `logDebug('[FunctionName]', error)` — never `console.log`

---

## 7. WEBSOCKET EVENT RULES

### 7.1 Adding a New WebSocket Event Handler
1. Add event constant to `app/constants/websocket.ts`
2. Add handler function in `app/actions/websocket/[domain].ts`
3. Register handler in `app/actions/websocket/index.ts`
4. Check for duplicate events before processing (WebSocket can deliver duplicates)
5. Use `EphemeralStore` to track in-flight WebSocket operations

### 7.2 Don't Break Existing Event Handlers
- Never modify the event dispatcher in `app/actions/websocket/index.ts` without checking all registered handlers
- If an event payload format changes server-side, handle both old and new format

---

## 8. STATE MANAGEMENT RULES

### 8.1 WatermelonDB vs EphemeralStore
| Data Type | Use |
|-----------|-----|
| User data, channels, posts, preferences | WatermelonDB (persisted) |
| Loading states, in-flight operations | EphemeralStore |
| WebSocket in-progress tracking | EphemeralStore |
| Current navigation state | NavigationStore |
| Theme cache | EphemeralStore |
| Feature flags per server | EphemeralStore or server config in DB |

### 8.2 EphemeralStore Usage
```typescript
import EphemeralStore from '@store/ephemeral_store';

// Track an in-flight operation to prevent duplicates
EphemeralStore.addJoiningChannel(channelId);
// ... do async work ...
EphemeralStore.removeJoiningChannel(channelId);
```

---

## 9. PERMISSIONS RULES

### 9.1 Always Gate Features with Permissions
```typescript
import {hasPermission} from '@utils/role';
import Permissions from '@constants/permissions';

const canCreate = hasPermission(roles, Permissions.CREATE_PUBLIC_CHANNEL);
if (!canCreate) return null; // or disable the button
```

### 9.2 Check Server Version Compatibility
```typescript
import {isMinimumServerVersion} from '@utils/helpers';
const supported = isMinimumServerVersion(config.Version, '7.0.0');
```

---

## 10. LOCALIZATION RULES

### 10.1 Required Language Files
Every new user-visible string **must be added to all 6 files** before the feature is considered complete:

| File | Language |
|------|----------|
| `assets/base/i18n/en.json` | English (base — add here first) |
| `assets/base/i18n/en_AU.json` | English (Australia) |
| `assets/base/i18n/vi.json` | Vietnamese |
| `assets/base/i18n/zh-CN.json` | Chinese Simplified |
| `assets/base/i18n/zh-TW.json` | Chinese Traditional |
| `assets/base/i18n/uk.json` | Ukrainian |

### 10.2 Key Naming Convention
Use dot-separated namespacing: `[feature].[component].[element]`

```
mobile.forward_message.title          ✅
mobile.forward_message.placeholder
mobile.create_team.name_label
mobile.create_team.error_empty_name
```

### 10.3 Code Usage Pattern
```typescript
import {useIntl} from 'react-intl';

const intl = useIntl();

const title = intl.formatMessage({
    id: 'mobile.my_feature.title',
    defaultMessage: 'My Feature Title',
});
```

The `defaultMessage` must **exactly match** the value in `en.json` (including spaces and newlines).

### 10.4 Adding Translations — Step by Step
When adding a new string `mobile.my_feature.confirm`:

1. **en.json** — write the English string (source of truth):
```json
"mobile.my_feature.confirm": "Confirm"
```

2. **en_AU.json** — English Australian (usually same as en.json unless AU spelling differs):
```json
"mobile.my_feature.confirm": "Confirm"
```

3. **vi.json** — Vietnamese translation:
```json
"mobile.my_feature.confirm": "Xác nhận"
```

4. **zh-CN.json** — Simplified Chinese:
```json
"mobile.my_feature.confirm": "确认"
```

5. **zh-TW.json** — Traditional Chinese:
```json
"mobile.my_feature.confirm": "確認"
```

6. **uk.json** — Ukrainian:
```json
"mobile.my_feature.confirm": "Підтвердити"
```

### 10.5 Rules
- Add keys in **alphabetical order** within each file
- **Never** leave a key missing from any of the 6 files — missing keys fall back to `defaultMessage` (English), which breaks non-English users
- **Never** translate debug/error log messages — only user-facing UI strings
- If unsure of a translation, use the English value as a placeholder but add a `// TODO: translate` comment in the PR description
- Do **not** modify any other language files not listed above

---

## 11. FEATURE ISOLATION CHECKLIST

Before submitting any new feature, verify:

### API Impact
- [ ] New API calls are only made when the feature is active
- [ ] Existing API calls are not changed (only new methods added)
- [ ] Error from new API does not crash existing screens

### Database Impact
- [ ] New queries do not interfere with existing observers (no table locks)
- [ ] New columns have defaults (no migration failures on upgrade)
- [ ] New models have a migration entry

### UI Impact
- [ ] Feature works correctly in **all 5 themes** (Denim, Sapphire, Quartz, Indigo, Onyx)
- [ ] Feature works on **both iOS and Android**
- [ ] Feature works on **tablet** as well as phone
- [ ] Long text / long usernames don't break the layout
- [ ] Feature respects safe area insets

### Navigation Impact
- [ ] Back button / dismiss works correctly
- [ ] Deep links still work
- [ ] Modals dismiss properly (no orphaned modals)

### Performance Impact
- [ ] No new inline style objects created on every render
- [ ] No expensive operations in render without `useMemo`
- [ ] Observables use `distinctUntilChanged()`
- [ ] List items use memoized callbacks (no inline `() => handler(id)`)

### Auth / Security Impact
- [ ] Feature is not accessible when logged out
- [ ] Feature respects role permissions
- [ ] No sensitive data logged (`logDebug` vs `logError` used appropriately)

---

## 12. FLOW STRUCTURE — NEW FEATURE TEMPLATE

Follow this order when building any new feature:

```
1. Constants       → app/constants/
2. Types           → types/api/ or types/database/
3. DB Model        → app/database/models/server/ (if new table)
4. Migration       → app/database/migration/ (if new table/column)
5. REST Client     → app/client/rest/[domain].ts (interface + mixin)
6. Remote Action   → app/actions/remote/[domain].ts (API + DB write)
7. Local Action    → app/actions/local/[domain].ts (DB write only)
8. Queries         → app/queries/servers/[domain].ts (query/observe/get)
9. WS Handler      → app/actions/websocket/[domain].ts (if WS events)
10. Component HOC  → app/components/[name]/index.ts (withObservables)
11. Component UI   → app/components/[name]/[name].tsx (pure UI)
12. Screen         → app/screens/[name]/index.tsx (if full screen)
13. Register       → app/screens/index.tsx (add to switch)
14. Navigation     → app/screens/navigation.ts (add helper if needed)
```

---

## 13. CODE QUALITY GATES

Run these before every commit:
```bash
npm run fix        # Auto-fix ESLint issues
npm run tsc        # TypeScript type check
```

The pre-commit hook runs ESLint + TypeScript automatically and will block commits on errors.

### TypeScript Rules
- No `any` types — use proper types or generics
- No non-null assertion (`!`) — use optional chaining (`?.`) instead
- Use `??` (nullish coalescing) not `||` for fallbacks
- Prefer `const` objects over enums: `export const Status = {A: 0} as const`
- Import types inline: `import {SomeValue, type SomeType} from '@module'`

### React Hooks Rules
- Always include ALL dependencies in `useEffect` / `useCallback` / `useMemo`
- If omitting a dependency intentionally, add a comment explaining why
- Never create hooks inside render functions — extract to separate component
- Stable refs and dispatch functions don't need to be in dependency arrays but must have `// eslint-disable-next-line` comments

---

## 14. LOGGING

```typescript
import {logDebug, logError} from '@utils/log';

// Always prefix with [ClassName.methodName]
logDebug('[MyFeature.fetchData]', 'Starting fetch');
logError('[MyFeature.fetchData]', error);
```

Never use `console.log`, `console.error`, or `console.warn`.

---

## 15. VERSION MANAGEMENT

Version format: `MAJOR.MINOR.PATCH(BUILD)`
- iOS: update `CFBundleShortVersionString` and `CFBundleVersion` in `ios/Mattermost/Info.plist`
- Android: update `versionName` and `versionCode` in `android/app/build.gradle`
- Keep both platforms in sync on every release bump
