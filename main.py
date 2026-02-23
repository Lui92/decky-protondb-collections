import os
import json
import asyncio
import aiohttp
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Callable

# The decky plugin module is located at decky-loader/plugin
# For easy intellisense checkout the decky-loader code repo
# and add the `decky-loader/plugin/imports` path to `python.analysis.extraPaths` in `.vscode/settings.json`
import decky

# Constants
DEFAULT_BADGES = ["platinum", "gold", "silver", "bronze", "borked"]
CACHE_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "proton_cache.json")
SETTINGS_FILE = os.path.join(decky.DECKY_PLUGIN_SETTINGS_DIR, "settings.json")
THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000


class Plugin:
    """
    ProtonDB Collections Plugin
    Creates Steam collections from ProtonDB compatibility tiers.
    
    Responsibilities:
    - Fetch ProtonDB badge summaries and cache them
    - Generate Steam collections grouped by badge tier
    - Optionally sync collections with Tab Master plugin
    - Persist settings and cache to disk
    """
    
    def __init__(self):
        self.cache: Dict[str, Dict] = {}
        self.settings: Dict = {
            "enabledBadges": DEFAULT_BADGES.copy(),
            "installedOnly": False,
            "autoSync": False,
            "concurrency": 6,
            "minIntervalMs": 200,
            "maxCacheEntries": 2000,
        }
        self.steam = None
        self.refreshing = False
        self.loop = None
        
        # Rate limiting
        self.current_requests = 0
        self.max_concurrent_requests = 6
        self.min_interval_ms = 200
        self.last_request_at = 0
        self.max_cache_entries = 2000
        
        self.load_cache()
        self.load_settings()
    
    def load_cache(self):
        """Load cache from disk if available"""
        try:
            if os.path.exists(CACHE_FILE):
                with open(CACHE_FILE, "r") as f:
                    self.cache = json.load(f)
                    decky.logger.info(f"Loaded cache with {len(self.cache)} entries")
        except Exception as err:
            decky.logger.error(f"Failed to load cache: {err}")
            self.cache = {}
    
    def save_cache(self):
        """Save cache to disk"""
        try:
            os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
            with open(CACHE_FILE, "w") as f:
                json.dump(self.cache, f, indent=2)
        except Exception as err:
            decky.logger.error(f"Failed to save cache: {err}")
    
    def load_settings(self):
        """Load settings from disk"""
        try:
            if os.path.exists(SETTINGS_FILE):
                with open(SETTINGS_FILE, "r") as f:
                    loaded = json.load(f)
                    self.settings.update(loaded)
                    decky.logger.info("Loaded settings from disk")
                    
                    # Apply advanced settings
                    if isinstance(self.settings.get("concurrency"), (int, float)):
                        self.max_concurrent_requests = max(1, int(self.settings["concurrency"]))
                    if isinstance(self.settings.get("minIntervalMs"), (int, float)):
                        self.min_interval_ms = max(0, int(self.settings["minIntervalMs"]))
                    if isinstance(self.settings.get("maxCacheEntries"), (int, float)):
                        self.max_cache_entries = max(0, int(self.settings["maxCacheEntries"]))
        except Exception as err:
            decky.logger.error(f"Failed to load settings: {err}")
    
    def save_settings(self):
        """Save settings to disk"""
        try:
            os.makedirs(decky.DECKY_PLUGIN_SETTINGS_DIR, exist_ok=True)
            with open(SETTINGS_FILE, "w") as f:
                json.dump(self.settings, f, indent=2)
        except Exception as err:
            decky.logger.error(f"Failed to save settings: {err}")
    
    async def http_get_json(self, url: str, retries: int = 2, delay: int = 400) -> dict:
        """Rate-limited HTTP GET with retry logic"""
        # Wait for available slot
        while self.current_requests >= self.max_concurrent_requests:
            await asyncio.sleep(0.05)
        
        # Enforce minimum interval between requests
        wait_for = max(0, self.min_interval_ms - (time.time() * 1000 - self.last_request_at))
        if wait_for > 0:
            await asyncio.sleep(wait_for / 1000)
        
        self.current_requests += 1
        self.last_request_at = time.time() * 1000
        
        last_err = None
        try:
            async with aiohttp.ClientSession() as session:
                for attempt in range(retries + 1):
                    try:
                        async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as res:
                            if res.status != 200:
                                raise Exception(f"HTTP {res.status} for {url}")
                            return await res.json()
                    except Exception as err:
                        last_err = err
                        if attempt < retries:
                            await asyncio.sleep(delay * (2 ** attempt) / 1000)
                            # Reduce concurrency on repeated failures
                            try:
                                self.max_concurrent_requests = max(1, self.max_concurrent_requests - 1)
                            except:
                                pass
                
                if last_err:
                    raise last_err
        finally:
            self.current_requests = max(0, self.current_requests - 1)
    
    async def fetch_badge(self, appid: int) -> str:
        """
        Fetch ProtonDB badge tier for an appid.
        Uses local cache and persists to disk.
        Returns normalized lower-case tier or 'unknown' on error.
        """
        app_id_str = str(appid)
        
        # Check cache
        if app_id_str in self.cache:
            entry = self.cache[app_id_str]
            updated_ms = entry.get("updated", 0)
            if time.time() * 1000 - updated_ms < THIRTY_DAYS_MS:
                return entry.get("tier", "unknown")
        
        try:
            url = f"https://www.protondb.com/api/v1/reports/summaries/{app_id_str}.json"
            json_data = await self.http_get_json(url, 2, 400)
            tier = str(json_data.get("tier", "unknown")).lower()
            
            self.cache[app_id_str] = {
                "tier": tier,
                "updated": time.time() * 1000
            }
            self.evict_cache_if_needed()
            self.save_cache()
            return tier
        except Exception as err:
            decky.logger.warning(f"Failed to fetch ProtonDB for {app_id_str}: {err}")
            return "unknown"
    
    def evict_cache_if_needed(self):
        """Remove oldest cache entries when cache exceeds configured size"""
        try:
            if self.max_cache_entries <= 0:
                return
            
            if len(self.cache) <= self.max_cache_entries:
                return
            
            # Sort by updated timestamp
            sorted_keys = sorted(
                self.cache.keys(),
                key=lambda k: self.cache[k].get("updated", 0)
            )
            
            to_remove = len(sorted_keys) - self.max_cache_entries
            for i in range(to_remove):
                del self.cache[sorted_keys[i]]
        except Exception as err:
            decky.logger.error(f"Cache eviction failed: {err}")
    
    async def generate_collections(
        self,
        progress_callback: Optional[Callable[[int, int], None]] = None,
        concurrency: Optional[int] = None
    ) -> Optional[Dict[str, List[int]]]:
        """
        Generate collections grouped by badge.
        progressCallback(current, total) optional progress reporter.
        """
        if self.refreshing:
            return None
        
        if not self.steam or not hasattr(self.steam, 'getOwnedAppIds'):
            raise Exception("Steam integration not injected")
        
        self.refreshing = True
        
        try:
            if concurrency is None:
                concurrency = self.max_concurrent_requests
            
            # Get app lists
            apps = await self.steam.getOwnedAppIds() if hasattr(self.steam.getOwnedAppIds, '__call__') else self.steam.getOwnedAppIds
            if asyncio.iscoroutine(apps):
                apps = await apps
            
            installed = []
            if hasattr(self.steam, 'getInstalledAppIds'):
                installed = await self.steam.getInstalledAppIds() if asyncio.iscoroutine(self.steam.getInstalledAppIds()) else self.steam.getInstalledAppIds
            
            # Initialize buckets
            buckets = {badge: [] for badge in self.settings.get("enabledBadges", DEFAULT_BADGES)}
            if "unknown" not in buckets:
                buckets["unknown"] = []
            
            count = 0
            total = len(apps)
            
            # Concurrent worker pool
            queue = apps.copy()
            
            async def worker():
                nonlocal count
                while queue:
                    try:
                        app = queue.pop(0)
                        
                        # Installed-only filter
                        if self.settings.get("installedOnly") and app not in installed:
                            count += 1
                            if progress_callback:
                                progress_callback(count, total)
                            continue
                        
                        tier = await self.fetch_badge(app)
                        if tier in buckets:
                            buckets[tier].append(app)
                        else:
                            buckets["unknown"].append(app)
                    except Exception as err:
                        buckets["unknown"].append(app)
                        decky.logger.warning(f"Failed to process app {app}: {err}")
                    finally:
                        count += 1
                        if progress_callback:
                            progress_callback(count, total)
            
            # Run workers
            workers = [worker() for _ in range(concurrency)]
            await asyncio.gather(*workers)
            
            # Persist collections to Steam
            for tier, app_ids in buckets.items():
                try:
                    collection_name = f"ProtonDB - {tier.capitalize()}"
                    if hasattr(self.steam, 'setCollection') and app_ids:
                        await self.steam.setCollection(collection_name, app_ids) if asyncio.iscoroutine(self.steam.setCollection(collection_name, app_ids)) else self.steam.setCollection(collection_name, app_ids)
                except Exception as err:
                    decky.logger.warning(f"Failed to set collection for tier {tier}: {err}")
            
            # Optional Tab Master sync
            if self.settings.get("autoSync"):
                await self.sync_tab_master(buckets)
            
            return buckets
        finally:
            self.refreshing = False
    
    async def sync_tab_master(self, buckets: Dict[str, List[int]]):
        """Sync collections with Tab Master plugin if installed"""
        try:
            if not self.steam or not hasattr(self.steam, 'isPluginInstalled'):
                return
            
            if not self.steam.isPluginInstalled("TabMaster"):
                return
            
            for tier, app_ids in buckets.items():
                try:
                    tab_name = f"ProtonDB {tier}"
                    if hasattr(self.steam, 'callPlugin'):
                        await self.steam.callPlugin("TabMaster", "createTab", {
                            "name": tab_name,
                            "apps": app_ids,
                        })
                except Exception as err:
                    decky.logger.warning(f"TabMaster createTab failed for {tab_name}: {err}")
        except Exception as err:
            decky.logger.error(f"Tab Master sync failed: {err}")
    
    def watch_library_changes(self):
        """Register listener for library changes"""
        if self.steam and hasattr(self.steam, 'onLibraryChanged'):
            def on_library_changed():
                if self.settings.get("autoSync") and self.loop:
                    asyncio.run_coroutine_threadsafe(
                        self.generate_collections(),
                        self.loop
                    )
            
            self.steam.onLibraryChanged(on_library_changed)
    
    # Frontend API methods
    async def get_settings(self) -> Dict:
        """Get current settings"""
        return self.settings
    
    async def update_settings(self, new_settings: Dict) -> None:
        """Update settings and persist"""
        if not isinstance(new_settings.get("enabledBadges"), list):
            new_settings["enabledBadges"] = DEFAULT_BADGES.copy()
        
        self.settings = {**self.settings, **new_settings}
        
        # Update runtime knobs
        if isinstance(self.settings.get("concurrency"), (int, float)):
            self.max_concurrent_requests = max(1, int(self.settings["concurrency"]))
        if isinstance(self.settings.get("minIntervalMs"), (int, float)):
            self.min_interval_ms = max(0, int(self.settings["minIntervalMs"]))
        if isinstance(self.settings.get("maxCacheEntries"), (int, float)):
            self.max_cache_entries = max(0, int(self.settings["maxCacheEntries"]))
        
        self.save_settings()
    
    # Decky lifecycle
    async def _main(self):
        """Called when the plugin loads"""
        self.loop = asyncio.get_event_loop()
        self.watch_library_changes()
        decky.logger.info("ProtonDB Collections plugin loaded")
    
    async def _unload(self):
        """Called when the plugin unloads"""
        decky.logger.info("ProtonDB Collections plugin unloading")
    
    async def _uninstall(self):
        """Called when the plugin is uninstalled"""
        decky.logger.info("ProtonDB Collections plugin uninstalling")
    
    async def _migration(self):
        """Handle any data migrations"""
        decky.logger.info("ProtonDB Collections plugin migrating")
