/**
 * Structured logging utility for ProtonSets plugin.
 * Provides debug, info, warn, and error levels with context.
 * Logs are written to both console and file (on Steam Deck: /homebrew/logs/decky-protondb-collections/)
 */

import fs from "fs";
import path from "path";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

interface LogContext {
  component?: string;
  action?: string;
  appId?: number | string;
  duration?: number;
  [key: string]: any;
}

class Logger {
  private minLevel: LogLevel = LogLevel.DEBUG;
  private logDir: string = "";
  private logFile: string = "";
  private maxLogFileSize: number = 5 * 1024 * 1024; // 5MB
  private currentLogSize: number = 0;

  constructor() {
    this.initializeLogDirectory();
  }

  private initializeLogDirectory() {
    try {
      // On Steam Deck, logs go to /homebrew/logs/decky-protondb-collections/
      // Otherwise use DECKY_PLUGIN_DATA_PATH or current directory
      const homebrewLogsPath = "/homebrew/logs/decky-protondb-collections";
      const dataPath = process.env.DECKY_PLUGIN_DATA_PATH || ".";
      
      // Try homebrew path first (Steam Deck)
      if (process.env.DECKY_PLUGIN_LOG_DIR) {
        this.logDir = process.env.DECKY_PLUGIN_LOG_DIR;
      } else if (fs.existsSync("/homebrew/logs")) {
        this.logDir = homebrewLogsPath;
      } else {
        this.logDir = dataPath;
      }

      // Create log directory if it doesn't exist
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }

      this.logFile = path.join(this.logDir, "plugin.log");

      // Check current log file size
      if (fs.existsSync(this.logFile)) {
        const stats = fs.statSync(this.logFile);
        this.currentLogSize = stats.size;
      }
    } catch (err) {
      // If directory creation fails, just use console logging
      console.warn("Failed to initialize log directory:", err);
      this.logDir = "";
    }
  }

  private rotateLogIfNeeded() {
    try {
      if (!this.logDir || this.currentLogSize < this.maxLogFileSize) return;

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const archivePath = path.join(this.logDir, `plugin-${timestamp}.log`);
      
      if (fs.existsSync(this.logFile)) {
        fs.renameSync(this.logFile, archivePath);
      }
      
      this.currentLogSize = 0;
    } catch (err) {
      // Silently fail for log rotation
    }
  }

  private writeToFile(message: string) {
    try {
      if (!this.logDir || !this.logFile) return;

      fs.appendFileSync(this.logFile, message + "\n");
      this.currentLogSize += message.length + 1;

      // Check if we need to rotate
      if (this.currentLogSize >= this.maxLogFileSize) {
        this.rotateLogIfNeeded();
      }
    } catch (err) {
      // Silently fail for file writes to not break plugin
    }
  }

  setMinLevel(level: LogLevel) {
    this.minLevel = level;
  }

  getLogDirectory(): string {
    return this.logDir;
  }

  getLogFile(): string {
    return this.logFile;
  }

  private formatContext(context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) return "";
    const parts: string[] = [];
    
    if (context.component) parts.push(`[${context.component}]`);
    if (context.action) parts.push(`${context.action}`);
    if (context.appId !== undefined) parts.push(`appId=${context.appId}`);
    if (context.duration !== undefined) parts.push(`${context.duration}ms`);
    
    // Add any other context properties
    for (const [key, value] of Object.entries(context)) {
      if (!["component", "action", "appId", "duration"].includes(key) && value !== undefined) {
        parts.push(`${key}=${JSON.stringify(value)}`);
      }
    }
    
    return parts.length > 0 ? ` ${parts.join(" ")}` : "";
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private log(level: LogLevel, message: string, error?: Error | any, context?: LogContext) {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const contextStr = this.formatContext(context);
    const baseMsg = `[${timestamp}] ${level}${contextStr}: ${message}`;

    // Write to console
    if (error) {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(baseMsg, error);
          break;
        case LogLevel.INFO:
          console.info(baseMsg, error);
          break;
        case LogLevel.WARN:
          console.warn(baseMsg, error);
          break;
        case LogLevel.ERROR:
          console.error(baseMsg, error);
          break;
      }
    } else {
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(baseMsg);
          break;
        case LogLevel.INFO:
          console.info(baseMsg);
          break;
        case LogLevel.WARN:
          console.warn(baseMsg);
          break;
        case LogLevel.ERROR:
          console.error(baseMsg);
          break;
      }
    }

    // Write to file
    let fileMsg = baseMsg;
    if (error) {
      const errorStr = error instanceof Error ? error.stack || error.message : String(error);
      fileMsg += `\n  Error: ${errorStr}`;
    }
    this.writeToFile(fileMsg);
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, undefined, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, undefined, context);
  }

  warn(message: string, error?: Error | any, context?: LogContext) {
    this.log(LogLevel.WARN, message, error, context);
  }

  error(message: string, error?: Error | any, context?: LogContext) {
    this.log(LogLevel.ERROR, message, error, context);
  }

  // Convenience methods for common operations
  logStartAction(component: string, action: string, context?: Omit<LogContext, "component" | "action">) {
    this.debug(`Starting ${action}`, { component, action, ...context });
  }

  logEndAction(component: string, action: string, duration: number, context?: Omit<LogContext, "component" | "action" | "duration">) {
    this.info(`Completed ${action}`, { component, action, duration, ...context });
  }

  logHttpRequest(url: string, method = "GET", attempt = 1) {
    this.debug(`HTTP ${method} ${url}`, { component: "HTTP", action: "request", attempt });
  }

  logHttpResponse(url: string, statusCode: number, statusText: string, duration: number) {
    this.debug(`HTTP response: ${statusCode} ${statusText}`, { component: "HTTP", action: "response", duration });
  }

  logHttpError(url: string, error: Error | string) {
    this.warn(`HTTP request failed: ${url}`, new Error(String(error)), { component: "HTTP" });
  }

  logProtonDBFetch(appId: number, cached: boolean, tier?: string) {
    const msg = cached ? `Fetched ${tier} from cache` : `Fetching from ProtonDB`;
    this.debug(msg, { component: "ProtonDB", action: "fetch", appId });
  }

  logProtonDBError(appId: number, error: Error) {
    this.warn(`Failed to fetch ProtonDB badge`, error, { component: "ProtonDB", appId });
  }

  logCollectionCreated(name: string, appCount: number) {
    this.info(`Collection created: ${name}`, { component: "Collections", action: "create", apps: appCount });
  }

  logCollectionFailed(name: string, error: Error) {
    this.warn(`Failed to create collection: ${name}`, error, { component: "Collections", action: "create" });
  }

  logTabMasterSync(tabName: string, appCount: number) {
    this.debug(`TabMaster tab created: ${tabName}`, { component: "TabMaster", action: "createTab", apps: appCount });
  }

  logTabMasterError(tabName: string, error: Error) {
    this.warn(`TabMaster sync failed: ${tabName}`, error, { component: "TabMaster", action: "createTab" });
  }

  logSteamIntegration(status: string, details?: any) {
    this.info(`Steam integration: ${status}`, { component: "Steam", ...details });
  }

  logCacheOperation(operation: "load" | "save" | "evict", success: boolean, details?: any) {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    this.log(level, `Cache ${operation}`, undefined, { component: "Cache", action: operation, ...details });
  }

  logSettingsOperation(operation: "load" | "save" | "update", success: boolean, details?: any) {
    const level = success ? LogLevel.DEBUG : LogLevel.WARN;
    this.log(level, `Settings ${operation}`, undefined, { component: "Settings", action: operation, ...details });
  }
}

export const logger = new Logger();
export default logger;
