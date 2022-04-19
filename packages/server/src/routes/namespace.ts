import { Router } from "express";
import asyncHandler from 'express-async-handler'
import { z } from "zod";
import { validateRequest } from "zod-express-middleware";
import Context from "../context";
import { NamespaceRole, useAuth } from "../services/ACLService";

const router = Router()

const viewRouter = Router()

viewRouter.use(useAuth(NamespaceRole.Modifier))
viewRouter.get("/:namespace", asyncHandler(async (req, res) => {
  const { namespace } = req.params
  const { storageService } = Context.get(req)!
  res.status(200).json({ keys: await storageService.getNamespaceKeys(namespace) })
}))

viewRouter.get('/:namespace/keys/:key', asyncHandler(async (req, res) => {
  const { namespace, key } = req.params
  const { storageService } = Context.get(req)!

  res.status(200).json(await storageService.getOrUndefined(namespace, key))
}))

const opRouter = Router()
opRouter.use(useAuth(NamespaceRole.Modifier))

opRouter.get("/:namespace/auth", async (req, res) => {
  const data = await Context.get(req)!.aclService.fetchAuths(req.params.namespace)

  res.status(200).json({
    code: 0,
    msg: "success",
    data,
  })
})

opRouter.patch("/:namespace/auth",
  validateRequest({
    params: z.object({
      namespace: z.string(),
    }),
    body: z.array(z.object({
      role: z.nativeEnum(NamespaceRole),
      token: z.string(),
    }))
  }),
  asyncHandler(async (req, res) => {
    const { aclService } = Context.get(req)!
    const { namespace } = req.params

    await aclService.setRoles(namespace, req.body.map(item => [item.token, item.role]))

    res.status(200).json({
      code: 0,
      msg: "success",
    })
  })
)

opRouter.delete("/:namespace/auth",
  validateRequest({
    params: z.object({
      namespace: z.string(),
    }),
    body: z.array(z.string()),
  }),
  asyncHandler(async (req, res) => {
    const { aclService } = Context.get(req)!

    await aclService.revokeAuths(req.params.namespace, req.body)
    res.status(204)
  })
)

router.use(viewRouter)
router.use(opRouter)

export default router
