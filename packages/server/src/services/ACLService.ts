import type { NextFunction, Request, Response } from "express"
import type { Pipeline } from "ioredis"
import type { ICradle } from "../container"
import Context from "../context"
import type { RedisService } from "./RedisService"

export enum NamespaceRole {
  None,

  Viewer,
  Modifier,
  Moderator,

  SuperAdmin,
}

export enum Strategy {
  None,
  Public,
  Private,
}

export class ACLService {
  protected redisService: RedisService

  constructor({ redisService }: ICradle) {
    this.redisService = redisService
  }

  protected keys = {
    superAdmin: `acl-admins`,
    strategy: `acl-namespace-strategy`,
    namespace(key: string) {
      return `acl-namespace:${key}`
    },
    token(key: string) {
      return `acl-tokens:${key}`
    }
  }

  protected get redis() {
    return this.redisService.redis
  }

  public async getAdmins() {
    return await this.redis.smembers(this.keys.superAdmin)
  }

  public async setAdmin(token: string) {
    return await this.redis.sadd(this.keys.superAdmin, token)
  }

  public async getStrategy(namespace: string) {
    const strategy = await this.redis.hget(this.keys.strategy, namespace) || ''

    return parseInt(strategy) || Strategy.None
  }

  public async setStrategy(namespace: string, strategy: Strategy, pipeline?: Pipeline) {
    return (pipeline || this.redis).hset(this.keys.strategy, namespace, strategy)
  }

  public async getRole(token: string, namespace: string): Promise<NamespaceRole> {
    const role = await this.redis.hget(
      this.keys.token(token),
      namespace,
    )

    return parseInt(role || '') || NamespaceRole.None
  }

  public async setRole(token: string, namespace: string, role: NamespaceRole, pipeline?: Pipeline) {
    const _pipeline = pipeline || this.redis.pipeline()

    _pipeline.hset(
      this.keys.token(token),
      namespace,
      role,
    )

    _pipeline.hset(
      this.keys.namespace(namespace),
      token,
      role,
    )

    return pipeline ? _pipeline : _pipeline.exec()
  }

  public async setRoles(namespace: string, auths: [string, NamespaceRole][]) {
    let pipeline = this.redis.pipeline()

    for (const [token, role] of auths) {
      this.setRole(token, namespace, role, pipeline)
    }

    return pipeline.exec()
  }

  public async fetchAuths(namespace: string) {
    return this.redis.hgetall(this.keys.namespace(namespace))
  }

  public async revokeAuth(namespace: string, token: string) {
    const pipeline = this.redis.pipeline()

    pipeline.hdel(
      this.keys.token(token),
      namespace,
    )

    pipeline.hdel(
      this.keys.namespace(namespace),
      token,
    )

    return pipeline.exec()
  }

  public async revokeAuths(namespace: string, tokens: string[]) {
    const pipeline = this.redis.pipeline()

    for (const token of tokens) {
      pipeline.hdel(
        this.keys.token(token),
        namespace,
      )
    }

    pipeline.hdel(
      this.keys.namespace(namespace),
      ...tokens,
    )

    return pipeline.exec()
  }

  public async validate(token: string, namespace: string, requiredRol: NamespaceRole) {
    return await this.getRole(namespace, token) >= requiredRol
  }

  public async validateRoom(token: string, namespace: string, requiredRol = NamespaceRole.Modifier, requiredStrategy: Strategy = Strategy.None) {
    const strategy = await this.getStrategy(namespace)

    if (strategy > requiredStrategy) {
      return await this.validate(token, namespace, requiredRol)
    }

    return true
  }
}

export function useAuth(requiredRol: NamespaceRole) {
  return async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    let token: string = ''
    const { namespace } = req.params

    if (req.headers['authorization']) {
      token = req.headers['authorization'].split(' ')[1]
    } else if (req.params['token']) {
      token = req.params['token']
    } else if (req.query['token']) {
      token = req.query['token'].toString()
    }

    const { aclService } = Context.get(req)!
    console.log('token', token)
    if (!(await aclService.validateRoom(token, namespace, requiredRol, Strategy.Public))) {
      res.status(403).json({
        "code": 403,
        "msg": "unauthorized",
      })
    } else {
      next()
    }
  }
}
