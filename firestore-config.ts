// firestore-config.ts - Firestore configuration for React Native
import { Firestore, connectFirestoreEmulator } from "firebase/firestore";

// Type declarations for React Native global objects
declare const global: any;

// Configuration to prevent WebChannel connection errors in React Native
export const configureFirestoreForReactNative = (db: Firestore) => {
  // Set up error handling for connection issues
  const originalConsoleError = console.error;
  
  // Override console.error to filter out WebChannel connection errors
  console.error = (...args: any[]) => {
    const message = args.join(' ');
    
    // Filter out common Firestore WebChannel errors that are not critical
    if (
      message.includes('WebChannelConnection RPC') ||
      message.includes('transport errored') ||
      message.includes('Listen stream') ||
      message.includes('Write stream')
    ) {
      // Log as warning instead of error for better debugging
      console.warn('Firestore connection warning:', ...args);
      return;
    }
    
    // Log other errors normally
    originalConsoleError.apply(console, args);
  };

  // Return cleanup function
  return () => {
    console.error = originalConsoleError;
  };
};

// Network state management for Firestore
export class FirestoreNetworkManager {
  private db: Firestore;
  private isOnline: boolean = true;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor(db: Firestore) {
    this.db = db;
    this.setupNetworkListeners();
  }

  private setupNetworkListeners() {
    // Listen for network state changes (React Native compatible)
    if (typeof global !== 'undefined' && global.window) {
      const win = global.window as any;
      if (win.addEventListener) {
        win.addEventListener('online', () => this.handleOnline());
        win.addEventListener('offline', () => this.handleOffline());
      }
    }
  }

  private async handleOnline() {
    if (!this.isOnline) {
      this.isOnline = true;
      this.reconnectAttempts = 0;
      console.log('Network back online, reconnecting Firestore...');
      // Firestore will automatically reconnect when network is available
    }
  }

  private handleOffline() {
    this.isOnline = false;
    console.log('Network offline, Firestore will work in offline mode');
  }

  public getNetworkStatus(): boolean {
    return this.isOnline;
  }
}
