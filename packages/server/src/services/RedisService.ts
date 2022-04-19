import IORedis from 'ioredis'

export class RedisService {
  static instance: RedisService
  protected _redis: IORedis.Redis

  constructor() {
    this._redis = new IORedis(6379, process.env.REDIS_HOST!, {
      keyPrefix: "rState:"
    })
  }

  get redis() {
    return this._redis
  }

}
