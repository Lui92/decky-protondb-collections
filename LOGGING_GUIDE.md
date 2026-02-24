# ProtonSets Plugin - Logging Guide

## Quick Access to Logs

**On Steam Deck:**
```bash
ssh deck@steamdeck.local
tail -f /homebrew/logs/decky-protondb-collections/plugin.log
```

Logs are stored in `/homebrew/logs/decky-protondb-collections/` and automatically rotated when they reach 5MB.

## Overview

Comprehensive logging has been added to the ProtonSets plugin to provide visibility into plugin execution, data retrieval, and error handling. All logs include timestamps and contextual information.

## Logger Architecture

### Log Levels

The logger supports four log levels:
- **DEBUG**: Detailed information for debugging (lowest priority)
- **INFO**: General informational messages
- **WARN**: Warning messages and non-fatal errors
- **ERROR**: Critical errors (highest priority)

### Log Format

All logs follow this format:
```
[TIMESTAMP] LEVEL [COMPONENT] ACTION CONTEXT: MESSAGE
```

Example:
```
[2026-02-24T10:30:22.845Z] DEBUG [Collections] generation concurrency=6: Starting generation
```

## Logging Coverage

### 1. Plugin Initialization & Lifecycle

**Component: `Plugin`, `PluginEntry`, `Server`**

- Plugin constructor initialization
- Backend entry point setup
- Steam integration registration
- Plugin onLoad/onUnload events

Example logs:
```
[2026-02-24...Z] INFO [BackendEntry] onLoad: Backend onLoad called
[2026-02-24...Z] DEBUG [BackendEntry] getSteamApi: Retrieving Steam API from Decky
[2026-02-24...Z] INFO [Server] onLoad: Plugin onLoad called, registering Steam integration
```

### 2. ProtonDB Integration

**Component: `ProtonDB`**

- Badge fetches from ProtonDB API
- Cache hits and misses
- HTTP request details (URL, attempts, response codes)
- ProtonDB-specific errors

Example logs:
```
[2026-02-24...Z] DEBUG [ProtonDB] fetch appId=570240: Fetching from ProtonDB
[2026-02-24...Z] DEBUG [HTTP] response duration=245ms: HTTP response
[2026-02-24...Z] DEBUG [ProtonDB] fetch appId=570240 appId=570240 tier=platinum: ProtonDB badge retrieved: platinum
```

### 3. Steam Integration

**Component: `Steam`**

- Owned apps retrieval
- Installed apps retrieval
- Collection creation
- Library change detection and auto-sync triggers

Example logs:
```
[2026-02-24...Z] INFO [Steam] getOwnedAppIds appCount=250: Fetched owned apps from Steam: 250 apps
[2026-02-24...Z] INFO [Collections] create apps=42: Collection created: ProtonDB - Platinum
[2026-02-24...Z] INFO [Collections] libraryChanged: Library changed detected
```

### 4. TabMaster Plugin Integration

**Component: `TabMaster`**

- TabMaster plugin availability check
- Tab creation for badge tiers
- Sync success/failure tracking

Example logs:
```
[2026-02-24...Z] INFO [TabMaster] plugin: TabMaster plugin not installed, skipping sync
[2026-02-24...Z] DEBUG [TabMaster] tier apps=42: Creating TabMaster tab: ProtonDB platinum
[2026-02-24...Z] INFO [TabMaster] createTab apps=42: TabMaster tab created: ProtonDB platinum
```

### 5. Collection Management

**Component: `Collections`**

- Collection generation start/completion with duration
- Per-tier collection creation
- Collection failures and error details
- Auto-sync triggers

Example logs:
```
[2026-02-24...Z] INFO [Collections] generation concurrency=6: Starting generation
[2026-02-24...Z] INFO [Collections] generation tiers=5 duration=2341ms: Completed generation
[2026-02-24...Z] INFO [Collections] create apps=120: Collection created: ProtonDB - Gold
```

### 6. Cache Management

**Component: `Cache`**

- Cache load/save operations
- Cache eviction when size limit is reached
- Entry counts
- Cache hit/misses for badges

Example logs:
```
[2026-02-24...Z] DEBUG [Cache] load: Loading cache from proton_cache.json
[2026-02-24...Z] DEBUG [Cache] load entries=150: Cache load
[2026-02-24...Z] DEBUG [Cache] evict removed=5 remaining=2000: Cache evict
```

### 7. Settings Management

**Component: `Settings`**

- Settings load at startup
- Settings updates from frontend
- Validation and application of configuration

Example logs:
```
[2026-02-24...Z] DEBUG [Settings] load: Loading settings from settings.json
[2026-02-24...Z] DEBUG [Settings] load badges=5: Settings load
[2026-02-24...Z] INFO [Settings] badges=5: Settings updated
```

### 8. HTTP/Network Operations

**Component: `HTTP`**

- Request URL and method
- Retry attempts
- Response codes and timings
- Request failures and error messages

Example logs:
```
[2026-02-24...Z] DEBUG [HTTP] request attempt=1: HTTP GET https://www.protondb.com/api/v1/reports/summaries/570240.json
[2026-02-24...Z] DEBUG [HTTP] response duration=245ms: HTTP response: 200 OK
```

## Debugging with Logs

### Finding Issues

1. **Collection Generation Fails**: Look for logs with `component=Collections` and `action=generation`
2. **ProtonDB Connectivity**: Search for `component=ProtonDB` errors
3. **Steam Integration Issues**: Check `component=Steam` logs for errors
4. **TabMaster Sync Problems**: Look for `component=TabMaster` and `action=sync`
5. **Performance Issues**: Check duration values in INFO logs

### Accessing Logs from Steam Deck

**View recent logs (last 100 lines):**
```bash
ssh deck@steamdeck.local
tail -100 /homebrew/logs/decky-protondb-collections/plugin.log
```

**Watch logs in real-time:**
```bash
ssh deck@steamdeck.local
tail -f /homebrew/logs/decky-protondb-collections/plugin.log
```

**Search for specific errors:**
```bash
ssh deck@steamdeck.local
grep -i "error\|failed" /homebrew/logs/decky-protondb-collections/plugin.log
```

**Search for specific component:**
```bash
ssh deck@steamdeck.local
grep "ProtonDB" /homebrew/logs/decky-protondb-collections/plugin.log
grep "Collections" /homebrew/logs/decky-protondb-collections/plugin.log
grep "TabMaster" /homebrew/logs/decky-protondb-collections/plugin.log
```

**Count specific log levels:**
```bash
ssh deck@steamdeck.local
grep -c "ERROR" /homebrew/logs/decky-protondb-collections/plugin.log
grep -c "WARN" /homebrew/logs/decky-protondb-collections/plugin.log
```

**Download all logs to your computer:**
```bash
scp -r deck@steamdeck.local:/homebrew/logs/decky-protondb-collections/ ./steampeck-logs
```

### Common Log Patterns

**Successful collection generation:**
```
[...] INFO [Collections] generation: Starting generation
[...] INFO [Steam] getOwnedAppIds: Fetched owned apps
[...] INFO [Collections] create: Collection created (multiple times)
[...] INFO [Collections] generation duration=XXXX: Completed generation
```

**ProtonDB fetch with cache:**
```
[...] DEBUG [ProtonDB] fetch appId=XXXXX: Fetching from ProtonDB
[...] DEBUG [HTTP] request: HTTP GET ...
[...] DEBUG [HTTP] response: HTTP response
[...] DEBUG [ProtonDB] fetch appId=XXXXX tier=platinum: ProtonDB badge retrieved
```

**TabMaster sync:**
```
[...] INFO [TabMaster] sync: TabMaster sync started
[...] DEBUG [TabMaster] tier: Creating TabMaster tab
[...] INFO [TabMaster] createTab: TabMaster tab created (multiple times)
[...] INFO [TabMaster] sync tiers=5: Sync completed
```

## Log Output Location

### Steam Deck (Primary Location)

On Steam Deck, logs are written to:
```
/homebrew/logs/decky-protondb-collections/plugin.log
```

This is the standard location where all Decky plugins store their logs. You can access these files via:

**SSH to Steam Deck:**
```bash
ssh deck@steamdeck.local
cd /homebrew/logs/decky-protondb-collections/
cat plugin.log
# or tail for real-time logs
tail -f plugin.log
```

**Using SCP to download logs:**
```bash
scp deck@steamdeck.local:/homebrew/logs/decky-protondb-collections/plugin.log ./
```

### Log Rotation

Logs are automatically rotated when they exceed 5MB. Rotated logs are archived as:
```
/homebrew/logs/decky-protondb-collections/plugin-YYYY-MM-DDTHH-MM-SS.log
```

This ensures that the main `plugin.log` file doesn't grow too large and old logs are preserved for troubleshooting.

### Development Environment

When running in development (not on Steam Deck):
- Logs go to `DECKY_PLUGIN_DATA_PATH` if set
- Otherwise defaults to the plugin's working directory
- File output includes both console logs and file-based logs

### Console Output

In addition to file logging, all logs are output to:
- **Browser Console**: When running in SteamDeck UI (F12 to open developer tools)
- **Backend Logs**: Backend service console output
- **Jest Output**: During test execution

## Performance Insights from Logs

Monitor these metrics:
- **HTTP Request Duration**: Look for `duration=XXXms` in HTTP logs - high values indicate network issues
- **Collection Generation Duration**: Final INFO log shows total generation time
- **Cache Hit Rate**: Proportion of ProtonDB fetches with cache hits vs. cache misses
- **Number of Apps**: Watch `appCount` metrics to understand library size

## Troubleshooting

### High Collection Generation Time

1. Check HTTP response times - if consistently high, network is the bottleneck
2. Look for `maxConcurrentRequests` being reduced - indicates API rate limiting
3. Check if auto-sync is triggering repeatedly

### Missing Collections

1. Check for `component=Collections` ERROR logs
2. Look for `component=Steam` errors when calling `setCollection`
3. Verify Steam integration logs show proper API availability

### ProtonDB Badge Issues

1. Search for `component=ProtonDB` ERROR logs
2. Check HTTP failures for that specific app ID
3. Look for cache eviction messages if cache is full

## Logger Configuration

The logger can be configured by modifying `src/logger.ts`:

- **Minimum Log Level**: Change `minLevel` to filter logs (DEBUG, INFO, WARN, ERROR)
- **Context Details**: Logs automatically include relevant context like appId, tier, duration
- **Log Format**: Modify `formatContext` to customize how context is displayed

Example usage in code:
```typescript
import { logger } from "./logger";

logger.info("Custom event", { component: "MyComponent", action: "myAction", detail: "value" });
logger.warn("Warning message", error, { component: "MyComponent" });
```
