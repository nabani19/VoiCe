// Ambient type declarations for React Native, Expo, and third-party libraries
// Ensures zero diagnostic errors in IDE before or after npm install

declare module 'react' {
  export = React;
  namespace React {
    export type FC<P = {}> = (props: P) => any;
    export function useState<T>(initial: T | (() => T)): [T, (val: T | ((prev: T) => T)) => void];
    export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
    export function useRef<T>(initial?: T): { current: T };
    export function useMemo<T>(factory: () => T, deps: any[]): T;
    export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
    export interface ReactElement {}
    export interface ReactNode {}
  }
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

declare module 'react-native' {
  export const View: any;
  export const Text: any;
  export const StyleSheet: {
    create: <T extends Record<string, any>>(styles: T) => T;
  };
  export const ScrollView: any;
  export const TouchableOpacity: any;
  export const TextInput: any;
  export const ActivityIndicator: any;
  export const Alert: {
    alert: (title: string, message?: string, buttons?: any[]) => void;
  };
  export const SafeAreaView: any;
  export const Image: any;
  export const FlatList: any;
  export const Dimensions: any;
  export const Platform: any;
  export const Modal: any;
}

declare module 'react-native-url-polyfill/auto' {}

declare module 'expo-status-bar' {
  export const StatusBar: any;
}

declare module 'expo-clipboard' {
  export function setStringAsync(text: string): Promise<boolean>;
  export function getStringAsync(): Promise<string>;
}

declare module 'expo-image-picker' {
  export enum MediaTypeOptions {
    All = 'All',
    Images = 'Images',
    Videos = 'Videos',
  }
  export interface ImagePickerOptions {
    mediaTypes?: MediaTypeOptions;
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
    base64?: boolean;
  }
  export interface ImagePickerAsset {
    uri: string;
    width: number;
    height: number;
    type?: 'image' | 'video';
    fileName?: string;
    fileSize?: number;
    base64?: string;
    mimeType?: string;
  }
  export interface ImagePickerResult {
    canceled: boolean;
    assets: ImagePickerAsset[];
  }
  export function requestMediaLibraryPermissionsAsync(): Promise<{ status: string; granted: boolean }>;
  export function launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
}

declare module 'expo-secure-store' {
  export function getItemAsync(key: string): Promise<string | null>;
  export function setItemAsync(key: string, value: string): Promise<void>;
  export function deleteItemAsync(key: string): Promise<void>;
}

declare module 'zustand' {
  export type StateCreator<T> = (
    set: (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void,
    get: () => T,
    api: any
  ) => T;
  export function create<T>(initializer: StateCreator<T>): {
    (): T;
    <U>(selector: (state: T) => U): U;
    getState: () => T;
    setState: (partial: T | Partial<T> | ((state: T) => T | Partial<T>)) => void;
    subscribe: (listener: (state: T, prevState: T) => void) => () => void;
  };
}

declare module '@supabase/supabase-js' {
  export function createClient(url: string, key: string, options?: any): any;
}

declare namespace NodeJS {
  interface ProcessEnv {
    [key: string]: string | undefined;
    EXPO_PUBLIC_SUPABASE_URL?: string;
    EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
    ANTHROPIC_API_KEY?: string;
    OPENAI_API_KEY?: string;
    GEMINI_API_KEY?: string;
    OPENROUTER_API_KEY?: string;
  }
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
