import { io, Socket as IOSocket } from "socket.io-client"
import superjson from "superjson"

export interface ServerConfig {
  name: string
  url: string
}

export class RemoteStateServer {
  static globalServer?: string
  static instances: { [key: string]: RemoteStateServer } = {}

  public connection: IOSocket

  public constructor(public serverName: string, public serverUrl: string) {
    this.connection = io(this.serverUrl)
  }

  public bind<T>(namespace: string, key: string, initialValue: T, updater: (newState: T) => void) {
    this.connection.emit('sub', {
      namespace,
      key,
      initialValue: superjson.stringify(initialValue)
    })

    const callback = (payload: string) => {
      updater(superjson.parse(payload))
    }

    this.connection.on(`${namespace}:${key}`, callback)
    return () => {
      this.connection.off(`${namespace}:${key}`, callback)
    }
  }

  public set<T>(namespace: string, key: string, value: T) {
    this.connection.emit('save', {
      namespace,
      key,
      value: superjson.stringify(value)
    })
  }

  public static getInstance(server?: string | ServerConfig): RemoteStateServer {
    const serverName = (typeof server === 'object' ? server.name : server) || 'default'
    const serverUrl = typeof server === 'object' && server.url || 'http://127.0.0.1:12152'

    if (RemoteStateServer.instances[serverName]) {
      return RemoteStateServer.instances[serverName]
    }

    return (RemoteStateServer.instances[serverName] = new RemoteStateServer(serverName, serverUrl))
  }

  public static initServer(server: ServerConfig) {
    return RemoteStateServer.getInstance(server)
  }
}

export class StateManager {
  static defaultNamespace: string = ['default', window.location.host].join('$$')
  static instances: { [key: string]: StateManager } = {}

  protected server: RemoteStateServer

  constructor(public serverName: string, public namespace: string) {
    this.server = RemoteStateServer.getInstance(serverName)
  }

  public bind<T>(key: string, updater: (newState: T) => void, initialValue: T) {
    this.server.bind(this.namespace, key, initialValue, updater)
  }

  public set<T>(key: string, value: T) {
    this.server.set(this.namespace, key, value)
  }

  public static getInstance(namespace?: string, serverName: string = 'default') {
    namespace = namespace || StateManager.defaultNamespace
    const instanceName = [serverName, namespace].join('$$')

    if (StateManager.instances[instanceName]) {
      return StateManager.instances[instanceName]
    }

    return (StateManager.instances[instanceName] = new StateManager(serverName, namespace))
  }

  public static init(namespace: string, server?: ServerConfig) {
    server && RemoteStateServer.initServer(server)
    return this.getInstance(namespace)
  }
}
