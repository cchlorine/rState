import { asClass, createContainer, InjectionMode, Lifetime } from "awilix"
import { ACLService } from "./services/ACLService"
import { RedisService } from "./services/RedisService"
import { StorageService } from "./services/StorageService"

export interface ICradle {
  redisService: RedisService
  storageService: StorageService
  aclService: ACLService
}

export function configureContainer() {
  return createContainer<ICradle>({
    injectionMode: InjectionMode.PROXY,
  }).register({
    redisService: asClass(RedisService).setLifetime(Lifetime.SINGLETON),
    storageService: asClass(StorageService),
    aclService: asClass(ACLService),
  })
}

export const container = configureContainer()
container.resolve("redisService")
