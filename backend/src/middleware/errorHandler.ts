import type { ErrorRequestHandler } from "express";
import { RegistryProviderError } from "../services/registryProviders/types.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof RegistryProviderError) {
    res.status(502).json({ error: err.message });
    return;
  }
  console.error(err);
  const message = err instanceof Error ? err.message : "Unexpected server error";
  res.status(500).json({ error: message });
};
