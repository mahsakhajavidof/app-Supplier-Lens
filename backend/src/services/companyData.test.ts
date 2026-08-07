import assert from "node:assert/strict";
import test from "node:test";
import { freshSingletonDb } from "./testSupport/testDb.js";

await freshSingletonDb("test-companydata-client");
const { isConfigured, getCompanyDataStatus, fetchFinancials } = await import("./companyData.js");
const { RegistryProviderError } = await import("./registryProviders/types.js");
const { getCompanyDataUsage } = await import("./companyDataUsage.js");

function withApiKey<T>(key: string | undefined, fn: () => Promise<T>): Promise<T> {
  const original = process.env.COMPANYDATA_DK_API_KEY;
  if (key === undefined) delete process.env.COMPANYDATA_DK_API_KEY;
  else process.env.COMPANYDATA_DK_API_KEY = key;
  return fn().finally(() => {
    if (original === undefined) delete process.env.COMPANYDATA_DK_API_KEY;
    else process.env.COMPANYDATA_DK_API_KEY = original;
  });
}

test("getCompanyDataStatus reports the exact safe shape, with no key value ever exposed", async () => {
  await withApiKey(undefined, async () => {
    assert.deepEqual(getCompanyDataStatus(), { country: "DK", basicLookupConfigured: true, financialEnrichmentConfigured: false });
    assert.equal(isConfigured(), false);
  });
  await withApiKey("secret-test-key-123", async () => {
    const status = getCompanyDataStatus();
    assert.deepEqual(status, { country: "DK", basicLookupConfigured: true, financialEnrichmentConfigured: true });
    assert.ok(!JSON.stringify(status).includes("secret-test-key-123"));
  });
});

test("a missing key throws 400 without ever calling the network or recording a call", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return Response.json({});
  };
  try {
    await withApiKey(undefined, async () => {
      await assert.rejects(
        () => fetchFinancials("24256790"),
        (err: unknown) => err instanceof RegistryProviderError && err.status === 400
      );
    });
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("401/403 are reported as the API rejecting the key, never leaking the key itself", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 401 });
  try {
    await withApiKey("bad-key", async () => {
      await assert.rejects(() => fetchFinancials("24256790"), (err: unknown) => {
        assert.ok(err instanceof RegistryProviderError);
        assert.equal(err.status, 401);
        assert.ok(!err.message.includes("bad-key"));
        return true;
      });
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("404 is reported distinctly from a missing key or a rejected key", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(null, { status: 404 });
  try {
    await withApiKey("a-key", async () => {
      await assert.rejects(
        () => fetchFinancials("24256790"),
        (err: unknown) => err instanceof RegistryProviderError && err.status === 404
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("429 surfaces the Retry-After header without retrying automatically", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = async () => {
    callCount++;
    return new Response(null, { status: 429, headers: { "retry-after": "60" } });
  };
  try {
    await withApiKey("a-key", async () => {
      await assert.rejects(
        () => fetchFinancials("24256790"),
        (err: unknown) => err instanceof RegistryProviderError && err.status === 429 && err.message.includes("60")
      );
    });
    assert.equal(callCount, 1, "a rate limit must never trigger an automatic retry loop");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a network failure is reported as a distinct error, never as an empty result", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("getaddrinfo ENOTFOUND api.companydata.dk");
  };
  try {
    await withApiKey("a-key", async () => {
      await assert.rejects(
        () => fetchFinancials("24256790"),
        (err: unknown) => err instanceof RegistryProviderError && /ENOTFOUND/.test(err.message)
      );
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a successful call is counted against the monthly quota", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json([{ year: 2025, revenue: 100, result: 10 }]);
  try {
    const before = await getCompanyDataUsage();
    await withApiKey("a-key", () => fetchFinancials("24256790"));
    const after = await getCompanyDataUsage();
    assert.equal(after.callCount, before.callCount + 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("a successful call returns both the normalized data and the untouched raw response", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json([{ year: 2025, revenue: 100, result: 10 }]);
  try {
    const result = await withApiKey("a-key", () => fetchFinancials("24256790"));
    assert.deepEqual(result.financials, [
      { year: 2025, currency: undefined, operatingRevenue: 100, operatingResult: 10, resultBeforeTax: undefined, equityRatio: undefined, liquidityRatio: undefined, employees: undefined },
    ]);
    assert.deepEqual(result.raw, [{ year: 2025, revenue: 100, result: 10 }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
