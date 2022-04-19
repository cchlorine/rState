import type { ICradle } from "../container";
import type { RedisService } from "./RedisService";

const SUPERJSON_UNDEFINED = "{\"json\":null,\"meta\":{\"values\":[\"undefined\"]}}"

export class StorageService {
  protected redisService: RedisService

  constructor({ redisService }: ICradle) {
    this.redisService = redisService
  }

  protected prefix = {
    storage(key: string) {
      return `storage:${key}`
    }
  }

  public async getNamespaceKeys(namespace: string) {
    return this.redisService.redis.hkeys(this.prefix.storage(namespace))
  }

  public async getOrUndefined(namespace: string, key: string) {
    let r = await this.redisService.redis.hget(
      this.prefix.storage(namespace),
      key,
    )

    if (typeof r !== "string") r = SUPERJSON_UNDEFINED
    return r
  }

  public async set(namespace: string, key: string, rawData: string) {
    await this.redisService.redis.hset(
      this.prefix.storage(namespace),
      key,
      rawData,
    )
  }

  public async trySet(namespace: string, key: string, rawData: string) {
    await this.redisService.redis.hsetnx(
      this.prefix.storage(namespace),
      key,
      rawData,
    )
  }
}
