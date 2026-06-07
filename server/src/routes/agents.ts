import { Router } from "express";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/requireAuth";

const agentsRouter = Router();

agentsRouter.use(requireAuth);

agentsRouter.get("/", async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  res.json({ agents });
});

export default agentsRouter;
