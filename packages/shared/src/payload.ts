import superjson from "superjson";

const SIZE_MAP = {
  VERSION: [2, 0, 2],
  NAMESPACE: [64, 2, 2 + 64],
  KEY: [128, 66, 66 + 128],
  ACTION: [4, 194, 194 + 4],
  FORMAT: [16, 198, 198 + 16],
  DATA: [undefined, 214, undefined] as const,
}

type TYPE_MAP = {
  ACTION: number,
  VERSION: number,

  KEY: string,
  NAMESPACE: string,
  FORMAT: string,
  DATA: string,
}

const KEYS = ['VERSION', 'NAMESPACE', 'KEY', 'ACTION', 'FORMAT'] as const
type KEYS = (typeof KEYS)[number]
const SUPPORT_BUFFER = 'Buffer' in globalThis

export enum Action {
  Sub,
  Save,
  Emit,
}

interface PayloadDataMap<T> {
  [Action.Sub]: {
    token?: string,
    initialValue: T,
  },

  [Action.Save]: T,
  [Action.Emit]: T,
}

export type PayloadData<A extends Action, T> = PayloadDataMap<T>[A]

export interface Payload<A extends Action = Action, T = any> {
  version: number,
  namespace: string,
  key: string,
  format: string,
  action: A,
  data: PayloadData<A, T>,
  rawData: string,
}

class PayloadError extends Error { }

export function assurePayload<A extends Action, T>(payload: Payload<Action, T>, action: A): payload is Payload<A, T> {
  return payload.action === action
}

export class Payload<A extends Action, T = any> {
  public version = 1
  public format = 'superjson'

  constructor(action?: A) {
    if (action) {
      this.action = action
    }
  }

  static new<A extends Action, T>({
    namespace,
    key,
    data,
    rawData,
    action
  }: Record<'namespace' | 'key', string> & {
    action: A,
    rawData?: string,
    data?: PayloadData<A, T>,
  }) {
    const payload = new this<A, T>(action)

    payload.namespace = namespace
    payload.key = key
    payload.action = action

    if (data) {
      payload.data = data
    }

    if (rawData) {
      payload.rawData = rawData
    }

    return payload
  }

  static parse(buffer: Buffer | ArrayBuffer | Buffer[], options = {
    parseData: true
  }) {
    if (buffer instanceof ArrayBuffer || (SUPPORT_BUFFER && buffer instanceof Buffer)) {
      if (buffer.byteLength < SIZE_MAP.DATA[1]) {
        throw new PayloadError("invalid_payload_length")
      }

      const payload = new this()

      KEYS.map((key) => {
        Reflect.set(payload, key.toLowerCase(), sliceBuffer(buffer, key as any))
      })

      payload.rawData = sliceBuffer(buffer, "DATA")

      if (payload.rawData) {
        if (payload.format === 'superjson') {
          payload.data = superjson.parse(payload.rawData)
        } else {
          // FIXME: wrong type with any
          payload.data = payload.rawData as any
        }
      }

      return payload
    }

    return new this()
  }

  get formatedData() {
    if (this.rawData) {
      return this.rawData
    }

    if (this.format === 'superjson') {
      if (typeof this.data === 'undefined') {
        return "{\"json\":null,\"meta\":{\"values\":[\"undefined\"]}}"
      }

      return superjson.stringify(this.data)
    }

    throw new Error("unsupported_format")
  }

  public toBuffer() {
    const data = [
      padData(this.version, SIZE_MAP.VERSION[0],),
      padData(this.namespace, SIZE_MAP.NAMESPACE[0],),
      padData(this.key, SIZE_MAP.KEY[0]),
      padData(this.action, SIZE_MAP.ACTION[0],),
      padData(this.format, SIZE_MAP.FORMAT[0],),
      padData(this.formatedData)
    ]

    return SUPPORT_BUFFER ? Buffer.concat(data as any) : data.join('')
  }
}

function padData(value: string | number | undefined, length?: number) {
  if (length) {
    value = value?.toString().padStart(length)
  }

  if (SUPPORT_BUFFER) {
    return length ? Buffer.alloc(length, value) : Buffer.from(value?.toString() || '')
  } else {
    return value?.toString()
  }
}

const decoder = new TextDecoder("utf-8")
function sliceBuffer(buffer: Buffer | ArrayBuffer, type: "DATA"): string
function sliceBuffer<T extends KEYS = KEYS>(buffer: Buffer | ArrayBuffer, type: T): TYPE_MAP[T]
function sliceBuffer(buffer: Buffer | ArrayBuffer, type: KEYS | "DATA") {
  const rawBuffer = buffer.slice(SIZE_MAP[type][1], SIZE_MAP[type][2])

  if (type === "DATA") {
    const rawData = rawBuffer instanceof ArrayBuffer
      ? decoder.decode(rawBuffer)
      : rawBuffer

    return rawData
  }


  const rawData = rawBuffer instanceof ArrayBuffer
    ? decoder.decode(rawBuffer)
    : rawBuffer

  if (type === "VERSION" || type === "ACTION") {
    return parseInt(rawData.toString())
  }

  return rawData.toString().trim()
}
