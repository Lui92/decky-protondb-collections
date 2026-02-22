/**
 * Frontend entry for the Decky plugin (React + Decky UI)
 * This file implements the UI described in the design: badge toggles, installed-only,
 * auto-sync, manual refresh and a progress bar.
 *
 * Note: This file expects to run in Decky's plugin host and to use the provided
 * `serverApi` methods to call backend functions. The `serverApi` object is injected
 * by Decky when the plugin is loaded.
 */

import React, { useEffect, useState } from "react";
import {
  definePlugin,
  PanelSection,
  PanelSectionRow,
  Button,
  ToggleField,
  ProgressBar,
  Spinner,
  Toggle,
  PanelTitle,
  TextField,
} from "@decky/ui";

import { Settings } from "./types";

const BADGES = ["platinum", "gold", "silver", "bronze", "borked"];

export default definePlugin((serverApi: any) => {
  const [progress, setProgress] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [enabledBadges, setEnabledBadges] = useState<string[]>(BADGES);
  const [installedOnly, setInstalledOnly] = useState(false);
  const [autoSync, setAutoSync] = useState(false);
  const [concurrency, setConcurrency] = useState<number>(6);
  const [minIntervalMs, setMinIntervalMs] = useState<number>(200);
  const [maxCacheEntries, setMaxCacheEntries] = useState<number>(2000);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  useEffect(() => {
    // Load settings from backend when plugin mounts
    (async () => {
      try {
        const s: Settings = await serverApi.callPluginMethod("getSettings");
        if (s) {
          setEnabledBadges(s.enabledBadges || BADGES);
          setInstalledOnly(!!s.installedOnly);
          setAutoSync(!!s.autoSync);
          setConcurrency(s.concurrency ?? 6);
          setMinIntervalMs(s.minIntervalMs ?? 200);
          setMaxCacheEntries(s.maxCacheEntries ?? 2000);
        }
      } catch (err) {
        // backend may not be available during development; ignore
        console.warn("Failed to load settings", err);
      }
    })();
  }, [serverApi]);

  const generate = async () => {
    setRunning(true);
    setProgress(0);

    try {
      // Register a progress handler by passing a callback id or using events.
      // For simplicity we pass a function reference if supported by the host.
      await serverApi.callPluginMethod("generateCollections", {
        progressCallback: (current: number, total: number) => {
          setProgress(current / Math.max(1, total));
        },
      });
      setLastRefresh(new Date().toLocaleString());
    } catch (err) {
      console.error("Generate failed", err);
      // Optionally show a toast via Decky API
    } finally {
      setRunning(false);
      setProgress(null);
    }
  };

  const saveSettings = async () => {
    const s: Settings = { enabledBadges, installedOnly, autoSync, concurrency, minIntervalMs, maxCacheEntries };
    try {
      await serverApi.callPluginMethod("updateSettings", s);
    } catch (err) {
      console.warn("Failed to save settings", err);
    }
  };

  return {
    title: <PanelTitle>ProtonDB Collections</PanelTitle>,
    content: (
      <PanelSection title="Filters">
        {BADGES.map((badge) => (
          <PanelSectionRow key={badge}>
            <ToggleField
              label={badge.charAt(0).toUpperCase() + badge.slice(1)}
              checked={enabledBadges.includes(badge)}
              onChange={(val: boolean) => {
                const updated = val ? [...enabledBadges, badge] : enabledBadges.filter((b) => b !== badge);
                setEnabledBadges(updated);
              }}
            />
          </PanelSectionRow>
        ))}

        <PanelSectionRow>
          <ToggleField label="Installed Games Only" checked={installedOnly} onChange={setInstalledOnly} />
        </PanelSectionRow>

        <PanelSectionRow>
          <ToggleField label="Auto Sync with Tab Master" checked={autoSync} onChange={setAutoSync} />
        </PanelSectionRow>

        <PanelSectionRow>
          <Button onClick={saveSettings}>Save Settings</Button>
        </PanelSectionRow>

        <PanelSectionRow>
          <div style={{display: 'flex', gap: 12, alignItems: 'center', width: '100%'}}>
            <div style={{flex: 1}}>
              <div style={{fontSize: 12, color: '#888'}}>Concurrency</div>
              <TextField
                value={String(concurrency)}
                onChange={(v: any) => setConcurrency(Math.max(1, Number(v) || 1))}
                placeholder="6"
              />
            </div>

            <div style={{flex: 1}}>
              <div style={{fontSize: 12, color: '#888'}}>Min interval (ms)</div>
              <TextField
                value={String(minIntervalMs)}
                onChange={(v: any) => setMinIntervalMs(Math.max(0, Number(v) || 0))}
                placeholder="200"
              />
            </div>

            <div style={{flex: 1}}>
              <div style={{fontSize: 12, color: '#888'}}>Max cache entries</div>
              <TextField
                value={String(maxCacheEntries)}
                onChange={(v: any) => setMaxCacheEntries(Math.max(0, Number(v) || 0))}
                placeholder="2000"
              />
            </div>
          </div>
        </PanelSectionRow>

        <PanelSectionRow>
          <Button onClick={generate} disabled={running}>
            {running ? <Spinner /> : "Generate Collections"}
          </Button>
        </PanelSectionRow>

        {running && (
          <PanelSectionRow>
            <ProgressBar value={progress ?? 0} />
          </PanelSectionRow>
        )}

        <PanelSectionRow>
          <div>Last refresh: {lastRefresh ?? "Never"}</div>
        </PanelSectionRow>
      </PanelSection>
    ),
  };
});
