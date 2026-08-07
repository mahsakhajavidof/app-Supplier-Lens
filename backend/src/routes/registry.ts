import { Router } from "express";
import { getProvider, listProviders } from "../services/registryProviders/index.js";
import { RegistryProviderError } from "../services/registryProviders/types.js";

export const registryRouter = Router();

registryRouter.get("/providers", (_req, res) => {
  res.json(listProviders());
});

// GET /api/registry/search/:country?q=
// As-you-type suggestions while filling in the "Add subcontractor" form —
// distinct from /lookup, which fetches one exact record for the sync/create
// flow. Returns an empty list (not an error) for an unconfigured provider or
// too-short a query, since this is meant to fail quietly as the user types.
registryRouter.get("/search/:country", async (req, res, next) => {
  try {
    const provider = getProvider(req.params.country);
    const q = typeof req.query.q === "string" ? req.query.q : "";
    if (!provider || q.trim().length < 2) {
      res.json([]);
      return;
    }
    if (!provider.isConfigured()) {
      res.status(400).json({ error: `${provider.registryName} is not configured (missing API key)` });
      return;
    }
    const results = await provider.search(q);
    res.json(results);
  } catch (err) {
    if (err instanceof RegistryProviderError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});

// GET /api/registry/lookup/:country/:orgNr
// Direct passthrough lookup against a country's registry, without touching
// the database. Handy for "add a new subcontractor" flows where you want to
// pull in registered details before creating the record.
registryRouter.get("/lookup/:country/:orgNr", async (req, res, next) => {
  try {
    const provider = getProvider(req.params.country);
    if (!provider) {
      res.status(400).json({ error: `No registry provider for country "${req.params.country}"` });
      return;
    }
    if (!provider.isConfigured()) {
      res.status(400).json({ error: `${provider.registryName} is not configured (missing API key)` });
      return;
    }
    const record = await provider.lookup(req.params.orgNr);
    res.json(record);
  } catch (err) {
    if (err instanceof RegistryProviderError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    next(err);
  }
});
