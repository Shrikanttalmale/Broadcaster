declare global {
  interface Window {
    electronAPI: {
      getVersion(): Promise<string>;
      getAppPath(): Promise<string>;
      quit(): void;
      checkForUpdates(): Promise<any>;
      installUpdate(): void;
      onUpdateAvailable(callback: () => void): void;
      onUpdateDownloaded(callback: () => void): void;
      invokeAPI(channel: string, ...args: any[]): Promise<any>;
      sendAPI(channel: string, ...args: any[]): void;
      onAPI(channel: string, callback: (...args: any[]) => void): void;
    };
    appStorage: {
      getItem(key: string): string | null;
      setItem(key: string, value: string): void;
      removeItem(key: string): void;
      clear(): void;
    };
  }
}

export {};
