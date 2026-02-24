/**
 * Structured logging utility for ProtonSets plugin.
 * Provides debug, info, warn, and error levels with context.
 */

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

  setMinLevel(level: LogLevel) {
    this.minLevel = level;
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
