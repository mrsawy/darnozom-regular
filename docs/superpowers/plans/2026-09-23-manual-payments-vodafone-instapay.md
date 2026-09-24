# Manual Payments (Vodafone Cash + InstaPay) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let buyers pay by Vodafone Cash or InstaPay manual transfer (proof sent over WhatsApp), with payment details editable in both dashboards and payment confirmable from either Medusa Admin ("Mark as paid") or the storefront admin ("Confirm payment").

**Architecture:** Medusa is the source of truth: two manual payment providers (enabled per region), a `manualPayment` module holding the display settings, and a `payment.captured` subscriber that pushes "paid" to Express. Express keeps owning order creation and digital access; it gains the two payment methods, an idempotent `markOrderPaid()`, a Medusa-first confirm endpoint, and a settings proxy for the storefront admin. The storefront adds two checkout options and a payment-instructions page with a WhatsApp deep link.

**Tech Stack:** Medusa 2.21 (modules, providers, subscribers, admin SDK + `@medusajs/ui`), Express + Drizzle (Postgres), React + Vite + wouter (client), Vitest everywhere (+ supertest for Express, Testing Library for client), pnpm workspace.

**Spec:** `docs/superpowers/specs/2026-09-23-manual-payments-vodafone-instapay-design.md`

## Global Constraints

- Method codes: Express/Medusa-metadata values are exactly `vodafone_cash` and `instapay`; Medusa provider identifiers/ids are exactly `vodafone-cash` and `instapay` (region ids `pp_vodafone-cash_vodafone-cash`, `pp_instapay_instapay`).
- Medusa module key: `manualPayment`; model `manual_payment_method`.
- Both methods: allowed for digital and paper carts; **EGP only**; created with `paymentStatus: "pending"`.
- Never add the two methods to the checkout dedupe list (`inArray(orders.paymentMethod, ["paypal","card","wallet"])`) or to `expireStalePendingOrders`.
- Proof of payment is never uploaded/stored — WhatsApp only.
- Medusa → Express auth: `Authorization: Bearer ${BETTER_AUTH_BRIDGE_SECRET}` (fallback `ADMIN_SOCKET_NOTIFY_SECRET`), base URL `DARNOZOM_API_URL || VITE_API_PROXY_TARGET || http://127.0.0.1:8087`.
- Express → Medusa auth: existing `medusaAdmin()` / `medusaAdminAuthHeader()` (`MEDUSA_ADMIN_API_KEY`, `MEDUSA_BACKEND_URL`).
- Storefront confirm is Medusa-first: if Medusa fails, respond 502 and change nothing locally.
- No new env vars.
- Commit only when the user has asked for commits in this session; otherwise leave changes staged-ready and list them at the end of each task.

## Review Focus

1. **Double confirmation** (admin clicks Confirm in storefront admin, which calls Medusa mark-as-paid, which fires the subscriber back into Express) → buyer receives exactly one paid/receipt email. Pinned in Task 8 (`markOrderPaid` second call no-op) and Task 10 (confirm then internal callback).
2. **Guest reopens the instructions page from the email in a new browser** (no sessionStorage) → the email link carries `&email=` and the page passes it through; the endpoint accepts it. Pinned in Task 9 (email link) and Task 10 (guest summary with `?email=`).
3. **WhatsApp number typed in local format** (`010 1234 5678`, `+20 10…`, `0020…`) → `wa.me` link uses `201012345678`. Pinned in Task 12 (`toWhatsAppDigits` tests).
4. **Settings not configured yet** (method enabled on region but number/QR empty) → instructions page shows a "contact us" fallback instead of blank values. Pinned in Task 12 (page render test).
5. **Confirm on an order whose Medusa mirror failed** (`medusaOrderId` null and lookup finds nothing) → 502 with a clear error; order stays pending. Pinned in Task 10.

---

## File Structure

**Medusa (`apps/medusa`)**
- Create `src/lib/manual-transfer-provider.ts` — shared `AbstractPaymentProvider` behavior for manual transfers.
- Create `src/modules/vodafone-cash/{index,service,service.test}.ts`, `src/modules/instapay/{index,service,service.test}.ts`.
- Modify `medusa-config.ts` — register providers + `manualPayment` module.
- Modify `src/lib/region-payment-methods.ts` (+ test).
- Create `src/modules/manual-payment/{index.ts,service.ts,service.test.ts,validation.ts,validation.test.ts,models/manual-payment-method.ts,migrations/*}`.
- Create `src/api/admin/manual-payment-methods/route.ts`, `src/api/admin/manual-payment-methods/[code]/route.ts`, `src/api/store/manual-payment-methods/route.ts` (+ tests).
- Create `src/admin/routes/settings/manual-payments/page.tsx`.
- Create `src/lib/express-internal.ts` (+ test); modify `src/subscribers/order-placed.ts` to use it.
- Create `src/subscribers/manual-payment-captured.ts` (+ test).

**DB (`packages/db`)**
- Modify `src/schema/orders.ts` — enum values + `medusaOrderId`.

**Express (`apps/api`)**
- Create `src/lib/payments/manualPayments.ts` (+ test) — method helpers + `markOrderPaid`.
- Create `src/lib/bridge-secret.ts` (+ test).
- Modify `src/lib/email/email.ts` — labels + `sendManualPaymentInstructions`.
- Modify `src/lib/email/orderPaidNotifications.ts` — admin notification for new methods.
- Modify `src/routes/orders/index.ts` — accept methods, save `medusaOrderId`, manual branch, export `canAccessOrder`.
- Create `src/routes/orders/manual-payments.ts` (+ `manual-payments.test.ts`).
- Create `src/routes/admin/manual-payment-settings.ts` (+ test).
- Modify `src/routes/index.ts` — mount the two routers.
- Test: `src/routes/orders/manual-order.test.ts`.

**Client (`apps/client`)**
- Modify `src/lib/medusa-client.ts` — types, mapping, `fetchManualPaymentMethods`.
- Create `src/lib/manual-payments.ts` (+ test) — shared types, labels, WhatsApp helpers.
- Modify `src/pages/checkout.tsx`, `src/pages/account.tsx`, `src/App.tsx`.
- Create `src/pages/checkout-manual.tsx` (+ test).
- Create `src/pages/admin/store/manual-payments.tsx`; modify `src/pages/admin/store/orders.tsx`, `src/pages/admin/layout.tsx`.

---

### Task 1: Medusa manual-transfer payment providers

**Files:**
- Create: `apps/medusa/src/lib/manual-transfer-provider.ts`
- Create: `apps/medusa/src/modules/vodafone-cash/index.ts`, `service.ts`, `service.test.ts`
- Create: `apps/medusa/src/modules/instapay/index.ts`, `service.ts`, `service.test.ts`
- Modify: `apps/medusa/medusa-config.ts` (payment providers array)

**Interfaces:**
- Produces: providers with `static identifier` `"vodafone-cash"` / `"instapay"`, registered with ids of the same name.

- [ ] **Step 1: Write the failing tests**

`apps/medusa/src/modules/vodafone-cash/service.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import VodafoneCashProviderService from "./service";

describe("VodafoneCashProviderService", () => {
  const service = new VodafoneCashProviderService({} as any, {});

  it("has the vodafone-cash identifier", () => {
    expect(VodafoneCashProviderService.identifier).toBe("vodafone-cash");
  });

  it("initiatePayment returns an id and empty data", async () => {
    const result = await service.initiatePayment({ amount: 25000, currency_code: "egp" } as any);
    expect(result).toEqual({ data: {}, id: expect.any(String) });
  });

  it("authorizePayment leaves the payment pending verification", async () => {
    const result = await service.authorizePayment({ data: { a: 1 } } as any);
    expect(result).toEqual({ data: { a: 1 }, status: "pending" });
  });

  it("getPaymentStatus is pending", async () => {
    expect((await service.getPaymentStatus({ data: {} } as any)).status).toBe("pending");
  });

  it("capturePayment passes data through", async () => {
    expect(await service.capturePayment({ data: { x: 1 } } as any)).toEqual({ data: { x: 1 } });
  });

  it("refunds are manual", async () => {
    await expect(service.refundPayment({ data: {}, amount: 1 } as any)).rejects.toThrow(
      /Vodafone Cash refunds must be processed manually/,
    );
  });

  it("does not support webhooks", async () => {
    expect(await service.getWebhookActionAndData({} as any)).toEqual({ action: "not_supported" });
  });
});
```

`apps/medusa/src/modules/instapay/service.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import InstapayProviderService from "./service";

describe("InstapayProviderService", () => {
  const service = new InstapayProviderService({} as any, {});

  it("has the instapay identifier", () => {
    expect(InstapayProviderService.identifier).toBe("instapay");
  });

  it("authorizePayment leaves the payment pending verification", async () => {
    const result = await service.authorizePayment({ data: {} } as any);
    expect(result.status).toBe("pending");
  });

  it("refunds are manual", async () => {
    await expect(service.refundPayment({ data: {}, amount: 1 } as any)).rejects.toThrow(
      /InstaPay refunds must be processed manually/,
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter medusa exec vitest run src/modules/vodafone-cash src/modules/instapay`
Expected: FAIL — cannot resolve `./service`.

- [ ] **Step 3: Implement**

`apps/medusa/src/lib/manual-transfer-provider.ts`:
```ts
import { AbstractPaymentProvider } from "@medusajs/framework/utils";
import type {
  InitiatePaymentInput,
  InitiatePaymentOutput,
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  ProviderWebhookPayload,
  WebhookActionResult,
} from "@medusajs/framework/types";
import { randomUUID } from "crypto";

// Manual bank/wallet transfer (Vodafone Cash, InstaPay): the buyer pays
// outside any gateway and sends proof over WhatsApp. The payment stays
// "pending" until staff verify it and press Mark as paid (Medusa) or
// Confirm payment (storefront admin). No webhooks, no automated refunds.
export abstract class ManualTransferProvider extends AbstractPaymentProvider {
  /** Human label used in error messages, e.g. "Vodafone Cash". */
  protected abstract readonly label: string;

  constructor(cradle: Record<string, unknown>, config?: Record<string, unknown>) {
    super(cradle, config);
  }

  async initiatePayment(_input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    return { data: {}, id: randomUUID() };
  }

  async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    return { data: input.data ?? {}, status: "pending" };
  }

  async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return { data: input.data ?? {} };
  }

  async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async refundPayment(_input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    throw new Error(`${this.label} refunds must be processed manually`);
  }

  async getPaymentStatus(_input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return { status: "pending" };
  }

  async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return { data: input.data ?? {} };
  }

  async getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    return { action: "not_supported" };
  }
}
```

`apps/medusa/src/modules/vodafone-cash/service.ts`:
```ts
import { ManualTransferProvider } from "../../lib/manual-transfer-provider";

class VodafoneCashProviderService extends ManualTransferProvider {
  static identifier = "vodafone-cash";
  protected readonly label = "Vodafone Cash";
}

export default VodafoneCashProviderService;
```

`apps/medusa/src/modules/vodafone-cash/index.ts`:
```ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import VodafoneCashProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [VodafoneCashProviderService],
});
```

`apps/medusa/src/modules/instapay/service.ts`:
```ts
import { ManualTransferProvider } from "../../lib/manual-transfer-provider";

class InstapayProviderService extends ManualTransferProvider {
  static identifier = "instapay";
  protected readonly label = "InstaPay";
}

export default InstapayProviderService;
```

`apps/medusa/src/modules/instapay/index.ts`:
```ts
import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import InstapayProviderService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [InstapayProviderService],
});
```

In `apps/medusa/medusa-config.ts`, inside the `Modules.PAYMENT` `providers` array, after the `lemonsqueezy` entry add:
```ts
          {
            resolve: './src/modules/vodafone-cash',
            id: 'vodafone-cash',
          },
          {
            resolve: './src/modules/instapay',
            id: 'instapay',
          },
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter medusa exec vitest run src/modules/vodafone-cash src/modules/instapay src/modules/cod`
Expected: PASS (cod still passes — untouched).

- [ ] **Step 5: Commit** (if commits are authorized)

```bash
git add apps/medusa/src/lib/manual-transfer-provider.ts apps/medusa/src/modules/vodafone-cash apps/medusa/src/modules/instapay apps/medusa/medusa-config.ts
git commit -m "feat(medusa): add Vodafone Cash and InstaPay manual payment providers"
```

---

### Task 2: Map the new provider ids to checkout methods (Medusa + client)

**Files:**
- Modify: `apps/medusa/src/lib/region-payment-methods.ts`
- Test: `apps/medusa/src/lib/region-payment-methods.test.ts`
- Modify: `apps/medusa/src/api/store/available-payment-providers/route.test.ts` (add one case)
- Modify: `apps/client/src/lib/medusa-client.ts` (`StorePaymentMethod`, `checkoutMethodFromRawId`)

**Interfaces:**
- Produces: `CheckoutPaymentMethod` / `StorePaymentMethod` = `"paypal" | "card" | "wallet" | "cash_on_delivery" | "vodafone_cash" | "instapay"`.

- [ ] **Step 1: Write the failing tests**

Append to `apps/medusa/src/lib/region-payment-methods.test.ts`:
```ts
describe("manual transfer providers", () => {
  it("maps vodafone-cash provider ids", () => {
    expect(checkoutMethodFromProviderId("pp_vodafone-cash_vodafone-cash")).toBe("vodafone_cash");
    expect(checkoutMethodFromProviderId("pp_vodafone_cash_vodafone_cash")).toBe("vodafone_cash");
  });

  it("maps instapay provider ids", () => {
    expect(checkoutMethodFromProviderId("pp_instapay_instapay")).toBe("instapay");
  });

  it("does not confuse vodafone-cash with cod or paymob wallet", () => {
    expect(
      checkoutMethodsFromProviderIds([
        "pp_paymob-wallet_paymob-wallet",
        "pp_vodafone-cash_vodafone-cash",
        "pp_cod_cod",
      ]),
    ).toEqual(["wallet", "vodafone_cash", "cash_on_delivery"]);
  });
});
```
(Keep existing imports; add `checkoutMethodFromProviderId, checkoutMethodsFromProviderIds` to the import if not already imported.)

Add to `apps/medusa/src/api/store/available-payment-providers/route.test.ts` a case mirroring its existing digital-only test, with region providers `[{ id: "pp_cod_cod" }, { id: "pp_vodafone-cash_vodafone-cash" }, { id: "pp_instapay_instapay" }]` and all-digital items, asserting:
```ts
expect(res.json).toHaveBeenCalledWith(
  expect.objectContaining({ methods: ["vodafone_cash", "instapay"] }),
);
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter medusa exec vitest run src/lib/region-payment-methods.test.ts src/api/store/available-payment-providers`
Expected: FAIL — received `null` / methods without the new values.

- [ ] **Step 3: Implement**

`apps/medusa/src/lib/region-payment-methods.ts`:
```ts
export type CheckoutPaymentMethod =
  | "paypal"
  | "card"
  | "wallet"
  | "cash_on_delivery"
  | "vodafone_cash"
  | "instapay";

export function checkoutMethodFromProviderId(
  providerId: string,
): CheckoutPaymentMethod | null {
  const id = providerId.toLowerCase();
  // Manual transfers first: "vodafone-cash" must never fall through to the
  // Paymob wallet or COD rules below.
  if (id.includes("vodafone-cash") || id.includes("vodafone_cash")) return "vodafone_cash";
  if (id.includes("instapay")) return "instapay";
  if (id.includes("paymob-wallet") || id.includes("paymob_wallet")) return "wallet";
  if (id.includes("paymob-card") || id.includes("paymob_card")) return "card";
  if (id.includes("paypal")) return "paypal";
  // `pp_cod_cod` — avoid matching unrelated ids that merely contain those letters.
  if (/(^|[_-])cod($|[_-])/.test(id)) return "cash_on_delivery";
  return null;
}
```
(Keep the existing doc comment and `checkoutMethodsFromProviderIds` unchanged.)

`apps/client/src/lib/medusa-client.ts`:
```ts
export type StorePaymentMethod =
  | "paypal"
  | "card"
  | "wallet"
  | "cash_on_delivery"
  | "vodafone_cash"
  | "instapay";
```
and
```ts
function checkoutMethodFromRawId(providerId: string): StorePaymentMethod | null {
  const id = providerId.toLowerCase();
  if (id.includes("vodafone-cash") || id.includes("vodafone_cash")) return "vodafone_cash";
  if (id.includes("instapay")) return "instapay";
  if (id.includes("paymob-wallet")) return "wallet";
  if (id.includes("paymob-card")) return "card";
  if (id.includes("paypal")) return "paypal";
  if (/(^|[_-])cod($|[_-])/.test(id)) return "cash_on_delivery";
  return null;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter medusa exec vitest run src/lib src/api/store/available-payment-providers` then `pnpm --filter @workspace/client exec tsc --noEmit`
Expected: PASS; client typecheck may flag exhaustive label maps — fix any error by adding the two methods to the flagged map with labels "فودافون كاش"/"Vodafone Cash" and "إنستاباي"/"InstaPay".

- [ ] **Step 5: Commit** (if authorized)

```bash
git add apps/medusa/src/lib/region-payment-methods.ts apps/medusa/src/lib/region-payment-methods.test.ts apps/medusa/src/api/store/available-payment-providers/route.test.ts apps/client/src/lib/medusa-client.ts
git commit -m "feat: map Vodafone Cash and InstaPay providers to checkout methods"
```

---

### Task 3: Medusa `manualPayment` settings module

**Files:**
- Create: `apps/medusa/src/modules/manual-payment/models/manual-payment-method.ts`
- Create: `apps/medusa/src/modules/manual-payment/validation.ts`, `validation.test.ts`
- Create: `apps/medusa/src/modules/manual-payment/service.ts`, `service.test.ts`
- Create: `apps/medusa/src/modules/manual-payment/index.ts`
- Create: `apps/medusa/src/modules/manual-payment/migrations/*` (generated)
- Modify: `apps/medusa/medusa-config.ts` (modules array)

**Interfaces:**
- Produces:
  - `MANUAL_PAYMENT_MODULE = "manualPayment"`
  - `MANUAL_PAYMENT_CODES = ["vodafone_cash", "instapay"] as const`, `type ManualPaymentCode`
  - `type ManualPaymentMethodDTO = { id: string; code: ManualPaymentCode; account_number: string | null; account_name: string | null; whatsapp_number: string | null; instapay_address: string | null; qr_image_url: string | null; instructions_ar: string | null; instructions_en: string | null }`
  - `type ManualPaymentPatch = Partial<Omit<ManualPaymentMethodDTO, "id" | "code">>`
  - `isManualPaymentCode(v: unknown): v is ManualPaymentCode`
  - `parseManualPaymentPatch(body: unknown): { ok: true; patch: ManualPaymentPatch } | { ok: false; error: string }`
  - service `listAllMethods(): Promise<ManualPaymentMethodDTO[]>` (always both codes, in `MANUAL_PAYMENT_CODES` order), `upsertMethod(code, patch): Promise<ManualPaymentMethodDTO>`

- [ ] **Step 1: Write the failing tests**

`apps/medusa/src/modules/manual-payment/validation.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isManualPaymentCode, parseManualPaymentPatch } from "./validation";

describe("isManualPaymentCode", () => {
  it("accepts the two codes only", () => {
    expect(isManualPaymentCode("vodafone_cash")).toBe(true);
    expect(isManualPaymentCode("instapay")).toBe(true);
    expect(isManualPaymentCode("cod")).toBe(false);
    expect(isManualPaymentCode(undefined)).toBe(false);
  });
});

describe("parseManualPaymentPatch", () => {
  it("trims strings and turns empty strings into null", () => {
    const r = parseManualPaymentPatch({ account_name: "  Dar Nozom ", instapay_address: "" });
    expect(r).toEqual({ ok: true, patch: { account_name: "Dar Nozom", instapay_address: null } });
  });

  it("accepts local and international phone formats", () => {
    const r = parseManualPaymentPatch({
      account_number: "010 1234-5678",
      whatsapp_number: "+201012345678",
    });
    expect(r).toEqual({
      ok: true,
      patch: { account_number: "010 1234-5678", whatsapp_number: "+201012345678" },
    });
  });

  it("rejects phone numbers without 8-15 digits", () => {
    const r = parseManualPaymentPatch({ whatsapp_number: "12ab" });
    expect(r.ok).toBe(false);
  });

  it("accepts /static paths and http(s) urls for the QR image, rejects others", () => {
    expect(parseManualPaymentPatch({ qr_image_url: "/static/qr.png" }).ok).toBe(true);
    expect(parseManualPaymentPatch({ qr_image_url: "https://cdn.x/qr.png" }).ok).toBe(true);
    expect(parseManualPaymentPatch({ qr_image_url: "javascript:alert(1)" }).ok).toBe(false);
  });

  it("ignores unknown keys (id/code cannot be changed)", () => {
    const r = parseManualPaymentPatch({ id: "x", code: "instapay", account_name: "A" });
    expect(r).toEqual({ ok: true, patch: { account_name: "A" } });
  });

  it("rejects text longer than 2000 chars", () => {
    expect(parseManualPaymentPatch({ instructions_ar: "x".repeat(2001) }).ok).toBe(false);
  });
});
```

`apps/medusa/src/modules/manual-payment/service.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import ManualPaymentModuleService from "./service";

// MedusaService-generated CRUD needs a DB; stub the generated methods on a
// bare instance and test only our composition logic.
function makeService(rows: any[]) {
  const svc = Object.create(ManualPaymentModuleService.prototype) as any;
  svc.listManualPaymentMethods = vi.fn(async (filter: any = {}) =>
    rows.filter((r) => !filter.code || r.code === filter.code),
  );
  svc.createManualPaymentMethods = vi.fn(async (data: any) => {
    const row = { id: `mpm_${data.code}`, ...nullRow(), ...data };
    rows.push(row);
    return row;
  });
  svc.updateManualPaymentMethods = vi.fn(async (data: any) => {
    const row = rows.find((r) => r.id === data.id);
    Object.assign(row, data);
    return row;
  });
  return svc as ManualPaymentModuleService & Record<string, any>;
}

function nullRow() {
  return {
    account_number: null,
    account_name: null,
    whatsapp_number: null,
    instapay_address: null,
    qr_image_url: null,
    instructions_ar: null,
    instructions_en: null,
  };
}

describe("ManualPaymentModuleService", () => {
  it("listAllMethods creates missing rows and returns both codes in order", async () => {
    const svc = makeService([{ id: "mpm_i", code: "instapay", ...nullRow() }]);
    const list = await svc.listAllMethods();
    expect(list.map((m) => m.code)).toEqual(["vodafone_cash", "instapay"]);
    expect(svc.createManualPaymentMethods).toHaveBeenCalledWith({ code: "vodafone_cash" });
  });

  it("upsertMethod updates an existing row", async () => {
    const svc = makeService([{ id: "mpm_v", code: "vodafone_cash", ...nullRow() }]);
    const updated = await svc.upsertMethod("vodafone_cash", { account_number: "01012345678" });
    expect(svc.updateManualPaymentMethods).toHaveBeenCalledWith({
      id: "mpm_v",
      account_number: "01012345678",
    });
    expect(updated.account_number).toBe("01012345678");
  });

  it("upsertMethod creates a row when missing", async () => {
    const svc = makeService([]);
    const created = await svc.upsertMethod("instapay", { instapay_address: "dar@instapay" });
    expect(created.code).toBe("instapay");
    expect(created.instapay_address).toBe("dar@instapay");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter medusa exec vitest run src/modules/manual-payment`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`apps/medusa/src/modules/manual-payment/models/manual-payment-method.ts`:
```ts
import { model } from "@medusajs/framework/utils";

// Display settings for the manual-transfer payment methods (Vodafone Cash,
// InstaPay). One row per `code`. Editable from Medusa Admin (Settings →
// Manual payments) and the storefront admin (proxied through Express).
export const ManualPaymentMethod = model.define("manual_payment_method", {
  id: model.id().primaryKey(),
  code: model.text().unique(),
  account_number: model.text().nullable(),
  account_name: model.text().nullable(),
  whatsapp_number: model.text().nullable(),
  instapay_address: model.text().nullable(),
  qr_image_url: model.text().nullable(),
  instructions_ar: model.text().nullable(),
  instructions_en: model.text().nullable(),
});
```

`apps/medusa/src/modules/manual-payment/validation.ts`:
```ts
export const MANUAL_PAYMENT_CODES = ["vodafone_cash", "instapay"] as const;
export type ManualPaymentCode = (typeof MANUAL_PAYMENT_CODES)[number];

export type ManualPaymentMethodDTO = {
  id: string;
  code: ManualPaymentCode;
  account_number: string | null;
  account_name: string | null;
  whatsapp_number: string | null;
  instapay_address: string | null;
  qr_image_url: string | null;
  instructions_ar: string | null;
  instructions_en: string | null;
};

export type ManualPaymentPatch = Partial<Omit<ManualPaymentMethodDTO, "id" | "code">>;

const TEXT_FIELDS = ["account_name", "instapay_address", "instructions_ar", "instructions_en"] as const;
const PHONE_FIELDS = ["account_number", "whatsapp_number"] as const;
const MAX_LEN = 2000;

export function isManualPaymentCode(v: unknown): v is ManualPaymentCode {
  return typeof v === "string" && (MANUAL_PAYMENT_CODES as readonly string[]).includes(v);
}

function isValidPhone(v: string): boolean {
  if (!/^\+?[\d\s\-()]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

function isValidImageUrl(v: string): boolean {
  if (v.startsWith("/static/")) return true;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function parseManualPaymentPatch(
  body: unknown,
): { ok: true; patch: ManualPaymentPatch } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "Body must be an object" };
  const input = body as Record<string, unknown>;
  const patch: ManualPaymentPatch = {};

  const readString = (key: string): string | null | undefined | Error => {
    if (!(key in input)) return undefined;
    const raw = input[key];
    if (raw === null) return null;
    if (typeof raw !== "string") return new Error(`${key} must be a string`);
    const trimmed = raw.trim();
    if (trimmed.length > MAX_LEN) return new Error(`${key} is too long (max ${MAX_LEN})`);
    return trimmed === "" ? null : trimmed;
  };

  for (const key of TEXT_FIELDS) {
    const v = readString(key);
    if (v instanceof Error) return { ok: false, error: v.message };
    if (v !== undefined) patch[key] = v;
  }
  for (const key of PHONE_FIELDS) {
    const v = readString(key);
    if (v instanceof Error) return { ok: false, error: v.message };
    if (v !== undefined) {
      if (v !== null && !isValidPhone(v)) return { ok: false, error: `${key} is not a valid phone number` };
      patch[key] = v;
    }
  }
  const qr = readString("qr_image_url");
  if (qr instanceof Error) return { ok: false, error: qr.message };
  if (qr !== undefined) {
    if (qr !== null && !isValidImageUrl(qr)) return { ok: false, error: "qr_image_url must be an http(s) URL or /static/ path" };
    patch.qr_image_url = qr;
  }
  return { ok: true, patch };
}
```

`apps/medusa/src/modules/manual-payment/service.ts`:
```ts
import { MedusaService } from "@medusajs/framework/utils";
import { ManualPaymentMethod } from "./models/manual-payment-method";
import {
  MANUAL_PAYMENT_CODES,
  type ManualPaymentCode,
  type ManualPaymentMethodDTO,
  type ManualPaymentPatch,
} from "./validation";

// Generated CRUD (pluralized from "ManualPaymentMethod"):
// listManualPaymentMethods / createManualPaymentMethods / updateManualPaymentMethods.
class ManualPaymentModuleService extends MedusaService({ ManualPaymentMethod }) {
  async listAllMethods(): Promise<ManualPaymentMethodDTO[]> {
    const rows = (await this.listManualPaymentMethods({})) as ManualPaymentMethodDTO[];
    const out: ManualPaymentMethodDTO[] = [];
    for (const code of MANUAL_PAYMENT_CODES) {
      const existing = rows.find((r) => r.code === code);
      out.push(
        existing ??
          ((await this.createManualPaymentMethods({ code })) as ManualPaymentMethodDTO),
      );
    }
    return out;
  }

  async upsertMethod(
    code: ManualPaymentCode,
    patch: ManualPaymentPatch,
  ): Promise<ManualPaymentMethodDTO> {
    const [existing] = (await this.listManualPaymentMethods({ code })) as ManualPaymentMethodDTO[];
    if (existing) {
      return (await this.updateManualPaymentMethods({
        id: existing.id,
        ...patch,
      })) as ManualPaymentMethodDTO;
    }
    return (await this.createManualPaymentMethods({ code, ...patch })) as ManualPaymentMethodDTO;
  }
}

export default ManualPaymentModuleService;
```

`apps/medusa/src/modules/manual-payment/index.ts`:
```ts
import { Module } from "@medusajs/framework/utils";
import ManualPaymentModuleService from "./service";

export const MANUAL_PAYMENT_MODULE = "manualPayment";

export default Module(MANUAL_PAYMENT_MODULE, {
  service: ManualPaymentModuleService,
});

export * from "./validation";
```

In `apps/medusa/medusa-config.ts` `modules` array, after the `city-shipping` entry add:
```ts
    {
      resolve: './src/modules/manual-payment',
    },
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter medusa exec vitest run src/modules/manual-payment`
Expected: PASS.

- [ ] **Step 5: Generate and apply the migration**

Run (from `apps/medusa`, with the dev DB up via `pnpm dev:db` and `apps/medusa/.env` present):
```bash
npx medusa db:generate manualPayment
npx medusa db:migrate
```
Expected: a new `src/modules/manual-payment/migrations/Migration<timestamp>.ts` + `.snapshot-manual-payment.json` creating table `manual_payment_method` with a unique index on `code`; migrate reports it applied.

- [ ] **Step 6: Commit** (if authorized)

```bash
git add apps/medusa/src/modules/manual-payment apps/medusa/medusa-config.ts
git commit -m "feat(medusa): add manualPayment settings module"
```

---

### Task 4: Medusa admin + store API routes for the settings

**Files:**
- Create: `apps/medusa/src/api/admin/manual-payment-methods/route.ts`, `route.test.ts`
- Create: `apps/medusa/src/api/admin/manual-payment-methods/[code]/route.ts`, `route.test.ts`
- Create: `apps/medusa/src/api/store/manual-payment-methods/route.ts`, `route.test.ts`

**Interfaces:**
- Consumes: Task 3 service + validation.
- Produces (HTTP):
  - `GET /admin/manual-payment-methods` → `200 { methods: ManualPaymentMethodDTO[] }`
  - `POST /admin/manual-payment-methods/:code` → `200 { method }` | `400 { error }`
  - `GET /store/manual-payment-methods` → `200 { methods: Omit<ManualPaymentMethodDTO,"id">[] }`

- [ ] **Step 1: Write the failing tests**

`apps/medusa/src/api/admin/manual-payment-methods/route.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("GET /admin/manual-payment-methods", () => {
  it("returns all methods from listAllMethods", async () => {
    const methods = [{ id: "a", code: "vodafone_cash" }, { id: "b", code: "instapay" }];
    const listAllMethods = vi.fn().mockResolvedValue(methods);
    const res = fakeRes();
    await GET({ scope: { resolve: () => ({ listAllMethods }) } } as any, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ methods });
  });
});
```

`apps/medusa/src/api/admin/manual-payment-methods/[code]/route.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";

function fakeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function fakeReq(code: string, body: unknown, upsertMethod = vi.fn()) {
  return { params: { code }, body, scope: { resolve: () => ({ upsertMethod }) } } as any;
}

describe("POST /admin/manual-payment-methods/:code", () => {
  it("upserts a valid patch", async () => {
    const upsertMethod = vi.fn().mockResolvedValue({ id: "a", code: "vodafone_cash", account_number: "01012345678" });
    const res = fakeRes();
    await POST(fakeReq("vodafone_cash", { account_number: "01012345678" }, upsertMethod), res);
    expect(upsertMethod).toHaveBeenCalledWith("vodafone_cash", { account_number: "01012345678" });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects an unknown code", async () => {
    const upsertMethod = vi.fn();
    const res = fakeRes();
    await POST(fakeReq("cod", {}, upsertMethod), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(upsertMethod).not.toHaveBeenCalled();
  });

  it("rejects an invalid patch", async () => {
    const upsertMethod = vi.fn();
    const res = fakeRes();
    await POST(fakeReq("instapay", { qr_image_url: "ftp://x" }, upsertMethod), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(upsertMethod).not.toHaveBeenCalled();
  });
});
```

`apps/medusa/src/api/store/manual-payment-methods/route.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { GET } from "./route";

describe("GET /store/manual-payment-methods", () => {
  it("returns methods without internal ids", async () => {
    const listAllMethods = vi.fn().mockResolvedValue([
      { id: "a", code: "instapay", instapay_address: "dar@instapay", created_at: "x" },
    ]);
    const res: any = { status: vi.fn(), json: vi.fn() };
    res.status.mockReturnValue(res);
    await GET({ scope: { resolve: () => ({ listAllMethods }) } } as any, res);
    const body = res.json.mock.calls[0][0];
    expect(body.methods[0]).toEqual(expect.objectContaining({ code: "instapay", instapay_address: "dar@instapay" }));
    expect(body.methods[0]).not.toHaveProperty("id");
    expect(body.methods[0]).not.toHaveProperty("created_at");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter medusa exec vitest run src/api/admin/manual-payment-methods src/api/store/manual-payment-methods`
Expected: FAIL — routes missing.

- [ ] **Step 3: Implement**

`apps/medusa/src/api/admin/manual-payment-methods/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MANUAL_PAYMENT_MODULE } from "../../../modules/manual-payment";
import type ManualPaymentModuleService from "../../../modules/manual-payment/service";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ManualPaymentModuleService>(MANUAL_PAYMENT_MODULE);
  const methods = await service.listAllMethods();
  res.status(200).json({ methods });
}
```

`apps/medusa/src/api/admin/manual-payment-methods/[code]/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  MANUAL_PAYMENT_MODULE,
  isManualPaymentCode,
  parseManualPaymentPatch,
} from "../../../../modules/manual-payment";
import type ManualPaymentModuleService from "../../../../modules/manual-payment/service";

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { code } = req.params;
  if (!isManualPaymentCode(code)) {
    return res.status(400).json({ error: `Unknown manual payment method: ${code}` });
  }
  const parsed = parseManualPaymentPatch(req.body);
  if (!parsed.ok) {
    return res.status(400).json({ error: parsed.error });
  }
  const service = req.scope.resolve<ManualPaymentModuleService>(MANUAL_PAYMENT_MODULE);
  const method = await service.upsertMethod(code, parsed.patch);
  return res.status(200).json({ method });
}
```

`apps/medusa/src/api/store/manual-payment-methods/route.ts`:
```ts
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MANUAL_PAYMENT_MODULE } from "../../../modules/manual-payment";
import type ManualPaymentModuleService from "../../../modules/manual-payment/service";

const PUBLIC_FIELDS = [
  "code",
  "account_number",
  "account_name",
  "whatsapp_number",
  "instapay_address",
  "qr_image_url",
  "instructions_ar",
  "instructions_en",
] as const;

// Public display data for the checkout instructions page. Store routes
// already require the publishable API key.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<ManualPaymentModuleService>(MANUAL_PAYMENT_MODULE);
  const rows = await service.listAllMethods();
  const methods = rows.map((row) =>
    Object.fromEntries(PUBLIC_FIELDS.map((k) => [k, (row as any)[k] ?? null])),
  );
  res.status(200).json({ methods });
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter medusa exec vitest run src/api`
Expected: PASS.

- [ ] **Step 5: Commit** (if authorized)

```bash
git add apps/medusa/src/api/admin/manual-payment-methods apps/medusa/src/api/store/manual-payment-methods
git commit -m "feat(medusa): admin and store routes for manual payment settings"
```

---

### Task 5: Medusa Admin "Manual payments" settings page

**Files:**
- Create: `apps/medusa/src/admin/routes/settings/manual-payments/page.tsx`

**Interfaces:**
- Consumes: `GET /admin/manual-payment-methods`, `POST /admin/manual-payment-methods/:code` (Task 4), Medusa built-in `POST /admin/uploads` (multipart field `files`, response `{ files: [{ id, url }] }`).

No unit test (the repo has no admin-UI tests); verified by build + manual check.

- [ ] **Step 1: Implement**

```tsx
import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Button, Container, Heading, Input, Label, Text, Textarea, toast } from "@medusajs/ui";
import { useEffect, useState } from "react";

type Code = "vodafone_cash" | "instapay";
interface Method {
  id: string;
  code: Code;
  account_number: string | null;
  account_name: string | null;
  whatsapp_number: string | null;
  instapay_address: string | null;
  qr_image_url: string | null;
  instructions_ar: string | null;
  instructions_en: string | null;
}

const TITLES: Record<Code, string> = {
  vodafone_cash: "Vodafone Cash",
  instapay: "InstaPay",
};

const FIELDS: Array<{ key: keyof Method; label: string; codes: Code[]; multiline?: boolean }> = [
  { key: "account_number", label: "Wallet / account number", codes: ["vodafone_cash", "instapay"] },
  { key: "account_name", label: "Account holder name", codes: ["vodafone_cash", "instapay"] },
  { key: "whatsapp_number", label: "WhatsApp confirmation number", codes: ["vodafone_cash", "instapay"] },
  { key: "instapay_address", label: "InstaPay address (e.g. name@instapay)", codes: ["instapay"] },
  { key: "instructions_ar", label: "Instructions (Arabic)", codes: ["vodafone_cash", "instapay"], multiline: true },
  { key: "instructions_en", label: "Instructions (English)", codes: ["vodafone_cash", "instapay"], multiline: true },
];

function MethodCard({ initial }: { initial: Method }) {
  const [form, setForm] = useState<Method>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (key: keyof Method, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const uploadQr = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const res = await fetch("/admin/uploads", { method: "POST", credentials: "include", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      set("qr_image_url", body.files[0].url);
    } catch (e) {
      toast.error("QR upload failed", { description: String(e) });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { id: _id, code, ...patch } = form;
      const res = await fetch(`/admin/manual-payment-methods/${code}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Save failed");
      setForm(body.method);
      toast.success(`${TITLES[code]} saved`);
    } catch (e) {
      toast.error("Save failed", { description: String((e as Error).message) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container className="flex flex-col gap-y-4 p-6">
      <Heading level="h2">{TITLES[form.code]}</Heading>
      {FIELDS.filter((f) => f.codes.includes(form.code)).map((f) => (
        <div key={f.key} className="flex flex-col gap-y-1">
          <Label htmlFor={`${form.code}-${f.key}`}>{f.label}</Label>
          {f.multiline ? (
            <Textarea
              id={`${form.code}-${f.key}`}
              value={(form[f.key] as string | null) ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ) : (
            <Input
              id={`${form.code}-${f.key}`}
              value={(form[f.key] as string | null) ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
        </div>
      ))}
      <div className="flex flex-col gap-y-2">
        <Label>QR code image {form.code === "vodafone_cash" ? "(optional)" : ""}</Label>
        {form.qr_image_url ? (
          <img src={form.qr_image_url} alt="QR" className="h-40 w-40 rounded border object-contain" />
        ) : (
          <Text size="small" className="text-ui-fg-subtle">No QR image uploaded.</Text>
        )}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={uploading}
          onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])}
        />
        {form.qr_image_url && (
          <Button size="small" variant="secondary" onClick={() => set("qr_image_url", "")}>
            Remove QR
          </Button>
        )}
      </div>
      <div className="flex justify-end">
        <Button onClick={save} isLoading={saving}>Save</Button>
      </div>
    </Container>
  );
}

const ManualPaymentsPage = () => {
  const [methods, setMethods] = useState<Method[] | null>(null);

  useEffect(() => {
    fetch("/admin/manual-payment-methods", { credentials: "include" })
      .then((r) => r.json())
      .then((b) => setMethods(b.methods))
      .catch(() => setMethods([]));
  }, []);

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="p-6">
        <Heading level="h1">Manual payments</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Details buyers see when paying by Vodafone Cash or InstaPay. Enable the methods per
          region in Settings → Regions. Confirm a payment with "Mark as paid" on the order.
        </Text>
      </Container>
      {methods === null ? <Text>Loading…</Text> : methods.map((m) => <MethodCard key={m.code} initial={m} />)}
    </div>
  );
};

export const config = defineRouteConfig({
  label: "Manual payments",
});

export default ManualPaymentsPage;
```

- [ ] **Step 2: Build**

Run: `pnpm --filter medusa build`
Expected: build succeeds (admin bundle included).

- [ ] **Step 3: Manual check**

Run `pnpm dev:medusa`, open `http://localhost:9010/app/settings/manual-payments`, fill Vodafone Cash number `01012345678`, upload a PNG for InstaPay, Save both, reload — values persist and the QR preview shows.

- [ ] **Step 4: Commit** (if authorized)

```bash
git add apps/medusa/src/admin/routes/settings/manual-payments
git commit -m "feat(medusa-admin): Manual payments settings page"
```

---

### Task 6: Medusa subscriber — sync "paid" to Express

**Files:**
- Create: `apps/medusa/src/lib/express-internal.ts`, `express-internal.test.ts`
- Modify: `apps/medusa/src/subscribers/order-placed.ts` (use `expressInternalFetch` in `notifyExpressAdminSocket`)
- Create: `apps/medusa/src/subscribers/manual-payment-captured.ts`, `manual-payment-captured.test.ts`

**Interfaces:**
- Produces: `expressInternalFetch(path: string, body: unknown): Promise<Response | null>` — returns `null` when no secret is configured.
- Calls Express `POST /api/internal/orders/:id/mark-paid` (Task 10) with body `{ medusaOrderId }`; expects `200 { ok: true, alreadyPaid: boolean }`, `409` for cancelled orders.

- [ ] **Step 1: Write the failing tests**

`apps/medusa/src/lib/express-internal.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { expressInternalFetch } from "./express-internal";

describe("expressInternalFetch", () => {
  const env = { ...process.env };
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
  });
  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("returns null without a secret", async () => {
    delete process.env.BETTER_AUTH_BRIDGE_SECRET;
    delete process.env.ADMIN_SOCKET_NOTIFY_SECRET;
    expect(await expressInternalFetch("/api/x", {})).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("posts JSON with the bearer secret to DARNOZOM_API_URL", async () => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = "s3cret";
    process.env.DARNOZOM_API_URL = "http://api.test/";
    await expressInternalFetch("/api/internal/orders/5/mark-paid", { a: 1 });
    expect(fetch).toHaveBeenCalledWith("http://api.test/api/internal/orders/5/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer s3cret" },
      body: JSON.stringify({ a: 1 }),
    });
  });
});
```

`apps/medusa/src/subscribers/manual-payment-captured.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.mock("../lib/express-internal", () => ({ expressInternalFetch: fetchMock }));

import handler, { config } from "./manual-payment-captured";

function containerWith(order: any) {
  const graph = vi.fn().mockResolvedValue({
    data: [{ id: "pay_1", payment_collection: order ? { order } : null }],
  });
  const logger = { warn: vi.fn(), error: vi.fn(), info: vi.fn() };
  return {
    graph,
    logger,
    container: {
      resolve: (k: string) => (k === "query" ? { graph } : k === "logger" ? logger : undefined),
    } as any,
  };
}

describe("manual-payment-captured subscriber", () => {
  beforeEach(() => fetchMock.mockReset());

  it("listens to payment.captured", () => {
    expect(config.event).toBe("payment.captured");
  });

  it("looks up the order through the payment and notifies Express", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const { container, graph } = containerWith({
      id: "order_1",
      metadata: { source: "darnozom_storefront", payment_method: "vodafone_cash", darnozom_order_id: 42 },
    });
    await handler({ event: { data: { id: "pay_1" } }, container } as any);
    expect(graph).toHaveBeenCalledWith({
      entity: "payment",
      fields: ["id", "payment_collection.order.id", "payment_collection.order.metadata"],
      filters: { id: "pay_1" },
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/internal/orders/42/mark-paid", {
      medusaOrderId: "order_1",
    });
  });

  it("ignores non-manual methods and non-storefront orders", async () => {
    for (const metadata of [
      { source: "darnozom_storefront", payment_method: "paypal", darnozom_order_id: 1 },
      { payment_method: "instapay", darnozom_order_id: 1 },
      { source: "darnozom_storefront", payment_method: "instapay" },
    ]) {
      const { container } = containerWith({ id: "o", metadata });
      await handler({ event: { data: { id: "pay_1" } }, container } as any);
    }
    const { container } = containerWith(null);
    await handler({ event: { data: { id: "pay_1" } }, container } as any);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws on a 5xx/network failure so the event is retried", async () => {
    fetchMock.mockResolvedValue(new Response("down", { status: 503 }));
    const { container } = containerWith({
      id: "o",
      metadata: { source: "darnozom_storefront", payment_method: "instapay", darnozom_order_id: 7 },
    });
    await expect(handler({ event: { data: { id: "pay_1" } }, container } as any)).rejects.toThrow(/503/);
  });

  it("does not retry a 409 (cancelled order) — logs a warning instead", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 409 }));
    const { container, logger } = containerWith({
      id: "o",
      metadata: { source: "darnozom_storefront", payment_method: "instapay", darnozom_order_id: 7 },
    });
    await handler({ event: { data: { id: "pay_1" } }, container } as any);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("throws when no secret is configured (fetch returns null)", async () => {
    fetchMock.mockResolvedValue(null);
    const { container } = containerWith({
      id: "o",
      metadata: { source: "darnozom_storefront", payment_method: "instapay", darnozom_order_id: 7 },
    });
    await expect(handler({ event: { data: { id: "pay_1" } }, container } as any)).rejects.toThrow(
      /BETTER_AUTH_BRIDGE_SECRET/,
    );
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter medusa exec vitest run src/lib/express-internal.test.ts src/subscribers/manual-payment-captured.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement**

`apps/medusa/src/lib/express-internal.ts`:
```ts
/**
 * Server-to-server POST from Medusa to the Express API's /api/internal/*
 * routes, authenticated with the shared bridge secret. Returns null when no
 * secret is configured (callers decide whether that is fatal).
 */
export async function expressInternalFetch(path: string, body: unknown): Promise<Response | null> {
  const apiBase = (
    process.env.DARNOZOM_API_URL ||
    process.env.VITE_API_PROXY_TARGET ||
    "http://127.0.0.1:8087"
  ).replace(/\/$/, "");
  const secret =
    process.env.BETTER_AUTH_BRIDGE_SECRET?.trim() ||
    process.env.ADMIN_SOCKET_NOTIFY_SECRET?.trim();
  if (!secret) return null;

  return fetch(`${apiBase}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
  });
}
```

In `apps/medusa/src/subscribers/order-placed.ts`, replace the body of `notifyExpressAdminSocket` with:
```ts
  try {
    await expressInternalFetch("/api/internal/admin-notify/order-new", {
      id: payload.id,
      source: "medusa",
      email: payload.email,
      createdAt: payload.createdAt,
      totalAmount: payload.totalAmount,
      currency: payload.currency,
      medusaOrderId: payload.id,
    })
  } catch {
    // Best-effort — polling still covers missed pushes.
  }
```
and add `import { expressInternalFetch } from "../lib/express-internal"` at the top.

`apps/medusa/src/subscribers/manual-payment-captured.ts`:
```ts
import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { expressInternalFetch } from "../lib/express-internal";

const MANUAL_METHODS = new Set(["vodafone_cash", "instapay"]);

type PaymentRow = {
  id: string;
  payment_collection?: {
    order?: { id: string; metadata?: Record<string, unknown> | null } | null;
  } | null;
};

/**
 * Staff confirmed a Vodafone Cash / InstaPay transfer with Medusa's
 * "Mark as paid" (or Express confirmed and mirrored it here). Push "paid"
 * to Express, which owns digital access and the buyer emails. Express is
 * idempotent, so the Express-initiated round trip is a harmless no-op.
 *
 * payment.captured carries only { id: <payment id> } — resolve the order
 * through payment → payment_collection → order.
 */
export default async function manualPaymentCapturedHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const query = container.resolve("query");
  const logger = container.resolve("logger");

  const { data } = await query.graph({
    entity: "payment",
    fields: ["id", "payment_collection.order.id", "payment_collection.order.metadata"],
    filters: { id: event.data.id },
  });
  const order = (data[0] as PaymentRow | undefined)?.payment_collection?.order;
  const meta = order?.metadata ?? {};
  if (
    !order ||
    meta.source !== "darnozom_storefront" ||
    !MANUAL_METHODS.has(String(meta.payment_method)) ||
    meta.darnozom_order_id == null
  ) {
    return;
  }

  const darnozomOrderId = Number(meta.darnozom_order_id);
  const res = await expressInternalFetch(`/api/internal/orders/${darnozomOrderId}/mark-paid`, {
    medusaOrderId: order.id,
  });
  if (!res) {
    throw new Error("BETTER_AUTH_BRIDGE_SECRET is not set — cannot sync manual payment to Express");
  }
  if (res.status === 409) {
    logger.warn(
      `manual payment for cancelled Express order ${darnozomOrderId} (Medusa ${order.id}) not synced`,
    );
    return;
  }
  if (!res.ok) {
    throw new Error(
      `Express mark-paid for order ${darnozomOrderId} failed (${res.status}): ${(await res.text()).slice(0, 200)}`,
    );
  }
}

export const config: SubscriberConfig = {
  event: "payment.captured",
};
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter medusa exec vitest run src/lib src/subscribers`
Expected: PASS (existing `order-placed.test.ts` still passes; if it asserted the exact `fetch` call, update its expectation to the same URL/headers — behavior is unchanged).

- [ ] **Step 5: Commit** (if authorized)

```bash
git add apps/medusa/src/lib/express-internal.ts apps/medusa/src/lib/express-internal.test.ts apps/medusa/src/subscribers/order-placed.ts apps/medusa/src/subscribers/manual-payment-captured.ts apps/medusa/src/subscribers/manual-payment-captured.test.ts
git commit -m "feat(medusa): sync Mark-as-paid on manual payments to Express"
```

---

### Task 7: DB schema — payment methods + `medusaOrderId`

**Files:**
- Modify: `packages/db/src/schema/orders.ts`

**Interfaces:**
- Produces: `Order["paymentMethod"]` includes `"vodafone_cash" | "instapay"`; `Order["medusaOrderId"]: string | null`.

- [ ] **Step 1: Edit the schema**

```ts
export const paymentMethodEnum = pgEnum("payment_method", [
  "paypal",
  "card",
  "wallet",
  "cash_on_delivery",
  "vodafone_cash",
  "instapay",
]);
```
In the `orders` table columns, next to `paymobOrderId`, add:
```ts
  // Id of the mirrored Medusa order (set after syncMedusaOrder succeeds).
  // Lets admin actions reach the Medusa order without scanning recent orders.
  medusaOrderId: varchar("medusa_order_id", { length: 64 }),
```
(Import `varchar` from `drizzle-orm/pg-core` if not already imported.)

- [ ] **Step 2: Push and typecheck**

Run:
```bash
pnpm dev:db
pnpm db:push
pnpm typecheck:packages
```
Expected: drizzle-kit adds two enum values and the `medusa_order_id` column (answer "no" to any rename prompt — this is a new column); typecheck passes.

- [ ] **Step 3: Commit** (if authorized)

```bash
git add packages/db/src/schema/orders.ts
git commit -m "feat(db): add manual payment methods and medusaOrderId to orders"
```

---

### Task 8: Express `markOrderPaid` + email labels

**Files:**
- Create: `apps/api/src/lib/payments/manualPayments.ts`, `manualPayments.test.ts`
- Modify: `apps/api/src/lib/email/email.ts` (paymentMethod unions + label)
- Modify: `apps/api/src/lib/email/orderPaidNotifications.ts` (send admin "complete" for new methods)

**Interfaces:**
- Produces:
  - `MANUAL_PAYMENT_METHODS = ["vodafone_cash", "instapay"] as const`, `type ManualPaymentMethod`
  - `isManualPaymentMethod(m: string | null | undefined): m is ManualPaymentMethod`
  - `type MarkOrderPaidResult = { status: "paid"; order: Order } | { status: "already_paid"; order: Order } | { status: "not_found" } | { status: "not_manual" } | { status: "cancelled" }`
  - `markOrderPaid(orderId: number, opts: { source: "medusa" | "storefront_admin" }): Promise<MarkOrderPaidResult>`

- [ ] **Step 1: Write the failing test** (real DB, same style as `admin-cod-complete.test.ts`)

`apps/api/src/lib/payments/manualPayments.test.ts`:
```ts
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { db, orders, type NewOrder } from "@workspace/db";
import { eq, like } from "drizzle-orm";

const { paidMock } = vi.hoisted(() => ({ paidMock: vi.fn(async () => undefined) }));
vi.mock("../email/orderPaidNotifications", () => ({ sendOrderPaidNotifications: paidMock }));

const { markOrderPaid, isManualPaymentMethod } = await import("./manualPayments");

const PREFIX = "test-manual-paid-";

async function seed(overrides: Partial<NewOrder> = {}) {
  const [row] = await db
    .insert(orders)
    .values({
      userId: `${PREFIX}owner`,
      userEmail: "buyer@example.com",
      fullName: "Manual Buyer",
      phone: "01000000000",
      currency: "EGP",
      itemsCount: 1,
      paymentMethod: "vodafone_cash",
      paymentStatus: "pending",
      totalAmount: "250.00",
      shippingTotal: "0.00",
      ...overrides,
    })
    .returning();
  return row.id;
}

afterEach(async () => {
  paidMock.mockClear();
  await db.delete(orders).where(like(orders.userId, `${PREFIX}%`));
});
afterAll(async () => {
  await db.delete(orders).where(like(orders.userId, `${PREFIX}%`));
});

describe("isManualPaymentMethod", () => {
  it("recognizes only the two manual methods", () => {
    expect(isManualPaymentMethod("vodafone_cash")).toBe(true);
    expect(isManualPaymentMethod("instapay")).toBe(true);
    expect(isManualPaymentMethod("cash_on_delivery")).toBe(false);
    expect(isManualPaymentMethod(null)).toBe(false);
  });
});

describe("markOrderPaid", () => {
  it("marks a pending manual order paid and notifies once", async () => {
    const id = await seed();
    const r = await markOrderPaid(id, { source: "medusa" });
    expect(r.status).toBe("paid");
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    expect(row.paymentStatus).toBe("paid");
    expect(row.paidAt).toBeTruthy();
    expect(paidMock).toHaveBeenCalledOnce();
  });

  it("second call is a no-op (no second email)", async () => {
    const id = await seed({ paymentMethod: "instapay" });
    await markOrderPaid(id, { source: "storefront_admin" });
    const second = await markOrderPaid(id, { source: "medusa" });
    expect(second.status).toBe("already_paid");
    expect(paidMock).toHaveBeenCalledOnce();
  });

  it("rejects non-manual orders", async () => {
    const id = await seed({ paymentMethod: "paypal" });
    expect((await markOrderPaid(id, { source: "medusa" })).status).toBe("not_manual");
    expect(paidMock).not.toHaveBeenCalled();
  });

  it("rejects cancelled orders", async () => {
    const id = await seed({ status: "cancelled" });
    expect((await markOrderPaid(id, { source: "medusa" })).status).toBe("cancelled");
  });

  it("returns not_found for a missing order", async () => {
    expect((await markOrderPaid(999999999, { source: "medusa" })).status).toBe("not_found");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/payments/manualPayments.test.ts` (with `pnpm dev:db` running and Task 7 pushed)
Expected: FAIL — `./manualPayments` not found.

- [ ] **Step 3: Implement**

`apps/api/src/lib/payments/manualPayments.ts`:
```ts
import { db, orders, type Order } from "@workspace/db";
import { and, eq, ne } from "drizzle-orm";
import { sendOrderPaidNotifications } from "../email/orderPaidNotifications";
import { logger } from "../logger";

// Manual transfers (Vodafone Cash, InstaPay): the buyer pays outside any
// gateway and sends proof over WhatsApp; staff confirm from Medusa Admin
// ("Mark as paid", synced here by the manual-payment-captured subscriber) or
// from the storefront admin ("Confirm payment").
export const MANUAL_PAYMENT_METHODS = ["vodafone_cash", "instapay"] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export function isManualPaymentMethod(m: string | null | undefined): m is ManualPaymentMethod {
  return !!m && (MANUAL_PAYMENT_METHODS as readonly string[]).includes(m);
}

export type MarkOrderPaidResult =
  | { status: "paid"; order: Order }
  | { status: "already_paid"; order: Order }
  | { status: "not_found" }
  | { status: "not_manual" }
  | { status: "cancelled" };

/**
 * Idempotently mark a manual-transfer order paid. The conditional update
 * (`paymentStatus <> 'paid'`) guarantees only one caller wins, so the
 * Medusa callback and the storefront confirm can both run without sending
 * the buyer two receipts.
 */
export async function markOrderPaid(
  orderId: number,
  opts: { source: "medusa" | "storefront_admin" },
): Promise<MarkOrderPaidResult> {
  const [existing] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!existing) return { status: "not_found" };
  if (!isManualPaymentMethod(existing.paymentMethod)) return { status: "not_manual" };
  if (existing.paymentStatus === "paid") return { status: "already_paid", order: existing };
  if (existing.status === "cancelled") return { status: "cancelled" };

  const now = new Date();
  const [updated] = await db
    .update(orders)
    .set({ paymentStatus: "paid", paidAt: now, paymentFailureReason: null, updatedAt: now })
    .where(and(eq(orders.id, orderId), ne(orders.paymentStatus, "paid")))
    .returning();

  if (!updated) {
    const [current] = await db.select().from(orders).where(eq(orders.id, orderId));
    return { status: "already_paid", order: current ?? existing };
  }

  logger.info({ orderId, source: opts.source }, "manual payment confirmed");
  await sendOrderPaidNotifications(updated);
  return { status: "paid", order: updated };
}
```

`apps/api/src/lib/email/email.ts`:
- Every `paymentMethod: "paypal" | "card" | "wallet" | "cash_on_delivery"` type in this file becomes `paymentMethod: "paypal" | "card" | "wallet" | "cash_on_delivery" | "vodafone_cash" | "instapay"`.
- Replace the `payLabel` expression in `sendAdminSalesNotification` with:
```ts
  const payLabel =
    params.paymentMethod === "paypal"
      ? "PayPal"
      : params.paymentMethod === "card"
        ? "بطاقة ائتمان / خصم"
        : params.paymentMethod === "wallet"
          ? "محفظة إلكترونية (فودافون كاش / أورنج موني / اتصالات كاش)"
          : params.paymentMethod === "vodafone_cash"
            ? "فودافون كاش (تحويل يدوي)"
            : params.paymentMethod === "instapay"
              ? "إنستاباي (تحويل يدوي)"
              : "الدفع عند الاستلام (COD)";
```

`apps/api/src/lib/email/orderPaidNotifications.ts` — replace the method condition with:
```ts
    if (
      order.paymentMethod === "paypal" ||
      order.paymentMethod === "card" ||
      order.paymentMethod === "wallet" ||
      order.paymentMethod === "cash_on_delivery" ||
      order.paymentMethod === "vodafone_cash" ||
      order.paymentMethod === "instapay"
    ) {
```

- [ ] **Step 4: Run tests + typecheck**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/payments src/routes/orders/receipt-email.test.ts` and `pnpm --filter @workspace/api-server run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit** (if authorized)

```bash
git add apps/api/src/lib/payments/manualPayments.ts apps/api/src/lib/payments/manualPayments.test.ts apps/api/src/lib/email/email.ts apps/api/src/lib/email/orderPaidNotifications.ts
git commit -m "feat(api): idempotent markOrderPaid for manual transfers"
```

---

### Task 9: Express order creation accepts manual methods

**Files:**
- Modify: `apps/api/src/routes/orders/index.ts`
- Modify: `apps/api/src/lib/email/email.ts` (add `sendManualPaymentInstructions`)
- Test: `apps/api/src/routes/orders/manual-order.test.ts`

**Interfaces:**
- Consumes: `isManualPaymentMethod` (Task 8), `syncMedusaOrder` (returns `{ medusaOrderId }`).
- Produces:
  - `apps/api/src/routes/orders/access.ts` exporting `normalizeEmail(raw: unknown): string` and `canAccessOrder(order: Pick<Order, "userId" | "userEmail">, req: AuthRequest, guestEmail?: string | null): boolean` for Task 10.
  - `sendManualPaymentInstructionsHtml(params): string` (pure, tested) and `sendManualPaymentInstructions(params: { to: string; orderId: number; customerName: string; paymentMethod: "vodafone_cash" | "instapay"; totalAmount: string; currency: string }): Promise<{ ok: boolean; error?: string }>`
  - `POST /store/orders` with `paymentMethod: "vodafone_cash" | "instapay"` → `201 { ok: true, id, paymentMethod, paymentStatus: "pending" }`.

- [ ] **Step 1: Write the failing test**

`apps/api/src/routes/orders/manual-order.test.ts` — copy the mock/harness block from `create-order.test.ts` (lines 1–130: hoisted mocks, `@workspace/payment-gateways`, `../../lib/medusa-admin`, auth, admin, object-store mocks, `makeApp`) verbatim, change `TEST_USER_PREFIX` to `"test-manual-order-"`, and additionally mock email + Medusa sync before importing the router:
```ts
const { instructionsMock, syncOrderMock } = vi.hoisted(() => ({
  instructionsMock: vi.fn(async () => ({ ok: true })),
  syncOrderMock: vi.fn(async () => ({ medusaOrderId: "order_medusa_1" })),
}));

vi.mock("../../lib/email/email", async (orig) => ({
  ...(await orig<typeof import("../../lib/email/email")>()),
  sendManualPaymentInstructions: instructionsMock,
  sendAdminSalesNotification: vi.fn(async () => ({ ok: true })),
  sendOrderPlacedConfirmation: vi.fn(async () => ({ ok: true })),
}));

vi.mock("../../lib/medusa-order-sync", () => ({
  syncMedusaOrder: syncOrderMock,
  markMedusaOrderPaidForDarnozomOrder: vi.fn(),
  ensureMedusaOrderPayable: vi.fn(),
  findMedusaOrderIdByDarnozomId: vi.fn(),
}));

vi.mock("../../lib/medusa-customer-sync", () => ({
  syncMedusaCustomer: vi.fn(async () => ({ customerId: null })),
}));
```
Reuse `create-order.test.ts`'s `seedBook` helper (legacy numeric book with a digital format + price in EGP) to build the cart. Tests:
```ts
describe("POST /store/orders — manual transfers", () => {
  for (const method of ["vodafone_cash", "instapay"] as const) {
    it(`accepts ${method} for a digital book, pending, and stores medusaOrderId`, async () => {
      const bookId = await seedBook({ price: "250.00", currency: "EGP", digitalFileUrl: "internal://book-pdfs/abc" });
      const res = await request(app)
        .post("/store/orders")
        .set("x-test-user", OWNER)
        .send({
          fullName: "Buyer",
          email: "buyer@example.com",
          phone: "01012345678",
          paymentMethod: method,
          items: [{ productType: "book", productId: bookId, quantity: 1, format: "digital" }],
        });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ ok: true, paymentMethod: method, paymentStatus: "pending" });
      const [row] = await db.select().from(orders).where(eq(orders.id, res.body.id));
      expect(row.paymentStatus).toBe("pending");
      expect(row.medusaOrderId).toBe("order_medusa_1");
      expect(instructionsMock).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: res.body.id, paymentMethod: method, totalAmount: "250.00" }),
      );
    });
  }

  it("rejects non-EGP carts for manual transfers", async () => {
    const bookId = await seedBook({ price: "20.00", currency: "USD", digitalFileUrl: "internal://book-pdfs/x" });
    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Buyer",
        email: "buyer@example.com",
        phone: "01012345678",
        paymentMethod: "instapay",
        items: [{ productType: "book", productId: bookId, quantity: 1, format: "digital" }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/EGP/);
  });

  it("still creates the order when the Medusa mirror fails (medusaOrderId stays null)", async () => {
    syncOrderMock.mockRejectedValueOnce(new Error("medusa down"));
    const bookId = await seedBook({ price: "100.00", currency: "EGP", digitalFileUrl: "internal://book-pdfs/y" });
    const res = await request(app)
      .post("/store/orders")
      .set("x-test-user", OWNER)
      .send({
        fullName: "Buyer",
        email: "buyer@example.com",
        phone: "01012345678",
        paymentMethod: "vodafone_cash",
        items: [{ productType: "book", productId: bookId, quantity: 1, format: "digital" }],
      });
    expect(res.status).toBe(201);
    const [row] = await db.select().from(orders).where(eq(orders.id, res.body.id));
    expect(row.medusaOrderId).toBeNull();
  });
});
```
(If `create-order.test.ts`'s `seedBook` takes a different argument shape, adapt the calls to it — the assertions stay the same. Add `afterEach` cleanup deleting `orderItems`/`orders` for the prefix, exactly as `create-order.test.ts` does.)

Unit test for the email link, appended to the same file:
```ts
describe("sendManualPaymentInstructions", () => {
  it("links to the instructions page with orderId and email", async () => {
    const { sendManualPaymentInstructionsHtml } = await vi.importActual<typeof import("../../lib/email/email")>("../../lib/email/email");
    const html = sendManualPaymentInstructionsHtml({
      orderId: 12, customerName: "A", paymentMethod: "instapay", totalAmount: "250.00", currency: "EGP", to: "a+b@x.com",
    });
    expect(html).toContain("/checkout/manual?orderId=12&amp;email=a%2Bb%40x.com");
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/orders/manual-order.test.ts`
Expected: FAIL — 400 "A valid payment method … is required".

- [ ] **Step 3: Implement**

`apps/api/src/lib/email/email.ts` — add near `sendOrderPlacedConfirmation`:
```ts
type ManualInstructionsParams = {
  to: string;
  orderId: number;
  customerName: string;
  paymentMethod: "vodafone_cash" | "instapay";
  totalAmount: string;
  currency: string;
};

export function sendManualPaymentInstructionsHtml(params: ManualInstructionsParams): string {
  const methodAr = params.paymentMethod === "vodafone_cash" ? "فودافون كاش" : "إنستاباي";
  const proofAr =
    params.paymentMethod === "vodafone_cash"
      ? "أرسل صورة إيصال التحويل على واتساب"
      : "أرسل رمز تأكيد التحويل على واتساب";
  // Carries the email so a guest can reopen the page from another browser.
  const link = `${PLATFORM_URL}/checkout/manual?orderId=${params.orderId}&email=${encodeURIComponent(params.to)}`;
  return `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.8">
  <h2>تم استلام طلبك #${params.orderId}</h2>
  <p>مرحباً ${escapeHtml(params.customerName)}،</p>
  <p>لإتمام الطلب، حوّل مبلغ <strong>${escapeHtml(params.totalAmount)} ${escapeHtml(params.currency)}</strong> عبر <strong>${methodAr}</strong>، ثم ${proofAr}.</p>
  <p><a href="${escapeHtml(link)}">عرض بيانات الدفع</a></p>
  <p>سيتم تفعيل طلبك (والوصول إلى الكتب الرقمية) فور تأكيد الدفع.</p>
</div>`;
}

export async function sendManualPaymentInstructions(
  params: ManualInstructionsParams,
): Promise<{ ok: boolean; error?: string }> {
  return sendEmail({
    to: params.to,
    subject: `أكمل الدفع لطلبك #${params.orderId} | Darnozom Consulting`,
    html: sendManualPaymentInstructionsHtml(params),
  });
}
```
(`escapeHtml` encodes `&` as `&amp;`, which the test expects.)

`apps/api/src/routes/orders/index.ts`:

1. `type PaymentMethod = "paypal" | "card" | "wallet" | "cash_on_delivery" | "vodafone_cash" | "instapay";`
2. Move `normalizeEmail` and `canAccessOrder` (currently module-private near the top of `index.ts`) verbatim into a new file `apps/api/src/routes/orders/access.ts`, exporting both (it needs `import type { Order } from "@workspace/db"` and `import type { AuthRequest } from "../../middlewares/authMiddleware"`), and replace them in `index.ts` with `import { canAccessOrder, normalizeEmail } from "./access";`. This keeps Task 10's router from importing the whole orders router.
3. Add imports:
```ts
import { isManualPaymentMethod } from "../../lib/payments/manualPayments";
```
and add `sendManualPaymentInstructions` to the existing `../../lib/email/email` import list.
4. Replace the payment-method validation with:
```ts
    const paymentMethodRaw = String(body.paymentMethod || "").trim();
    if (
      paymentMethodRaw !== "paypal" &&
      paymentMethodRaw !== "card" &&
      paymentMethodRaw !== "wallet" &&
      paymentMethodRaw !== "cash_on_delivery" &&
      !isManualPaymentMethod(paymentMethodRaw)
    ) {
      return res.status(400).json({
        error:
          "A valid payment method (paypal, card, wallet, cash_on_delivery, vodafone_cash or instapay) is required",
      });
    }
```
5. After the existing `isOnlinePayment && currency !== "EGP"` check, add:
```ts
    // Manual transfers are paid in EGP to an Egyptian wallet / InstaPay account.
    if (isManualPaymentMethod(paymentMethod) && currency !== "EGP") {
      return res.status(400).json({
        error: `Vodafone Cash and InstaPay only support EGP orders (cart is ${currency}).`,
      });
    }
```
6. In the insert, change the `paymentStatus` value and its comment:
```ts
        // COD orders start unpaid; PayPal moves to "pending" once the PayPal
        // order is created below. Manual transfers start "pending" (awaiting
        // staff verification of the WhatsApp proof).
        paymentStatus: isManualPaymentMethod(paymentMethod) ? "pending" : "unpaid",
```
7. Replace the Medusa mirror `try` block so it stores the id:
```ts
    try {
      const { medusaOrderId } = await syncMedusaOrder({
        /* …existing argument object unchanged… */
      });
      await db
        .update(orders)
        .set({ medusaOrderId })
        .where(eq(orders.id, order.id));
    } catch (err) {
      req.log.error({ err, orderId: order.id }, "medusa order sync failed");
    }
```
8. Immediately before `// Cash on delivery: order is placed immediately, awaiting fulfillment.`, add:
```ts
    // Manual transfer (Vodafone Cash / InstaPay): the order is placed and
    // waits for staff to verify the WhatsApp proof. The buyer is sent to the
    // instructions page and emailed a link back to it.
    if (isManualPaymentMethod(paymentMethod)) {
      const grandTotal = (total + shippingTotal).toFixed(2);
      try {
        await sendManualPaymentInstructions({
          to: email,
          orderId: order.id,
          customerName: fullName,
          paymentMethod,
          totalAmount: grandTotal,
          currency,
        });
      } catch (emailErr) {
        req.log.error({ err: emailErr, orderId: order.id }, "manual payment instructions email failed");
      }
      try {
        await sendAdminSalesNotification({
          orderId: order.id,
          stage: "in_progress",
          paymentMethod,
          customerName: fullName,
          customerEmail: email,
          phone,
          currency,
          totalAmount: grandTotal,
          city: shippingCity,
          address,
          items: resolved.map((r) => ({
            productTitle: r.productTitle,
            quantity: r.quantity,
            format: r.format,
          })),
        });
      } catch (emailErr) {
        req.log.error({ err: emailErr, orderId: order.id }, "manual payment admin notification failed");
      }
      return res.status(201).json({
        ok: true,
        id: order.id,
        paymentMethod,
        paymentStatus: "pending",
      });
    }
```
Do **not** touch the dedupe `inArray(orders.paymentMethod, ["paypal", "card", "wallet"])` list.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/orders` and `pnpm --filter @workspace/api-server run typecheck`
Expected: all order tests PASS (existing `create-order.test.ts` untouched behavior).

- [ ] **Step 5: Commit** (if authorized)

```bash
git add apps/api/src/routes/orders/index.ts apps/api/src/routes/orders/access.ts apps/api/src/routes/orders/manual-order.test.ts apps/api/src/lib/email/email.ts
git commit -m "feat(api): accept Vodafone Cash and InstaPay orders"
```

---

### Task 10: Express manual-payment order routes (buyer summary, internal mark-paid, admin confirm)

**Files:**
- Create: `apps/api/src/lib/bridge-secret.ts`, `bridge-secret.test.ts`
- Create: `apps/api/src/routes/orders/manual-payments.ts`, `manual-payments.test.ts`
- Modify: `apps/api/src/routes/index.ts` (mount)

**Interfaces:**
- Consumes: `markOrderPaid`, `isManualPaymentMethod` (Task 8); `canAccessOrder` (Task 9); `ensureMedusaOrderPayable(medusaOrderId: string, amountHint: number, options?: { markPaid?: boolean; providerId?: string })`, `findMedusaOrderIdByDarnozomId(id: number): Promise<string | null>` from `lib/medusa-order-sync.ts`.
- Produces:
  - `isValidBridgeSecret(authorizationHeader: string | undefined): boolean`
  - `GET /store/orders/:id/manual-payment?email=` → `200 { id, totalAmount, currency, paymentMethod, paymentStatus }` | `404`
  - `POST /internal/orders/:id/mark-paid` → `200 { ok: true, alreadyPaid }` | `401` | `404` | `400` | `409`
  - `POST /admin/orders/:id/confirm-payment` → `200 <Order>` | `400` | `404` | `409` | `502 { error }`

- [ ] **Step 1: Write the failing tests**

`apps/api/src/lib/bridge-secret.test.ts`:
```ts
import { afterEach, describe, expect, it } from "vitest";
import { isValidBridgeSecret } from "./bridge-secret";

describe("isValidBridgeSecret", () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it("accepts the exact bearer secret", () => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = "abc";
    expect(isValidBridgeSecret("Bearer abc")).toBe(true);
  });
  it("rejects wrong, missing, or different-length tokens", () => {
    process.env.BETTER_AUTH_BRIDGE_SECRET = "abc";
    expect(isValidBridgeSecret("Bearer abd")).toBe(false);
    expect(isValidBridgeSecret("Bearer abcd")).toBe(false);
    expect(isValidBridgeSecret(undefined)).toBe(false);
  });
  it("rejects everything when no secret is configured", () => {
    delete process.env.BETTER_AUTH_BRIDGE_SECRET;
    delete process.env.ADMIN_SOCKET_NOTIFY_SECRET;
    expect(isValidBridgeSecret("Bearer ")).toBe(false);
  });
});
```

`apps/api/src/routes/orders/manual-payments.test.ts`:
```ts
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { db, orders, type NewOrder } from "@workspace/db";
import { eq, like } from "drizzle-orm";

const PREFIX = "test-manual-routes-";
const OWNER = `${PREFIX}owner`;

const { paidMock, ensureMock, findMock } = vi.hoisted(() => ({
  paidMock: vi.fn(async () => undefined),
  ensureMock: vi.fn(async () => undefined),
  findMock: vi.fn(async () => null as string | null),
}));

vi.mock("../../lib/email/orderPaidNotifications", () => ({ sendOrderPaidNotifications: paidMock }));
vi.mock("../../lib/medusa-order-sync", () => ({
  ensureMedusaOrderPayable: ensureMock,
  findMedusaOrderIdByDarnozomId: findMock,
}));
vi.mock("../../middlewares/authMiddleware", () => ({
  optionalAuth: (req: any, _res: any, next: any) => {
    const uid = req.header("x-test-user");
    if (uid) { req.userId = uid; req.userEmail = "buyer@example.com"; }
    next();
  },
  requireAuth: (_req: any, res: any) => res.status(401).end(),
}));
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) =>
    req.header("x-test-admin") === "1" ? next() : res.status(403).json({ error: "Forbidden" }),
}));

const { default: router } = await import("./manual-payments");

const app = express();
app.use(express.json());
app.use((req, _res, next) => { (req as any).log = { info() {}, warn() {}, error() {}, debug() {} }; next(); });
app.use(router);

async function seed(overrides: Partial<NewOrder> = {}) {
  const [row] = await db.insert(orders).values({
    userId: OWNER, userEmail: "buyer@example.com", fullName: "Buyer", phone: "01000000000",
    currency: "EGP", itemsCount: 1, paymentMethod: "instapay", paymentStatus: "pending",
    totalAmount: "250.00", shippingTotal: "0.00", ...overrides,
  }).returning();
  return row.id;
}

beforeEach(() => { process.env.BETTER_AUTH_BRIDGE_SECRET = "bridge"; });
afterEach(async () => {
  paidMock.mockClear(); ensureMock.mockReset(); findMock.mockReset();
  await db.delete(orders).where(like(orders.userId, `${PREFIX}%`));
  await db.delete(orders).where(like(orders.userEmail, `${PREFIX}%`));
});
afterAll(async () => { await db.delete(orders).where(like(orders.userId, `${PREFIX}%`)); });

describe("GET /store/orders/:id/manual-payment", () => {
  it("returns the summary to the signed-in owner", async () => {
    const id = await seed();
    const res = await request(app).get(`/store/orders/${id}/manual-payment`).set("x-test-user", OWNER);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id, totalAmount: "250.00", currency: "EGP", paymentMethod: "instapay", paymentStatus: "pending" });
  });

  it("returns the summary to a guest who passes the order email", async () => {
    const id = await seed({ userId: null, userEmail: `${PREFIX}guest@example.com` });
    const res = await request(app).get(`/store/orders/${id}/manual-payment`).query({ email: `${PREFIX}GUEST@example.com` });
    expect(res.status).toBe(200);
  });

  it("404s for strangers and for non-manual orders", async () => {
    const id = await seed();
    expect((await request(app).get(`/store/orders/${id}/manual-payment`).set("x-test-user", "someone-else")).status).toBe(404);
    const paypal = await seed({ paymentMethod: "paypal" });
    expect((await request(app).get(`/store/orders/${paypal}/manual-payment`).set("x-test-user", OWNER)).status).toBe(404);
  });
});

describe("POST /internal/orders/:id/mark-paid", () => {
  it("rejects a bad secret", async () => {
    const id = await seed();
    const res = await request(app).post(`/internal/orders/${id}/mark-paid`).set("Authorization", "Bearer nope");
    expect(res.status).toBe(401);
  });

  it("marks paid, then reports alreadyPaid on repeat", async () => {
    const id = await seed();
    const first = await request(app).post(`/internal/orders/${id}/mark-paid`).set("Authorization", "Bearer bridge").send({ medusaOrderId: "order_m" });
    expect(first.body).toEqual({ ok: true, alreadyPaid: false });
    const second = await request(app).post(`/internal/orders/${id}/mark-paid`).set("Authorization", "Bearer bridge");
    expect(second.body).toEqual({ ok: true, alreadyPaid: true });
    expect(paidMock).toHaveBeenCalledOnce();
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    expect(row.medusaOrderId).toBe("order_m");
  });

  it("409s a cancelled order", async () => {
    const id = await seed({ status: "cancelled" });
    const res = await request(app).post(`/internal/orders/${id}/mark-paid`).set("Authorization", "Bearer bridge");
    expect(res.status).toBe(409);
  });
});

describe("POST /admin/orders/:id/confirm-payment", () => {
  it("marks Medusa paid first, then Express, using the stored medusaOrderId", async () => {
    const id = await seed({ medusaOrderId: "order_m1" });
    const res = await request(app).post(`/admin/orders/${id}/confirm-payment`).set("x-test-admin", "1");
    expect(res.status).toBe(200);
    expect(res.body.paymentStatus).toBe("paid");
    expect(ensureMock).toHaveBeenCalledWith("order_m1", 250, { markPaid: true, providerId: "pp_system_default" });
    expect(findMock).not.toHaveBeenCalled();
  });

  it("falls back to lookup when medusaOrderId is missing", async () => {
    findMock.mockResolvedValue("order_found");
    const id = await seed();
    const res = await request(app).post(`/admin/orders/${id}/confirm-payment`).set("x-test-admin", "1");
    expect(res.status).toBe(200);
    expect(ensureMock).toHaveBeenCalledWith("order_found", 250, expect.anything());
  });

  it("502s and changes nothing when the Medusa order cannot be found", async () => {
    const id = await seed();
    const res = await request(app).post(`/admin/orders/${id}/confirm-payment`).set("x-test-admin", "1");
    expect(res.status).toBe(502);
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    expect(row.paymentStatus).toBe("pending");
    expect(paidMock).not.toHaveBeenCalled();
  });

  it("502s and changes nothing when Medusa mark-as-paid fails", async () => {
    ensureMock.mockRejectedValue(new Error("medusa down"));
    const id = await seed({ medusaOrderId: "order_m2" });
    const res = await request(app).post(`/admin/orders/${id}/confirm-payment`).set("x-test-admin", "1");
    expect(res.status).toBe(502);
    const [row] = await db.select().from(orders).where(eq(orders.id, id));
    expect(row.paymentStatus).toBe("pending");
  });

  it("confirm then Medusa callback sends one email", async () => {
    const id = await seed({ medusaOrderId: "order_m3" });
    await request(app).post(`/admin/orders/${id}/confirm-payment`).set("x-test-admin", "1");
    const cb = await request(app).post(`/internal/orders/${id}/mark-paid`).set("Authorization", "Bearer bridge");
    expect(cb.body.alreadyPaid).toBe(true);
    expect(paidMock).toHaveBeenCalledOnce();
  });

  it("rejects non-manual orders and requires admin", async () => {
    const paypal = await seed({ paymentMethod: "paypal" });
    expect((await request(app).post(`/admin/orders/${paypal}/confirm-payment`).set("x-test-admin", "1")).status).toBe(400);
    expect((await request(app).post(`/admin/orders/${paypal}/confirm-payment`)).status).toBe(403);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/bridge-secret.test.ts src/routes/orders/manual-payments.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement**

`apps/api/src/lib/bridge-secret.ts`:
```ts
import { timingSafeEqual } from "node:crypto";

/** Medusa → Express server-to-server auth (Authorization: Bearer <secret>). */
export function isValidBridgeSecret(authorizationHeader: string | undefined): boolean {
  const secret =
    process.env.BETTER_AUTH_BRIDGE_SECRET?.trim() ||
    process.env.ADMIN_SOCKET_NOTIFY_SECRET?.trim();
  const auth = authorizationHeader?.trim() ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!secret || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

`apps/api/src/routes/orders/manual-payments.ts`:
```ts
import { Router, type Response } from "express";
import { db, orders } from "@workspace/db";
import { eq } from "drizzle-orm";
import { optionalAuth, type AuthRequest } from "../../middlewares/authMiddleware";
import { requireAdmin } from "../../middlewares/adminAuth";
import { isValidBridgeSecret } from "../../lib/bridge-secret";
import { isManualPaymentMethod, markOrderPaid } from "../../lib/payments/manualPayments";
import {
  ensureMedusaOrderPayable,
  findMedusaOrderIdByDarnozomId,
} from "../../lib/medusa-order-sync";
import { canAccessOrder } from "./access";

const router = Router();

function parseId(raw: unknown): number | null {
  const id = Number.parseInt(String(raw), 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

// Buyer's instructions page: order total + method. Signed-in owner, or a
// guest who passes the order email (stashed at checkout / in the email link).
router.get(
  "/store/orders/:id/manual-payment",
  optionalAuth,
  async (req: AuthRequest, res: Response) => {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ error: "Invalid order id" });
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (
      !order ||
      !isManualPaymentMethod(order.paymentMethod) ||
      !canAccessOrder(order, req, (req.query.email as string | undefined) ?? null)
    ) {
      return res.status(404).json({ error: "Order not found" });
    }
    return res.json({
      id: order.id,
      totalAmount: order.totalAmount,
      currency: order.currency,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
    });
  },
);

// Medusa "Mark as paid" → manual-payment-captured subscriber → here.
router.post("/internal/orders/:id/mark-paid", async (req, res) => {
  if (!isValidBridgeSecret(req.headers.authorization)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid order id" });

  const medusaOrderId = (req.body as { medusaOrderId?: unknown } | undefined)?.medusaOrderId;
  if (typeof medusaOrderId === "string" && medusaOrderId) {
    await db.update(orders).set({ medusaOrderId }).where(eq(orders.id, id));
  }

  const result = await markOrderPaid(id, { source: "medusa" });
  switch (result.status) {
    case "paid":
      return res.json({ ok: true, alreadyPaid: false });
    case "already_paid":
      return res.json({ ok: true, alreadyPaid: true });
    case "not_found":
      return res.status(404).json({ error: "Order not found" });
    case "not_manual":
      return res.status(400).json({ error: "Not a manual payment order" });
    case "cancelled":
      return res.status(409).json({ error: "Order is cancelled" });
  }
});

// Storefront admin "Confirm payment". Medusa is the source of truth: mark it
// paid there first; only on success mark Express paid. The subscriber's
// callback that follows is then a no-op.
router.post("/admin/orders/:id/confirm-payment", requireAdmin, async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });
  const [order] = await db.select().from(orders).where(eq(orders.id, id));
  if (!order) return res.status(404).json({ error: "Not found" });
  if (!isManualPaymentMethod(order.paymentMethod)) {
    return res.status(400).json({ error: "Only Vodafone Cash / InstaPay orders can be confirmed here" });
  }
  if (order.status === "cancelled") return res.status(409).json({ error: "Order is cancelled" });
  if (order.paymentStatus === "paid") return res.json(order);

  try {
    const medusaOrderId = order.medusaOrderId ?? (await findMedusaOrderIdByDarnozomId(order.id));
    if (!medusaOrderId) {
      return res.status(502).json({
        error: "The matching Medusa order was not found — confirm it from Medusa Admin or re-sync the order.",
      });
    }
    await ensureMedusaOrderPayable(medusaOrderId, Number.parseFloat(order.totalAmount), {
      markPaid: true,
      providerId: "pp_system_default",
    });
    if (!order.medusaOrderId) {
      await db.update(orders).set({ medusaOrderId }).where(eq(orders.id, order.id));
    }
  } catch (err) {
    req.log.error({ err, orderId: order.id }, "medusa mark-as-paid failed during manual confirm");
    return res.status(502).json({ error: "Could not mark the order paid in Medusa. Nothing was changed." });
  }

  const result = await markOrderPaid(order.id, { source: "storefront_admin" });
  if (result.status === "paid" || result.status === "already_paid") {
    return res.json(result.order);
  }
  return res.status(409).json({ error: `Could not confirm payment (${result.status})` });
});

export default router;
```

`apps/api/src/routes/index.ts` — add the import and mount it right after `router.use(ordersRouter);`:
```ts
import manualPaymentOrdersRouter from "./orders/manual-payments";
// …
router.use(manualPaymentOrdersRouter);
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @workspace/api-server exec vitest run src/lib/bridge-secret.test.ts src/routes/orders` and `pnpm --filter @workspace/api-server run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit** (if authorized)

```bash
git add apps/api/src/lib/bridge-secret.ts apps/api/src/lib/bridge-secret.test.ts apps/api/src/routes/orders/manual-payments.ts apps/api/src/routes/orders/manual-payments.test.ts apps/api/src/routes/index.ts
git commit -m "feat(api): confirm manual payments from storefront admin and Medusa"
```

---

### Task 11: Express settings proxy + QR upload for the storefront admin

**Files:**
- Create: `apps/api/src/routes/admin/manual-payment-settings.ts`, `manual-payment-settings.test.ts`
- Modify: `apps/api/src/routes/index.ts` (mount)

**Interfaces:**
- Consumes: `medusaAdmin<T>(path, init)`, `medusaAdminAuthHeader()` from `lib/medusa-admin.ts`; Medusa routes from Task 4; Medusa `POST /admin/uploads` (`files` field → `{ files: [{ id, url }] }`).
- Produces:
  - `GET /admin/manual-payments` → `{ methods }` (Medusa's response passed through)
  - `PUT /admin/manual-payments/:code` → `{ method }` | Medusa's 400 error passed as `400 { error }`
  - `POST /admin/manual-payments/qr` (multipart field `image`, ≤ 2 MB, png/jpeg/webp) → `{ url }`

- [ ] **Step 1: Write the failing test**

`apps/api/src/routes/admin/manual-payment-settings.test.ts`:
```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const { medusaAdminMock } = vi.hoisted(() => ({ medusaAdminMock: vi.fn() }));
vi.mock("../../lib/medusa-admin", () => ({
  medusaAdmin: medusaAdminMock,
  medusaAdminAuthHeader: () => "Basic test",
}));
vi.mock("../../middlewares/adminAuth", () => ({
  requireAdmin: (req: any, res: any, next: any) =>
    req.header("x-test-admin") === "1" ? next() : res.status(403).end(),
}));

const { default: router } = await import("./manual-payment-settings");
const app = express();
app.use(express.json());
app.use((req, _res, next) => { (req as any).log = { error() {} }; next(); });
app.use(router);

afterEach(() => { medusaAdminMock.mockReset(); vi.unstubAllGlobals(); });

describe("manual payment settings proxy", () => {
  it("requires admin", async () => {
    expect((await request(app).get("/admin/manual-payments")).status).toBe(403);
  });

  it("GET proxies to Medusa", async () => {
    medusaAdminMock.mockResolvedValue({ methods: [{ code: "instapay" }] });
    const res = await request(app).get("/admin/manual-payments").set("x-test-admin", "1");
    expect(res.body).toEqual({ methods: [{ code: "instapay" }] });
    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/manual-payment-methods");
  });

  it("PUT proxies the patch for a known code", async () => {
    medusaAdminMock.mockResolvedValue({ method: { code: "vodafone_cash" } });
    const res = await request(app)
      .put("/admin/manual-payments/vodafone_cash")
      .set("x-test-admin", "1")
      .send({ account_number: "01012345678" });
    expect(res.status).toBe(200);
    expect(medusaAdminMock).toHaveBeenCalledWith("/admin/manual-payment-methods/vodafone_cash", {
      method: "POST",
      body: JSON.stringify({ account_number: "01012345678" }),
    });
  });

  it("PUT rejects unknown codes without calling Medusa", async () => {
    const res = await request(app).put("/admin/manual-payments/cod").set("x-test-admin", "1").send({});
    expect(res.status).toBe(400);
    expect(medusaAdminMock).not.toHaveBeenCalled();
  });

  it("PUT surfaces Medusa validation errors as 400", async () => {
    medusaAdminMock.mockRejectedValue(
      new Error('Medusa admin POST /admin/manual-payment-methods/instapay failed (400): {"error":"qr_image_url must be an http(s) URL or /static/ path"}'),
    );
    const res = await request(app).put("/admin/manual-payments/instapay").set("x-test-admin", "1").send({ qr_image_url: "x" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/qr_image_url/);
  });

  it("QR upload forwards the file to Medusa /admin/uploads", async () => {
    process.env.MEDUSA_BACKEND_URL = "http://medusa.test";
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ files: [{ id: "f1", url: "http://medusa.test/static/qr.png" }] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const res = await request(app)
      .post("/admin/manual-payments/qr")
      .set("x-test-admin", "1")
      .attach("image", Buffer.from([0x89, 0x50, 0x4e, 0x47]), { filename: "qr.png", contentType: "image/png" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: "http://medusa.test/static/qr.png" });
    const [url, init] = fetchMock.mock.calls[0] as any;
    expect(url).toBe("http://medusa.test/admin/uploads");
    expect(init.headers.Authorization).toBe("Basic test");
    expect(init.body).toBeInstanceOf(FormData);
  });

  it("QR upload rejects non-images", async () => {
    const res = await request(app)
      .post("/admin/manual-payments/qr")
      .set("x-test-admin", "1")
      .attach("image", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/admin/manual-payment-settings.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

`apps/api/src/routes/admin/manual-payment-settings.ts`:
```ts
import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { requireAdmin } from "../../middlewares/adminAuth";
import { medusaAdmin, medusaAdminAuthHeader } from "../../lib/medusa-admin";

// Storefront-admin editor for the Vodafone Cash / InstaPay details. Medusa
// (manualPayment module) is the source of truth; this only proxies to its
// admin API so both dashboards edit the same rows.
const router = Router();
const CODES = new Set(["vodafone_cash", "instapay"]);
const QR_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (QR_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only PNG, JPG, and WebP images are allowed"));
  },
});

/** medusaAdmin() errors look like "… failed (400): {json}" — recover Medusa's 400 message. */
function medusaValidationError(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : "";
  const m = /failed \(400\): (.*)$/s.exec(msg);
  if (!m) return null;
  try {
    return (JSON.parse(m[1]) as { error?: string }).error ?? m[1];
  } catch {
    return m[1];
  }
}

router.get("/admin/manual-payments", requireAdmin, async (req, res) => {
  try {
    return res.json(await medusaAdmin("/admin/manual-payment-methods"));
  } catch (err) {
    req.log.error({ err }, "manual payments settings fetch failed");
    return res.status(502).json({ error: "Could not load settings from Medusa" });
  }
});

router.put("/admin/manual-payments/:code", requireAdmin, async (req, res) => {
  const code = String(req.params.code);
  if (!CODES.has(code)) return res.status(400).json({ error: "Unknown payment method" });
  try {
    const body = await medusaAdmin(`/admin/manual-payment-methods/${code}`, {
      method: "POST",
      body: JSON.stringify(req.body ?? {}),
    });
    return res.json(body);
  } catch (err) {
    const validation = medusaValidationError(err);
    if (validation) return res.status(400).json({ error: validation });
    req.log.error({ err }, "manual payments settings save failed");
    return res.status(502).json({ error: "Could not save settings to Medusa" });
  }
});

router.post(
  "/admin/manual-payments/qr",
  requireAdmin,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single("image")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File too large (max 2 MB)" });
      }
      if (err) return res.status(400).json({ error: (err as Error).message });
      return next();
    });
  },
  async (req: Request, res: Response) => {
    if (!req.file) return res.status(400).json({ error: "No image file provided" });
    const backend = process.env.MEDUSA_BACKEND_URL?.replace(/\/$/, "");
    if (!backend) return res.status(500).json({ error: "MEDUSA_BACKEND_URL is not set" });
    try {
      // Not via medusaAdmin(): it forces a JSON Content-Type, which would
      // break the multipart boundary.
      const form = new FormData();
      form.append(
        "files",
        new Blob([req.file.buffer], { type: req.file.mimetype }),
        req.file.originalname || "qr.png",
      );
      const r = await fetch(`${backend}/admin/uploads`, {
        method: "POST",
        headers: { Authorization: medusaAdminAuthHeader() },
        body: form,
      });
      if (!r.ok) throw new Error(`Medusa upload failed (${r.status}): ${(await r.text()).slice(0, 200)}`);
      const body = (await r.json()) as { files?: Array<{ url: string }> };
      const url = body.files?.[0]?.url;
      if (!url) throw new Error("Medusa upload returned no file url");
      return res.json({ url });
    } catch (err) {
      req.log.error({ err }, "manual payment QR upload failed");
      return res.status(502).json({ error: "Could not upload the QR image to Medusa" });
    }
  },
);

export default router;
```

`apps/api/src/routes/index.ts` — add the import and mount right after `router.use(adminRouter);`:
```ts
import manualPaymentSettingsRouter from "./admin/manual-payment-settings";
// …
router.use(manualPaymentSettingsRouter);
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @workspace/api-server exec vitest run src/routes/admin` and `pnpm --filter @workspace/api-server run typecheck`
Expected: PASS.

- [ ] **Step 5: Commit** (if authorized)

```bash
git add apps/api/src/routes/admin/manual-payment-settings.ts apps/api/src/routes/admin/manual-payment-settings.test.ts apps/api/src/routes/index.ts
git commit -m "feat(api): storefront admin proxy for manual payment settings"
```

---

### Task 12: Storefront checkout options + payment instructions page + account badge

**Files:**
- Create: `apps/client/src/lib/manual-payments.ts`, `manual-payments.test.ts`
- Modify: `apps/client/src/lib/medusa-client.ts` (add `fetchManualPaymentMethods`)
- Modify: `apps/client/src/pages/checkout.tsx`
- Create: `apps/client/src/pages/checkout-manual.tsx`, `checkout-manual.test.tsx`
- Modify: `apps/client/src/App.tsx` (route)
- Modify: `apps/client/src/pages/account.tsx`

**Interfaces:**
- Consumes: `GET /store/manual-payment-methods` (Medusa, Task 4), `GET /api/store/orders/:id/manual-payment?email=` (Task 10), `POST /api/store/orders` (Task 9).
- Produces:
  - `type ManualPaymentCode = "vodafone_cash" | "instapay"`
  - `interface ManualPaymentDetails { code: ManualPaymentCode; account_number: string | null; account_name: string | null; whatsapp_number: string | null; instapay_address: string | null; qr_image_url: string | null; instructions_ar: string | null; instructions_en: string | null }`
  - `isManualPaymentCode(m: unknown): m is ManualPaymentCode`
  - `toWhatsAppDigits(raw: string): string | null`
  - `buildWhatsAppLink(p: { number: string; orderId: number; method: ManualPaymentCode; amount: string; currency: string; lang: "ar" | "en" }): string | null`
  - `isConfigured(d: ManualPaymentDetails | undefined): boolean`
  - `fetchManualPaymentMethods(): Promise<ManualPaymentDetails[]>`

- [ ] **Step 1: Write the failing tests**

`apps/client/src/lib/manual-payments.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toWhatsAppDigits, buildWhatsAppLink, isConfigured } from "./manual-payments";

describe("toWhatsAppDigits", () => {
  it("converts Egyptian local numbers to international", () => {
    expect(toWhatsAppDigits("010 1234 5678")).toBe("201012345678");
    expect(toWhatsAppDigits("01012345678")).toBe("201012345678");
  });
  it("keeps international formats", () => {
    expect(toWhatsAppDigits("+20 101 234 5678")).toBe("201012345678");
    expect(toWhatsAppDigits("00201012345678")).toBe("201012345678");
    expect(toWhatsAppDigits("+966501234567")).toBe("966501234567");
  });
  it("rejects garbage", () => {
    expect(toWhatsAppDigits("")).toBeNull();
    expect(toWhatsAppDigits("123")).toBeNull();
  });
});

describe("buildWhatsAppLink", () => {
  it("builds a wa.me link with the order message", () => {
    const link = buildWhatsAppLink({
      number: "01012345678", orderId: 12, method: "vodafone_cash", amount: "250.00", currency: "EGP", lang: "en",
    })!;
    expect(link.startsWith("https://wa.me/201012345678?text=")).toBe(true);
    const text = decodeURIComponent(link.split("text=")[1]);
    expect(text).toContain("#12");
    expect(text).toContain("Vodafone Cash");
    expect(text).toContain("250.00 EGP");
  });
  it("returns null for an unusable number", () => {
    expect(buildWhatsAppLink({ number: "x", orderId: 1, method: "instapay", amount: "1", currency: "EGP", lang: "ar" })).toBeNull();
  });
});

describe("isConfigured", () => {
  const base = { account_number: null, account_name: null, whatsapp_number: "01012345678", instapay_address: null, qr_image_url: null, instructions_ar: null, instructions_en: null };
  it("vodafone cash needs a wallet number and whatsapp", () => {
    expect(isConfigured({ ...base, code: "vodafone_cash" })).toBe(false);
    expect(isConfigured({ ...base, code: "vodafone_cash", account_number: "01000000000" })).toBe(true);
  });
  it("instapay needs a QR or address, and whatsapp", () => {
    expect(isConfigured({ ...base, code: "instapay" })).toBe(false);
    expect(isConfigured({ ...base, code: "instapay", instapay_address: "dar@instapay" })).toBe(true);
    expect(isConfigured({ ...base, code: "instapay", instapay_address: "a", whatsapp_number: null })).toBe(false);
  });
});
```

`apps/client/src/pages/checkout-manual.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const { detailsMock } = vi.hoisted(() => ({ detailsMock: vi.fn() }));
vi.mock("@/lib/medusa-client", () => ({ fetchManualPaymentMethods: detailsMock }));
vi.mock("@/contexts/language-context", () => ({ useLanguage: () => ({ language: "en" }) }), { virtual: true });

import CheckoutManualPage from "./checkout-manual";

function mockOrder(order: Record<string, unknown>) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(order), { status: 200 })));
}

const vc = {
  code: "vodafone_cash", account_number: "01011112222", account_name: "Dar Nozom",
  whatsapp_number: "01033334444", instapay_address: null, qr_image_url: null,
  instructions_ar: null, instructions_en: "Send the exact amount.",
};
const ip = { ...vc, code: "instapay", account_number: null, instapay_address: "dar@instapay", qr_image_url: "/static/qr.png" };

beforeEach(() => {
  window.history.replaceState({}, "", "/checkout/manual?orderId=12");
  detailsMock.mockReset();
});

describe("CheckoutManualPage", () => {
  it("shows the Vodafone Cash number and a WhatsApp screenshot button", async () => {
    mockOrder({ id: 12, totalAmount: "250.00", currency: "EGP", paymentMethod: "vodafone_cash", paymentStatus: "pending" });
    detailsMock.mockResolvedValue([vc, ip]);
    render(<CheckoutManualPage />);
    expect(await screen.findByText("01011112222")).toBeInTheDocument();
    expect(screen.getByText("Send the exact amount.")).toBeInTheDocument();
    const wa = screen.getByTestId("link-whatsapp-proof");
    expect(wa.getAttribute("href")).toMatch(/^https:\/\/wa\.me\/201033334444\?text=/);
    expect(screen.queryByAltText(/InstaPay QR/i)).toBeNull();
  });

  it("shows the InstaPay QR and address", async () => {
    mockOrder({ id: 12, totalAmount: "250.00", currency: "EGP", paymentMethod: "instapay", paymentStatus: "pending" });
    detailsMock.mockResolvedValue([vc, ip]);
    render(<CheckoutManualPage />);
    expect(await screen.findByAltText(/InstaPay QR/i)).toHaveAttribute("src", expect.stringContaining("/static/qr.png"));
    expect(screen.getByText("dar@instapay")).toBeInTheDocument();
  });

  it("shows a contact fallback when the method is not configured", async () => {
    mockOrder({ id: 12, totalAmount: "250.00", currency: "EGP", paymentMethod: "instapay", paymentStatus: "pending" });
    detailsMock.mockResolvedValue([vc, { ...ip, instapay_address: null, qr_image_url: null }]);
    render(<CheckoutManualPage />);
    expect(await screen.findByTestId("manual-not-configured")).toBeInTheDocument();
  });

  it("shows a paid state once confirmed", async () => {
    mockOrder({ id: 12, totalAmount: "250.00", currency: "EGP", paymentMethod: "instapay", paymentStatus: "paid" });
    detailsMock.mockResolvedValue([vc, ip]);
    render(<CheckoutManualPage />);
    expect(await screen.findByTestId("manual-paid")).toBeInTheDocument();
  });

  it("passes the email query param to the order endpoint (guest from email link)", async () => {
    window.history.replaceState({}, "", "/checkout/manual?orderId=12&email=g%40x.com");
    mockOrder({ id: 12, totalAmount: "1.00", currency: "EGP", paymentMethod: "instapay", paymentStatus: "pending" });
    detailsMock.mockResolvedValue([vc, ip]);
    render(<CheckoutManualPage />);
    await screen.findByText("dar@instapay");
    expect((fetch as any).mock.calls[0][0]).toBe("/api/store/orders/12/manual-payment?email=g%40x.com");
  });
});
```
Before writing this test, check how `checkout.tsx` obtains `language` (grep `useLanguage` / `language` import at the top of `checkout.tsx`) and point the `vi.mock` path and hook at the same module; drop `{ virtual: true }` once the real path is used.

- [ ] **Step 2: Run to verify failure**

Run: `pnpm --filter @workspace/client exec vitest run src/lib/manual-payments.test.ts src/pages/checkout-manual.test.tsx`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement the helpers**

`apps/client/src/lib/manual-payments.ts`:
```ts
export type ManualPaymentCode = "vodafone_cash" | "instapay";

export interface ManualPaymentDetails {
  code: ManualPaymentCode;
  account_number: string | null;
  account_name: string | null;
  whatsapp_number: string | null;
  instapay_address: string | null;
  qr_image_url: string | null;
  instructions_ar: string | null;
  instructions_en: string | null;
}

export const MANUAL_METHOD_LABELS: Record<ManualPaymentCode, { ar: string; en: string }> = {
  vodafone_cash: { ar: "فودافون كاش", en: "Vodafone Cash" },
  instapay: { ar: "إنستاباي", en: "InstaPay" },
};

export function isManualPaymentCode(m: unknown): m is ManualPaymentCode {
  return m === "vodafone_cash" || m === "instapay";
}

/** Normalize a phone number to wa.me format (international digits, no +). */
export function toWhatsAppDigits(raw: string): string | null {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Egyptian local mobile: 01XXXXXXXXX → 201XXXXXXXXX
  if (digits.length === 11 && digits.startsWith("01")) digits = `2${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

export function buildWhatsAppLink(p: {
  number: string;
  orderId: number;
  method: ManualPaymentCode;
  amount: string;
  currency: string;
  lang: "ar" | "en";
}): string | null {
  const digits = toWhatsAppDigits(p.number);
  if (!digits) return null;
  const label = MANUAL_METHOD_LABELS[p.method][p.lang];
  const text =
    p.lang === "ar"
      ? p.method === "vodafone_cash"
        ? `طلب رقم #${p.orderId} — تم الدفع عبر ${label} بمبلغ ${p.amount} ${p.currency}. مرفق صورة الإيصال.`
        : `طلب رقم #${p.orderId} — تم الدفع عبر ${label} بمبلغ ${p.amount} ${p.currency}. رمز التأكيد: `
      : p.method === "vodafone_cash"
        ? `Order #${p.orderId} — paid via ${label}, ${p.amount} ${p.currency}. Screenshot attached.`
        : `Order #${p.orderId} — paid via ${label}, ${p.amount} ${p.currency}. Confirmation code: `;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Enough data to actually pay and send proof. */
export function isConfigured(d: ManualPaymentDetails | undefined): boolean {
  if (!d || !d.whatsapp_number) return false;
  return d.code === "vodafone_cash"
    ? !!d.account_number
    : !!(d.qr_image_url || d.instapay_address);
}
```

Append to `apps/client/src/lib/medusa-client.ts`:
```ts
/** Vodafone Cash / InstaPay display details (Medusa manualPayment module). */
export async function fetchManualPaymentMethods(): Promise<import("./manual-payments").ManualPaymentDetails[]> {
  const { methods } = await getMedusaClient().client.fetch<{
    methods: import("./manual-payments").ManualPaymentDetails[];
  }>("/store/manual-payment-methods");
  return methods ?? [];
}
```

- [ ] **Step 4: Implement the instructions page**

`apps/client/src/pages/checkout-manual.tsx` — use the same layout wrapper, language hook, and `Button` imports as `checkout-paymob-wallet.tsx` (open it and copy its top-level imports/wrapper; replace `useLanguage` below with whatever hook that page uses):
```tsx
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { CheckCircle2, Copy, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { fetchManualPaymentMethods } from "@/lib/medusa-client";
import {
  MANUAL_METHOD_LABELS,
  buildWhatsAppLink,
  isConfigured,
  isManualPaymentCode,
  type ManualPaymentDetails,
} from "@/lib/manual-payments";

interface OrderSummary {
  id: number;
  totalAmount: string;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
}

const COPY = {
  ar: {
    title: "أكمل الدفع",
    order: "رقم الطلب",
    amount: "المبلغ المطلوب",
    wallet: "رقم المحفظة",
    holder: "اسم صاحب الحساب",
    address: "عنوان إنستاباي",
    scan: "امسح رمز QR من تطبيق إنستاباي",
    vcSteps: "حوّل المبلغ إلى رقم فودافون كاش أعلاه، ثم أرسل صورة الإيصال على واتساب.",
    ipSteps: "ادفع عبر إنستاباي، ثم أرسل رمز التأكيد على واتساب.",
    vcButton: "إرسال صورة الإيصال على واتساب",
    ipButton: "إرسال رمز التأكيد على واتساب",
    after: "سنؤكد الدفع ونفعّل طلبك في أقرب وقت. ستصلك رسالة بالبريد عند التأكيد.",
    notConfigured: "بيانات الدفع قيد التحديث حالياً. يرجى التواصل معنا لإتمام الدفع.",
    contact: "تواصل معنا",
    paid: "تم تأكيد الدفع. شكراً لك!",
    account: "طلباتي",
    notFound: "لم يتم العثور على الطلب. افتح الرابط من البريد الإلكتروني أو سجّل الدخول.",
    copy: "نسخ",
    copied: "تم النسخ",
  },
  en: {
    title: "Complete your payment",
    order: "Order number",
    amount: "Amount due",
    wallet: "Wallet number",
    holder: "Account holder",
    address: "InstaPay address",
    scan: "Scan the QR code from the InstaPay app",
    vcSteps: "Transfer the amount to the Vodafone Cash number above, then send the receipt screenshot on WhatsApp.",
    ipSteps: "Pay via InstaPay, then send the confirmation code on WhatsApp.",
    vcButton: "Send screenshot on WhatsApp",
    ipButton: "Send confirmation code on WhatsApp",
    after: "We'll confirm your payment and activate your order shortly. You'll get an email once it's confirmed.",
    notConfigured: "Payment details are being updated. Please contact us to complete your payment.",
    contact: "Contact us",
    paid: "Payment confirmed. Thank you!",
    account: "My orders",
    notFound: "Order not found. Open the link from your email or sign in.",
    copy: "Copy",
    copied: "Copied",
  },
} as const;

function CopyValue({ value, t }: { value: string; t: (typeof COPY)["en"] | (typeof COPY)["ar"] }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <span className="font-mono font-bold text-primary" dir="ltr">{value}</span>
      <button
        type="button"
        className="text-xs text-secondary inline-flex items-center gap-1"
        onClick={() => {
          navigator.clipboard?.writeText(value).then(() => setCopied(true)).catch(() => {});
        }}
      >
        <Copy className="w-3 h-3" /> {copied ? t.copied : t.copy}
      </button>
    </span>
  );
}

export default function CheckoutManualPage() {
  const { language } = useLanguage();
  const lang: "ar" | "en" = language === "ar" ? "ar" : "en";
  const t = COPY[lang];

  const params = new URLSearchParams(window.location.search);
  const orderId = Number(params.get("orderId"));
  const emailParam = params.get("email");

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [details, setDetails] = useState<ManualPaymentDetails[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let email = emailParam;
    if (!email) {
      try {
        email = sessionStorage.getItem(`order-email-${orderId}`);
      } catch {
        email = null;
      }
    }
    const qs = email ? `?email=${encodeURIComponent(email)}` : "";
    Promise.all([
      fetch(`/api/store/orders/${orderId}/manual-payment${qs}`, { credentials: "include" }).then((r) =>
        r.ok ? r.json() : Promise.reject(r.status),
      ),
      fetchManualPaymentMethods(),
    ])
      .then(([o, d]) => {
        setOrder(o);
        setDetails(d);
      })
      .catch(() => setError(true));
  }, [orderId, emailParam]);

  if (error || !Number.isInteger(orderId) || orderId <= 0) {
    return <div className="container mx-auto max-w-xl py-16 text-center">{t.notFound}</div>;
  }
  if (!order || !details) {
    return (
      <div className="container mx-auto max-w-xl py-16 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }
  if (!isManualPaymentCode(order.paymentMethod)) {
    return <div className="container mx-auto max-w-xl py-16 text-center">{t.notFound}</div>;
  }

  const method = order.paymentMethod;
  const d = details.find((x) => x.code === method);
  const label = MANUAL_METHOD_LABELS[method][lang];
  const instructions = d ? (lang === "ar" ? d.instructions_ar : d.instructions_en) : null;
  const waLink =
    d?.whatsapp_number &&
    buildWhatsAppLink({
      number: d.whatsapp_number,
      orderId: order.id,
      method,
      amount: order.totalAmount,
      currency: order.currency,
      lang,
    });

  return (
    <div className="container mx-auto max-w-xl py-12 space-y-6" dir={lang === "ar" ? "rtl" : "ltr"}>
      <h1 className="text-2xl font-black text-primary">{t.title} — {label}</h1>
      <div className="border border-border p-4 space-y-1 text-sm">
        <div>{t.order}: <strong>#{order.id}</strong></div>
        <div>{t.amount}: <strong dir="ltr">{order.totalAmount} {order.currency}</strong></div>
      </div>

      {order.paymentStatus === "paid" ? (
        <div data-testid="manual-paid" className="border border-green-600/40 bg-green-600/10 p-4 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-700" /> {t.paid}{" "}
          <Link href="/account" className="underline font-bold">{t.account}</Link>
        </div>
      ) : !isConfigured(d) ? (
        <div data-testid="manual-not-configured" className="border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
          <p>{t.notConfigured}</p>
          <Link href="/contact" className="underline font-bold">{t.contact}</Link>
        </div>
      ) : (
        <div className="border border-border p-4 space-y-4">
          {method === "vodafone_cash" && d!.account_number && (
            <div>{t.wallet}: <CopyValue value={d!.account_number} t={t} /></div>
          )}
          {method === "instapay" && d!.qr_image_url && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t.scan}</p>
              <img src={d!.qr_image_url} alt="InstaPay QR" className="w-56 h-56 object-contain border border-border" />
            </div>
          )}
          {method === "instapay" && d!.instapay_address && (
            <div>{t.address}: <CopyValue value={d!.instapay_address} t={t} /></div>
          )}
          {d!.account_name && <div>{t.holder}: <strong>{d!.account_name}</strong></div>}
          {instructions && <p className="text-sm whitespace-pre-wrap">{instructions}</p>}
          <p className="text-sm text-muted-foreground">{method === "vodafone_cash" ? t.vcSteps : t.ipSteps}</p>
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer" data-testid="link-whatsapp-proof">
              <Button type="button" className="rounded-none gap-2 w-full">
                <MessageCircle className="w-4 h-4" />
                {method === "vodafone_cash" ? t.vcButton : t.ipButton}
              </Button>
            </a>
          )}
          <p className="text-xs text-muted-foreground">{t.after}</p>
        </div>
      )}
    </div>
  );
}
```

`apps/client/src/App.tsx` — add the import and the route next to the Paymob ones:
```tsx
import CheckoutManualPage from "@/pages/checkout-manual";
// …
      <Route path="/checkout/manual" component={CheckoutManualPage} />
```

- [ ] **Step 5: Checkout options**

In `apps/client/src/pages/checkout.tsx`:

1. Add to both `COPY.ar` and `COPY.en` (Arabic / English):
```ts
    vodafoneCash: "فودافون كاش" / "Vodafone Cash",
    vodafoneCashDesc: "حوّل المبلغ إلى رقم فودافون كاش وأرسل صورة الإيصال على واتساب." / "Transfer to our Vodafone Cash number and send the receipt screenshot on WhatsApp.",
    instapay: "إنستاباي" / "InstaPay",
    instapayDesc: "ادفع عبر إنستاباي وأرسل رمز التأكيد على واتساب." / "Pay via InstaPay and send the confirmation code on WhatsApp.",
    placeManual: "تأكيد الطلب وعرض بيانات الدفع" / "Place order & view payment details",
    manualNote: "* سيتم تفعيل الطلب بعد تأكيد الدفع يدوياً." / "* Your order is activated once we verify the payment.",
```
2. Right after the COD `<label>` block (before `{hasDigitalItems && (`), add:
```tsx
                {(["vodafone_cash", "instapay"] as const)
                  .filter((m) => allowedMethods?.includes(m))
                  .map((m) => (
                    <label
                      key={m}
                      data-testid={`option-payment-${m}`}
                      className={`flex items-start gap-3 border p-4 transition-colors cursor-pointer ${
                        paymentMethod === m
                          ? "border-secondary bg-secondary/5"
                          : "border-border hover:border-secondary/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={m}
                        checked={paymentMethod === m}
                        onChange={() => setPaymentMethod(m)}
                        className="mt-1 accent-secondary"
                      />
                      <div className="flex-1">
                        <div className="font-bold text-primary">
                          {m === "vodafone_cash" ? t.vodafoneCash : t.instapay}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {m === "vodafone_cash" ? t.vodafoneCashDesc : t.instapayDesc}
                        </div>
                      </div>
                    </label>
                  ))}
```
3. After the `{paymentMethod === "wallet" && (…walletEgpNote…)}` note, add:
```tsx
                {(paymentMethod === "vodafone_cash" || paymentMethod === "instapay") && (
                  <p className="text-[11px] text-muted-foreground">{t.manualNote}</p>
                )}
```
4. Submit button label: in the non-submitting branch replace the final `: t.place}` with
```tsx
                      : paymentMethod === "vodafone_cash" || paymentMethod === "instapay"
                        ? t.placeManual
                        : t.place}
```
5. In `handleSubmit`, before the `// Cash on delivery: order is placed; show success.` lines, add:
```ts
      // Manual transfer: the order is placed; payment happens out-of-band.
      if ((paymentMethod === "vodafone_cash" || paymentMethod === "instapay") && body.id) {
        clear();
        navigate(`/checkout/manual?orderId=${body.id}`);
        return;
      }
```

- [ ] **Step 6: Account badge + link**

In `apps/client/src/pages/account.tsx`:
1. Extend the order `paymentMethod` type union with `| "vodafone_cash" | "instapay"`.
2. Add copy keys to both languages: `methodVodafoneCash: "فودافون كاش" / "Vodafone Cash"`, `methodInstapay: "إنستاباي" / "InstaPay"`, `awaitingVerification: "بانتظار تأكيد الدفع" / "Awaiting payment verification"`, `viewPaymentDetails: "عرض بيانات الدفع" / "View payment details"`.
3. Replace the method label ternary with:
```tsx
                  {order.paymentMethod === "paypal"
                    ? t.methodPaypal
                    : order.paymentMethod === "card"
                      ? t.methodCard
                      : order.paymentMethod === "wallet"
                        ? t.methodWallet
                        : order.paymentMethod === "vodafone_cash"
                          ? t.methodVodafoneCash
                          : order.paymentMethod === "instapay"
                            ? t.methodInstapay
                            : t.methodCod}
```
4. After the `PaymentPill` line, add:
```tsx
            {(order.paymentMethod === "vodafone_cash" || order.paymentMethod === "instapay") &&
              order.paymentStatus !== "paid" &&
              order.status !== "cancelled" && (
                <>
                  <span className="text-amber-700 font-bold">{t.awaitingVerification}</span>
                  <Link href={`/checkout/manual?orderId=${order.id}`} className="underline font-bold">
                    {t.viewPaymentDetails}
                  </Link>
                </>
              )}
```
(Import `Link` from `wouter` if the file doesn't already.)

- [ ] **Step 7: Run tests + typecheck**

Run: `pnpm --filter @workspace/client exec vitest run` and `pnpm --filter @workspace/client run typecheck`
Expected: PASS.

- [ ] **Step 8: Commit** (if authorized)

```bash
git add apps/client/src/lib/manual-payments.ts apps/client/src/lib/manual-payments.test.ts apps/client/src/lib/medusa-client.ts apps/client/src/pages/checkout.tsx apps/client/src/pages/checkout-manual.tsx apps/client/src/pages/checkout-manual.test.tsx apps/client/src/App.tsx apps/client/src/pages/account.tsx
git commit -m "feat(client): Vodafone Cash and InstaPay checkout with payment instructions page"
```

---

### Task 13: Storefront admin — settings page + Confirm payment button

**Files:**
- Create: `apps/client/src/pages/admin/store/manual-payments.tsx`
- Modify: `apps/client/src/pages/admin/store/orders.tsx`
- Modify: `apps/client/src/pages/admin/layout.tsx` (nav)
- Modify: `apps/client/src/App.tsx` (admin route)

**Interfaces:**
- Consumes: `GET /api/admin/manual-payments`, `PUT /api/admin/manual-payments/:code`, `POST /api/admin/manual-payments/qr` (Task 11); `POST /api/admin/orders/:id/confirm-payment` (Task 10); `adminFetch`, `PageHeader`, `Toast`, `useToast` (existing).

- [ ] **Step 1: Settings page**

`apps/client/src/pages/admin/store/manual-payments.tsx`:
```tsx
import { useEffect, useState } from "react";
import { Loader2, Save, Upload, Wallet } from "lucide-react";
import { adminFetch } from "../../../lib/admin-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Toast, useToast } from "../layout";
import type { ManualPaymentCode, ManualPaymentDetails } from "@/lib/manual-payments";

type Method = ManualPaymentDetails & { id: string };

const TITLES: Record<ManualPaymentCode, string> = {
  vodafone_cash: "فودافون كاش",
  instapay: "إنستاباي",
};

const FIELDS: Array<{ key: keyof Method; label: string; codes: ManualPaymentCode[]; multiline?: boolean }> = [
  { key: "account_number", label: "رقم المحفظة / الحساب", codes: ["vodafone_cash", "instapay"] },
  { key: "account_name", label: "اسم صاحب الحساب", codes: ["vodafone_cash", "instapay"] },
  { key: "whatsapp_number", label: "رقم واتساب لتأكيد الدفع", codes: ["vodafone_cash", "instapay"] },
  { key: "instapay_address", label: "عنوان إنستاباي", codes: ["instapay"] },
  { key: "instructions_ar", label: "التعليمات (عربي)", codes: ["vodafone_cash", "instapay"], multiline: true },
  { key: "instructions_en", label: "التعليمات (إنجليزي)", codes: ["vodafone_cash", "instapay"], multiline: true },
];

function MethodCard({ initial, onToast }: { initial: Method; onToast: (msg: string, ok?: boolean) => void }) {
  const [form, setForm] = useState<Method>(initial);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = (k: keyof Method, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function uploadQr(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const r = await fetch("/api/admin/manual-payments/qr", { method: "POST", credentials: "include", body: fd });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "فشل رفع الصورة");
      set("qr_image_url", body.url);
    } catch (e) {
      onToast((e as Error).message, false);
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    try {
      const { id: _id, code, ...patch } = form;
      const r = await adminFetch(`/api/admin/manual-payments/${code}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const body = await r.json();
      if (!r.ok) throw new Error(body.error || "فشل الحفظ");
      setForm(body.method);
      onToast(`تم حفظ ${TITLES[code]}`);
    } catch (e) {
      onToast((e as Error).message, false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="border border-border bg-card p-5 space-y-4" data-testid={`manual-card-${form.code}`}>
      <h2 className="text-lg font-black text-primary">{TITLES[form.code]}</h2>
      {FIELDS.filter((f) => f.codes.includes(form.code)).map((f) => (
        <label key={f.key} className="block space-y-1">
          <span className="text-xs font-bold text-muted-foreground">{f.label}</span>
          {f.multiline ? (
            <textarea
              rows={3}
              className="w-full border border-input bg-background p-2 text-sm rounded-none"
              value={(form[f.key] as string | null) ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ) : (
            <Input
              className="rounded-none"
              value={(form[f.key] as string | null) ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          )}
        </label>
      ))}
      <div className="space-y-2">
        <span className="text-xs font-bold text-muted-foreground">
          صورة رمز QR {form.code === "vodafone_cash" ? "(اختياري)" : ""}
        </span>
        {form.qr_image_url && (
          <img src={form.qr_image_url} alt="QR" className="w-40 h-40 object-contain border border-border" />
        )}
        <div className="flex gap-2">
          <label className="inline-flex items-center gap-2 border border-border px-3 py-2 text-sm cursor-pointer">
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            رفع صورة
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => e.target.files?.[0] && uploadQr(e.target.files[0])}
            />
          </label>
          {form.qr_image_url && (
            <Button type="button" variant="outline" className="rounded-none" onClick={() => set("qr_image_url", "")}>
              إزالة
            </Button>
          )}
        </div>
      </div>
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} className="rounded-none gap-2 font-bold">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          حفظ
        </Button>
      </div>
    </div>
  );
}

export default function ManualPaymentsSettingsPage() {
  const [methods, setMethods] = useState<Method[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast, show } = useToast();

  useEffect(() => {
    adminFetch("/api/admin/manual-payments")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error || "تعذر التحميل");
        setMethods(body.methods);
      })
      .catch((e) => setLoadError((e as Error).message));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="الدفع اليدوي"
        subtitle="بيانات فودافون كاش وإنستاباي التي تظهر للمشتري. التفعيل لكل منطقة من إعدادات Medusa (Regions)."
        icon={Wallet}
      />
      {loadError && <div className="border border-red-500/40 bg-red-500/10 p-3 text-red-700">{loadError}</div>}
      {!methods && !loadError && <Loader2 className="w-5 h-5 animate-spin" />}
      <div className="grid gap-6 md:grid-cols-2">
        {methods?.map((m) => (
          <MethodCard key={m.code} initial={m} onToast={(msg, ok = true) => show(msg, ok ? "success" : "error")} />
        ))}
      </div>
      <Toast toast={toast} />
    </div>
  );
}
```
Before finalizing, open `apps/client/src/pages/admin/store/shipping.tsx` and match the exact `PageHeader` props and `useToast().show(...)` / `<Toast …/>` signatures it uses; adjust the three call sites above to those signatures.

Nav + route:
- `apps/client/src/pages/admin/layout.tsx` `NAV_ITEMS`, after the shipping entry: `{ href: "/admin/manual-payments", label: "الدفع اليدوي", icon: Wallet },` (add `Wallet` to the `lucide-react` import).
- `apps/client/src/App.tsx`: `import AdminManualPayments from "@/pages/admin/store/manual-payments";` and, next to the `AdminShipping` route inside the admin switch, `<Route path="/admin/manual-payments" component={AdminManualPayments} />` (mirror how `AdminShipping` is routed).

- [ ] **Step 2: Confirm payment button in orders**

In `apps/client/src/pages/admin/store/orders.tsx`:
1. Extend the order type: `paymentMethod: "paypal" | "card" | "wallet" | "cash_on_delivery" | "vodafone_cash" | "instapay" | null;`
2. Replace the method label ternary with:
```tsx
                          {o.paymentMethod === "paypal"
                            ? "PayPal"
                            : o.paymentMethod === "card"
                              ? "بطاقة ائتمان / خصم"
                              : o.paymentMethod === "wallet"
                                ? "محفظة إلكترونية"
                                : o.paymentMethod === "vodafone_cash"
                                  ? "فودافون كاش"
                                  : o.paymentMethod === "instapay"
                                    ? "إنستاباي"
                                    : "الدفع عند الاستلام"}
```
3. Add a handler inside the page component, next to the existing save/update helpers (use the same `adminFetch`, list state setter, and toast `show` the page already uses):
```tsx
  async function confirmPayment(id: number) {
    if (!window.confirm("تأكيد استلام الدفع لهذا الطلب؟ سيتم تفعيل الطلب وإرسال بريد للعميل.")) return;
    const r = await adminFetch(`${API_BASE}/admin/orders/${id}/confirm-payment`, { method: "POST" });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      show(body.error || "تعذر تأكيد الدفع", "error");
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...body } : o)));
    show("تم تأكيد الدفع", "success");
  }
```
(Rename `setOrders`/`show`/`API_BASE` to this file's actual identifiers.)
4. In the right-hand column (the `flex flex-col items-end gap-2` div, above the status `<select>`), add:
```tsx
                    {(o.paymentMethod === "vodafone_cash" || o.paymentMethod === "instapay") &&
                      o.paymentStatus !== "paid" &&
                      o.status !== "cancelled" && (
                        <Button
                          size="sm"
                          onClick={() => confirmPayment(o.id)}
                          className="rounded-none font-bold"
                          data-testid={`btn-confirm-payment-${o.id}`}
                        >
                          تأكيد الدفع
                        </Button>
                      )}
```

- [ ] **Step 3: Typecheck + tests**

Run: `pnpm --filter @workspace/client run typecheck` and `pnpm --filter @workspace/client exec vitest run`
Expected: PASS.

- [ ] **Step 4: Commit** (if authorized)

```bash
git add apps/client/src/pages/admin/store/manual-payments.tsx apps/client/src/pages/admin/store/orders.tsx apps/client/src/pages/admin/layout.tsx apps/client/src/App.tsx
git commit -m "feat(admin): manual payment settings and confirm payment in storefront admin"
```

---

### Task 14: End-to-end verification

**Files:** none (verification only).

- [ ] **Step 1: Full test + build**

Run: `pnpm test` then `pnpm build`
Expected: all suites pass; build succeeds.

- [ ] **Step 2: Local run**

```bash
pnpm dev:db && pnpm dev:medusa:redis
pnpm dev:medusa   # terminal 1
pnpm dev:api      # terminal 2
pnpm dev:client   # terminal 3
```

- [ ] **Step 3: Walk the flows**

1. Medusa Admin → Settings → Regions → EGP region → add payment providers `vodafone-cash` and `instapay`.
2. Medusa Admin → Settings → Manual payments: set Vodafone Cash number + WhatsApp number; InstaPay QR + address + WhatsApp number. Reload the storefront admin `/admin/manual-payments` — same values shown; edit a field there, reload Medusa — change visible.
3. Storefront: add a digital book → checkout → both options visible → choose Vodafone Cash → place order → lands on `/checkout/manual?orderId=…` showing number, amount, WhatsApp button (link opens `wa.me/20…` with the order message). Account page shows "Awaiting payment verification". Digital book cannot be opened yet (403 "Payment not completed").
4. Medusa Admin → Orders → that order → **Mark as paid** → within seconds Express order is `paid`, buyer gets the receipt email, book opens from the account page.
5. Place an InstaPay order → storefront admin `/admin/orders` → **Confirm payment** → order paid; Medusa order shows paid; only one receipt email arrives.
6. Stop Medusa, place nothing, press Confirm payment on a pending manual order → error toast, order still pending.

- [ ] **Step 4: Report** — list anything that failed with the observed output; do not claim success for steps not run.
