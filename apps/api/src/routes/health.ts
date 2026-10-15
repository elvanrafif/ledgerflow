import { Router } from "express";

export function healthRouter(checkDatabase: () => Promise<void>) {
  const router = Router();

  router.get("/health", async (_req, res) => {
    try {
      await checkDatabase();
      res.status(200).json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    }
  });

  return router;
}
