import { Socket as IOSocket } from "socket.io-client";
export interface ServerConfig {
    name: string;
    url: string;
}
export declare class RemoteStateServer {
    serverName: string;
    serverUrl: string;
    static globalServer?: string;
    static instances: {
        [key: string]: RemoteStateServer;
    };
    connection: IOSocket;
    callbackMap: {
        [key: string]: (newState: any) => void;
    };
    constructor(serverName: string, serverUrl: string);
    bind<T>(namespace: string, key: string, initialValue: T, updater: (newState: T) => void): () => void;
    set<T>(namespace: string, key: string, value: T): void;
    static getInstance(server?: string | ServerConfig): RemoteStateServer;
}
export declare class RemoteNamespaceStateManager {
    serverName: string;
    namespace: string;
    static defaultNamespace: string;
    static instances: {
        [key: string]: RemoteNamespaceStateManager;
    };
    protected server: RemoteStateServer;
    constructor(serverName: string, namespace: string);
    bind<T>(key: string, updater: (newState: T) => void, initialValue: T): void;
    set<T>(key: string, value: T): void;
    static getInstance(namespace?: string, serverName?: string): RemoteNamespaceStateManager;
}
