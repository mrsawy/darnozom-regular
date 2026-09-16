import { describe, it, expect, vi } from "vitest";
import reconcilePaymentsJob from "./reconcile-payments";

describe("reconcile-payments job", () => {
  it("captures the payment when re-authorizing a stale pending session resolves successfully", async () => {
    const capturePaymentMock = vi.fn().mockResolvedValue({ id: "pay_1" });
    const cancelPaymentMock = vi.fn();
    const container = {
      resolve: (key: string) => {
        if (key === "payment") {
          return {
            listPaymentSessions: vi.fn().mockResolvedValue([
              {
                id: "ps_1",
                status: "pending_authorization",
                provider_id: "paymob-card",
                data: { paymobOrderId: "pmb_1" },
                updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              },
            ]),
            authorizePaymentSession: vi.fn().mockResolvedValue({ id: "pay_1" }),
            capturePayment: capturePaymentMock,
            cancelPayment: cancelPaymentMock,
          };
        }
        throw new Error(`Unexpected resolve: ${key}`);
      },
    };

    await reconcilePaymentsJob(container as any);

    expect(capturePaymentMock).toHaveBeenCalledWith(
      expect.objectContaining({ payment_id: "pay_1" }),
    );
    expect(cancelPaymentMock).not.toHaveBeenCalled();
  });

  it("cancels the payment when re-authorizing a stale pending session comes back canceled/errored", async () => {
    const capturePaymentMock = vi.fn();
    const cancelPaymentMock = vi.fn().mockResolvedValue({ id: "pay_2" });
    const container = {
      resolve: (key: string) => {
        if (key === "payment") {
          return {
            listPaymentSessions: vi.fn().mockResolvedValue([
              {
                id: "ps_2",
                status: "pending_authorization",
                provider_id: "paypal-egp",
                data: {},
                updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
              },
            ]),
            authorizePaymentSession: vi.fn().mockResolvedValue(null),
            retrievePaymentSession: vi.fn().mockResolvedValue({
              id: "ps_2",
              status: "canceled",
              payment: { id: "pay_2" },
            }),
            capturePayment: capturePaymentMock,
            cancelPayment: cancelPaymentMock,
          };
        }
        throw new Error(`Unexpected resolve: ${key}`);
      },
    };

    await reconcilePaymentsJob(container as any);

    expect(cancelPaymentMock).toHaveBeenCalledWith("pay_2");
    expect(capturePaymentMock).not.toHaveBeenCalled();
  });

  it("leaves recently-created pending sessions alone (below the staleness threshold)", async () => {
    const capturePaymentMock = vi.fn();
    const cancelPaymentMock = vi.fn();
    const authorizePaymentSessionMock = vi.fn();
    const container = {
      resolve: (key: string) => {
        if (key === "payment") {
          return {
            listPaymentSessions: vi.fn().mockResolvedValue([
              {
                id: "ps_3",
                status: "pending_authorization",
                provider_id: "paymob-wallet",
                data: {},
                updated_at: new Date().toISOString(),
              },
            ]),
            authorizePaymentSession: authorizePaymentSessionMock,
            capturePayment: capturePaymentMock,
            cancelPayment: cancelPaymentMock,
          };
        }
        throw new Error(`Unexpected resolve: ${key}`);
      },
    };

    await reconcilePaymentsJob(container as any);

    expect(authorizePaymentSessionMock).not.toHaveBeenCalled();
    expect(capturePaymentMock).not.toHaveBeenCalled();
    expect(cancelPaymentMock).not.toHaveBeenCalled();
  });
});
