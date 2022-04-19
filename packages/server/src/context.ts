import type { AwilixContainer } from "awilix";
import type { NextFunction, Request, Response } from "express";
import { container } from "./container";
import type { ICradle } from "./container";
import type { Duplex } from "stream";
import type { WebSocket } from "ws";

type ContextKey = Request | Duplex | WebSocket

export default class Context {
  static _bindings = new WeakMap<ContextKey, Context>()

  constructor(public container: AwilixContainer<ICradle>) {
    this.bindServices()
  }

  protected bindServices() {
    const serviceKeys = Object.keys(container.cradle) as (keyof ICradle)[]

    serviceKeys.forEach((key) => {
      Reflect.set(this, key, container.cradle[key])
    })
  }

  static bind(req: ContextKey) {
    const ctx = new Context(container.createScope())
    Context._bindings.set(req, ctx)
    return ctx
  }

  static get(req: ContextKey) {
    const ctx = Context._bindings.get(req)

    if (ctx) {
      return ctx as (Context & ICradle)
    }

    return null
  }
}

export function useContext(req: Request, res: Response, next: NextFunction) {
  Context.bind(req)

  next()
}
