import { z } from "zod";

// A subset of NormalizedCompanyRecord the frontend may attach when it already
// ran a registry lookup for this org/country before submitting the form —
// see GET /api/registry/lookup/:country/:orgNr. Storing it as the first
// registrySnapshot means the next sync diffs against real data instead of
// reporting every field as "changed" on first run.
export const registryDataSchema = z.object({
  name: z.string(),
  legalForm: z.string().optional(),
  companyStatus: z.string().optional(),
  registeredOn: z.string().optional(),
  industryCode: z.string().optional(),
  employees: z.number().optional(),
  municipality: z.string().optional(),
  vatRegistered: z.boolean().optional(),
  address: z.string().optional(),
  postalAddress: z.string().optional(),
});

export const createSubcontractorSchema = z.object({
  company: z.string().min(1),
  orgNr: z.string().min(1),
  country: z.string().length(2),
  category: z.string().min(1),
  ownerId: z.string().optional(),
  registryData: registryDataSchema.optional(),
});

export const reassignOwnerSchema = z.object({ ownerId: z.string().min(1) });
