import { Action, assurePayload, Payload } from "@rstate/shared"

type Callback = (...args: any) => void
type EventCallback<T = any> = (payload: Payload<Action.Emit, T>) => void

class Socket {
  public instance: WebSocket | null = null
  protected eventMap: {
    [key: string]: Callback[],
    [key: `namespace:${string}`]: EventCallback[],
  } = {}

  protected emitQueue: { [key: string]: Payload | null } = {}

  protected getSocket() {
    if (!this.instance || this.instance.readyState > 1) {
      this.establish()
    }

    return this.instance!
  }

  protected handleOpen() {
    this.emit("ready")
  }

  public get readyState() {
    return this.instance?.readyState || 0
  }

  protected bindEvent(socket: WebSocket) {
    socket.addEventListener("open", this.handleOpen)
    socket.addEventListener("message", this.handleMessage)
    socket.addEventListener("close", this.handleClose)
    socket.addEventListener("error", (e) => {
      console.error(e)
    })
  }

  protected offEvent(socket: WebSocket) {
    socket.removeEventListener("open", this.handleOpen)
    socket.removeEventListener("message", this.handleMessage)
    socket.removeEventListener("close", this.handleClose)
  }

  protected handleClose() {
    this.instance && this.offEvent(this.instance)

    setTimeout(() => {
      this.establish()
    }, 2500)
  }

  protected establish() {
    this.instance = new WebSocket(this.serverUrl)
    this.bindEvent(this.instance)
  }

  public constructor(protected serverUrl: string) {
    this.handleOpen = this.handleOpen.bind(this)
    this.handleMessage = this.handleMessage.bind(this)
    this.handleClose = this.handleClose.bind(this)

    this.establish()
  }

  public send(payload: Payload) {
    if (!this.instance || this.instance.readyState !== 1) {
      console.log('wait for establish connection')
      this.emitQueue[`${payload.namespace}:${payload.key}`] = payload
    } else {
      console.log(payload)
      this.getSocket().send(payload.toBuffer())
    }
  }

  protected emit(event: "ready"): void;
  protected emit<T>(event: `namespace:${string}`, payload: Payload<Action.Emit, T>): void;
  protected emit(event: string, ...args: any) {
    this.eventMap[event]?.forEach((fn) => {
      fn(...args)
    })
  }

  public on(event: "ready", callback: Callback): void;
  public on(event: `namespace:${string}`, callback: EventCallback): void;
  public on(event: string, callback: Callback) {
    const eventMap = this.eventMap[event] || (this.eventMap[event] = [])
    eventMap.push(callback)
  }

  public off(event: string, callback: Callback) {
    if (!this.eventMap[event]) return
    this.eventMap[event] = this.eventMap[event].filter(
      (fn) => fn !== callback
    )
  }

  public dispatchEvent = <T>(payload: Payload<Action.Emit, T>) => {
    this.emit(`namespace:${payload.namespace}`, payload)
  }

  public async handleMessage(e: MessageEvent) {
    if (e.data instanceof Blob) {
      const buffer = await e.data.arrayBuffer()

      try {
        const payload = Payload.parse(buffer)

        if (assurePayload(payload, Action.Emit)) {
          this.dispatchEvent(payload)
        }
      } catch (err) {
        console.error(err)
      }
    }
  }
}

export interface ServerConfig {
  name: string
  url: string
}

export class RemoteStateServer {
  static globalServer?: string
  static instances: { [key: string]: RemoteStateServer } = {}

  public connection: Socket

  protected bindPayload: Payload<Action.Sub>[] = []

  public constructor(public serverName: string, public serverUrl: string) {
    this.connection = new Socket(this.serverUrl)
    this.connection.on("ready", this.onSocketReady)
  }

  private onSocketReady = () => {
    this.bindPayload.forEach((payload) => {
      this.connection.send(payload)
    })
  }

  public bind(payload: Payload<Action.Sub>) {
    if (this.connection.readyState === 1) {
      this.connection.send(payload)
    }

    this.bindPayload.push(payload)
  }

  public set<T>(payload: Payload<Action.Save, T>) {
    this.connection.send(payload)
  }

  public static getInstance(server?: string | ServerConfig): RemoteStateServer {
    const serverName = (typeof server === 'object' ? server.name : server) || 'default'
    const serverUrl = typeof server === 'object' && server.url || 'ws://127.0.0.1:12152'

    if (RemoteStateServer.instances[serverName]) {
      return RemoteStateServer.instances[serverName]
    }

    return (RemoteStateServer.instances[serverName] = new RemoteStateServer(serverName, serverUrl))
  }

  public static initServer(server: ServerConfig) {
    return RemoteStateServer.getInstance(server)
  }
}

type StateUpdader<T> = (newState: T) => void
type CallbackWithInitialValue<T> = [
  StateUpdader<T>,
  Payload<Action.Sub, T>,
]

export class StateManager {
  static defaultNamespace: string = ['default', window.location.host].join('$$')
  static instances: { [key: string]: StateManager } = {}

  protected server: RemoteStateServer
  protected eventMap: { [key: string]: CallbackWithInitialValue<any>[] } = {}

  constructor(public namespace: string, public serverName: string, public token = '') {
    this.server = RemoteStateServer.getInstance(serverName)
    this.server.connection.on(`namespace:${namespace}`, this.handleMessage)
  }

  protected handleMessage = (payload: Payload<Action.Emit>) => {
    (this.eventMap[payload.key] || []).forEach(([fn]) => {
      fn(payload.data)
    })
  }

  public bind<T>(key: string, updater: StateUpdader<T>, initialValue: T) {
    const eventMap = this.eventMap[key] || (this.eventMap[key] = [])

    const payload = Payload.new({
      action: Action.Sub,
      key,
      namespace: this.namespace,
      data: {
        token: this.token,
        initialValue,
      }
    })

    // register event
    eventMap.push([
      updater,
      payload,
    ])

    // subscribe server event
    this.server.bind(payload)
  }

  public set<T>(key: string, value: T) {
    this.server.set(Payload.new({
      key,
      action: Action.Save,
      namespace: this.namespace,
      data: value,
    }))
  }

  public static getInstance(namespace?: string, serverName: string = 'default') {
    namespace = namespace || StateManager.defaultNamespace
    const instanceName = [serverName, namespace].join('$$')

    if (StateManager.instances[instanceName]) {
      return StateManager.instances[instanceName]
    }

    return (StateManager.instances[instanceName] = new StateManager(namespace, serverName))
  }

  public static init(namespace: string, server?: ServerConfig) {
    server && RemoteStateServer.initServer(server)
    return this.getInstance(namespace)
  }
}
