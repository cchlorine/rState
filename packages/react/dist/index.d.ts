/// <reference types="react" />
export declare const RemoteStateContext: import("react").Context<string>;
export declare function useRemoteState<T>(key: string, initialValue: T): readonly [T, (value: T) => void, boolean];
export default useRemoteState;
