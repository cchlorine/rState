import type { Express } from "express"
import namespaceRouter from "./namespace"

export function bindRoutes(app: Express) {
  app.use(namespaceRouter)
}
