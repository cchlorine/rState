import { Action, Payload } from "@rstate/shared";
import cors from "cors";
import express from "express";
import http from "http";
import type WebSocket from "ws";
import { container } from "./container";
import Context, { useContext } from "./context";
import { bindRoutes } from "./routes";
import { WebSocketServer } from './ws';

const io = new WebSocketServer({
  noServer: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      // See zlib defaults.
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    // Other options settable:
    clientNoContextTakeover: true, // Defaults to negotiated value.
    serverNoContextTakeover: true, // Defaults to negotiated value.
    serverMaxWindowBits: 10, // Defaults to negotiated value.
    // Below options specified as default values.
    concurrencyLimit: 10, // Limits zlib concurrency for perf.
    threshold: 1024 // Size (in bytes) below which messages
    // should not be compressed if context takeover is disabled.
  }
})

function createServer() {
  const app = express();

  app.use(cors())
  app.use(useContext)

  app.use(express.json())
  app.use(express.urlencoded())

  bindRoutes(app)

  const server = http.createServer(app)
  io.bindUpgrade(server)
  server.on('close', () => container.dispose())

  return server
}


io.on("sub", async (payload: Payload, socket: WebSocket) => {
  const { namespace, key, rawData: initialValue } = payload as Payload<any>
  const { storageService } = Context.get(socket)!

  if (typeof initialValue !== "undefined") {
    console.log(initialValue)
    try {
      await storageService.trySet(namespace, key, initialValue)
    } catch (err) {
      console.error(err)
    }
  }

  io.pub(
    `${namespace}:${key}`,
    Payload.new({
      namespace, key,
      action: Action.Emit,
      rawData: await storageService.getOrUndefined(namespace, key),
    }),
  )
})

io.on("save", async (payload: Payload, socket: WebSocket) => {
  const { namespace, key, rawData } = payload
  const { storageService } = Context.get(socket)!
  await storageService.set(namespace, key, rawData)

  io.pub(
    `${namespace}:${key}`,
    Payload.new({
      namespace, key,
      action: Action.Emit,
      rawData: await storageService.getOrUndefined(namespace, key)
    }),
  )
})

createServer().listen(12152, () => {
  console.log('listening on http://localhost:12152');
});
