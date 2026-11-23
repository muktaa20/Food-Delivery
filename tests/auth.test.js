import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash, webcrypto } from "node:crypto";
import { sha256Hex } from "../js/utils/sha256.js";

const data = new Map();
let failWrites = false;
vi.stubGlobal("localStorage", {
  getItem: (key) => (data.has(key) ? data.get(key) : null),
  setItem: (key, value) => {
    if (failWrites) throw new Error("QuotaExceededError");
    data.set(key, String(value));
  },
  removeItem: (key) => data.delete(key),
});
vi.stubGlobal("window", { addEventListener() {} });

const store = await import("../js/store.js");
const { KEYS, readJSON, writeJSON } = await import("../js/services/storage.js");

const account = (username, password = "password1") => ({
  name: username,
  username,
  email: `${username}@example.com`,
  password,
});
const cart = { restaurant: { id: "r1", name: "Burger Barn" }, items: { p1: 2 } };

beforeEach(() => {
  data.clear();
  failWrites = false;
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("sha256Hex", () => {
  it.each([0, 1, 55, 56, 63, 64, 119, 120, 1000])("matches Node for %i bytes", (size) => {
    const bytes = new Uint8Array(size).map((_, i) => i * 7);
    expect(sha256Hex(bytes)).toBe(createHash("sha256").update(bytes).digest("hex"));
  });
});

describe("accounts", () => {
  it("works without crypto.subtle, as on plain HTTP", async () => {
    vi.stubGlobal("crypto", { getRandomValues: (a) => webcrypto.getRandomValues(a) });
    try {
      expect((await store.signup(account("ana"))).ok).toBe(true);
      store.logout();
      expect((await store.login("ana", "password1")).ok).toBe(true);
    } finally {
      vi.stubGlobal("crypto", webcrypto);
    }
  });

  it("reports signup failure and saves nothing when storage is full", async () => {
    failWrites = true;
    expect((await store.signup(account("ana"))).ok).toBe(false);
    failWrites = false;
    expect(readJSON(KEYS.users, [])).toEqual([]);
    expect(store.getAuth()).toBeNull();
  });

  it("logs legacy accounts differing only by case into the right one", async () => {
    writeJSON(KEYS.users, [account("Bob", "first-pass"), account("bob", "second-pass")]);
    expect((await store.login("bob", "second-pass")).ok).toBe(true);
    expect(store.getAuth().username).toBe("bob");
  });

  it("resets only the exact legacy account", async () => {
    writeJSON(KEYS.users, [account("Bob", "first-pass"), account("bob", "second-pass")]);
    const { code } = await store.requestPasswordReset("bob");
    await store.verifyResetCode(code);
    expect((await store.setNewPassword("changed-pass")).ok).toBe(true);
    expect((await store.login("Bob", "first-pass")).ok).toBe(true);
    expect(store.getAuth().username).toBe("Bob");
    store.logout();
    expect((await store.login("bob", "changed-pass")).ok).toBe(true);
    expect(store.getAuth().username).toBe("bob");
  });

  it("refuses an ambiguous reset", async () => {
    writeJSON(KEYS.users, [account("Bob"), account("bob")]);
    expect((await store.requestPasswordReset("BOB")).ok).toBe(false);
  });
});

describe("per-user data", () => {
  it("hides one user's cart, order and address from the next, then restores them", async () => {
    await store.signup(account("ana"));
    writeJSON(KEYS.cart, cart);
    store.completeCheckout("order-1");
    writeJSON(KEYS.cart, cart);
    store.saveAddress({ name: "Ana", line1: "1 Main St" });
    store.logout();

    expect(store.getCartCount()).toBe(0);
    expect(store.getActiveOrderId()).toBeNull();
    expect(store.getSavedAddress()).toBeNull();

    await store.signup(account("ben"));
    expect(store.getCartCount()).toBe(0);
    expect(store.getSavedAddress()).toBeNull();
    store.logout();

    await store.login("ana", "password1");
    expect(store.getCartCount()).toBe(2);
    expect(store.getActiveOrderId()).toBe("order-1");
    expect(store.getSavedAddress().name).toBe("Ana");
  });
});
