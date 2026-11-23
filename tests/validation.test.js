import { describe, it, expect } from "vitest";
import {
  cardBrand,
  formatCardNumber,
  formatExpiry,
  luhnValid,
  validateAddress,
  validateCardNumber,
  validateCvv,
  validateExpiry,
  validatePhone,
  validatePincode,
  validateUpi,
} from "../js/domain/validation.js";

describe("contact & address", () => {
  it("accepts Indian mobile numbers with optional +91 / 0 prefix", () => {
    expect(validatePhone("9876543210")).toBe("");
    expect(validatePhone("+91 98765 43210")).toBe("");
    expect(validatePhone("09876543210")).toBe("");
    expect(validatePhone("1234567890")).toMatch(/valid 10-digit/);
    expect(validatePhone("98765")).toMatch(/valid 10-digit/);
    expect(validatePhone("")).toBe("Enter your mobile number.");
  });

  it("validates 6-digit PIN codes that don't start with 0", () => {
    expect(validatePincode("411001")).toBe("");
    expect(validatePincode("011001")).not.toBe("");
    expect(validatePincode("4110")).not.toBe("");
  });

  it("returns the first address error", () => {
    const good = { name: "Asha", phone: "9876543210", flat: "12B", area: "FC Road", city: "Pune", pincode: "411004" };
    expect(validateAddress(good)).toBe("");
    expect(validateAddress({ ...good, flat: " " })).toBe("Enter your flat / house number.");
    expect(validateAddress({})).toBe("Enter your name.");
  });
});

describe("payment", () => {
  it("validates UPI IDs", () => {
    expect(validateUpi("asha.k@okaxis")).toBe("");
    expect(validateUpi("asha@")).not.toBe("");
    expect(validateUpi("no-at-sign")).not.toBe("");
  });

  it("runs the Luhn checksum", () => {
    expect(luhnValid("4111 1111 1111 1111")).toBe(true);
    expect(luhnValid("4111 1111 1111 1112")).toBe(false);
    expect(validateCardNumber("5555555555554444")).toBe("");
    expect(validateCardNumber("1234")).toBe("Enter a valid card number.");
  });

  it("detects card brands", () => {
    expect(cardBrand("4111")).toBe("visa");
    expect(cardBrand("5555")).toBe("mastercard");
    expect(cardBrand("2221")).toBe("mastercard");
    expect(cardBrand("3782")).toBe("amex");
    expect(cardBrand("6522")).toBe("rupay");
  });

  it("treats a card as valid through the end of its expiry month", () => {
    const now = new Date("2026-09-30T12:00:00");
    expect(validateExpiry("09/26", now)).toBe("");
    expect(validateExpiry("08/26", now)).toBe("This card has expired.");
    expect(validateExpiry("13/27", now)).toBe("Enter expiry as MM/YY.");
  });

  it("needs a 4-digit CVV for Amex, 3 otherwise", () => {
    expect(validateCvv("123")).toBe("");
    expect(validateCvv("123", "amex")).toBe("Enter the 4-digit CVV.");
    expect(validateCvv("1234", "amex")).toBe("");
  });

  it("formats card numbers and expiry while typing", () => {
    expect(formatCardNumber("4111111111111111")).toBe("4111 1111 1111 1111");
    expect(formatCardNumber("4111-1111")).toBe("4111 1111");
    expect(formatExpiry("1228")).toBe("12/28");
    expect(formatExpiry("4")).toBe("04");
    expect(formatExpiry("12/")).toBe("12");
  });
});
