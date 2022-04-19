import WebSocket from "ws"
import type { ServerOptions } from "ws"
import type { Server } from "http"
import { Action, Payload } from "@rstate/shared"
import Context from "./context"
import { NamespaceRole } from "./services/ACLService"

export class WebSocketServer extends WebSocket.WebSocketServer {
  room = new Map<string, Set<WebSocket>>()
  joinedMap = new WeakMap<WebSocket, Set<string>>()

  constructor(options?: ServerOptions, callback?: () => void) {
    super(options, callback)
  }

  join(key: string, socket: WebSocket) {
    if (!this.room.has(key)) {
      this.room.set(key, new Set())
    }

    if (!this.room.has(key)) {
      this.room.set(key, new Set())
    }

    const room = this.room.get(key)!
    room.add(socket)

    if (!this.joinedMap.has(socket)) {
      this.joinedMap.set(socket, new Set(key))
    } else {
      if (!this.joinedMap.has(socket)) {
        this.joinedMap.set(socket, new Set())
      }

      this.joinedMap.get(socket)!.add(key)
    }
  }

  pub(key: string, data: Payload | string) {
    const room = this.room.get(key)
    const rawData = data instanceof Payload ? data.toBuffer() : data

    if (room) {
      room.forEach((ws) => {
        ws.send(rawData)
      })
    }
  }

  handleMessage(socket: WebSocket, data: WebSocket.RawData, isBinary: boolean) {
    try {
      const payload = Payload.parse(data)

      const { action, namespace, key } = payload
      const roomName = `${namespace}:${key}`

      if (action === Action.Sub) {
        const { token } = payload.data

        Context.get(socket)!.aclService.validateRoom(token, namespace).then(() => {
          this.join(roomName, socket)
          this.emit("sub", payload, socket)
        })
      }

      if (action === Action.Save) {
        this.emit("save", payload, socket)
      }
    } catch (e) {
      console.error(e)
    }
  }

  bindUpgrade(server: Server) {
    console.log('recv')
    server.on("upgrade", (req, socket, head) => {
      console.log("receiv upgrade req")
      this.handleUpgrade(req, socket, head, (ws, req) => {
        console.log("callback")
        this.emit("connection", ws, req)
      })
    })

    this.on("connection", (socket, req) => {
      Context.bind(socket)

      socket.on("message", (data, isBinary) => {
        this.handleMessage(socket, data, isBinary)
      })

      socket.on('close', () => {
        const rooms = this.joinedMap.get(socket)
        if (!rooms) return;
        for (const key of rooms) {
          this.room.get(key)?.delete(socket)
        }
      })
    })

    server.on('close', () => {
      this.room.clear()
    })
  }
}
