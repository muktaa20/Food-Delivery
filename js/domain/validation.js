/**
 * Checkout field validators. Each returns an error message, or "" when valid.
 * Shared by the checkout form (inline errors) and POST /api/orders (server-side re-check).
 */

const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");

export const required = (label) => (value) => (String(value ?? "").trim() ? "" : `Enter ${label}.`);

export function validateName(value) {
  const name = String(value ?? "").trim();
  if (!name) return "Enter your name.";
  if (name.length < 2) return "Name looks too short.";
  return "";
}

/** Indian mobile numbers: 10 digits starting 6-9, optionally prefixed with +91 or 0. */
export function normalizePhone(value) {
  return String(value ?? "").replace(/[\s()-]/g, "").replace(/^(\+91|0)(?=\d{10}$)/, "");
}

export function validatePhone(value) {
  if (!String(value ?? "").trim()) return "Enter your mobile number.";
  return /^[6-9]\d{9}$/.test(normalizePhone(value)) ? "" : "Enter a valid 10-digit mobile number.";
}

export function validatePincode(value) {
  if (!String(value ?? "").trim()) return "Enter your PIN code.";
  return /^[1-9]\d{5}$/.test(String(value).trim()) ? "" : "Enter a valid 6-digit PIN code.";
}

export function validateUpi(value) {
  if (!String(value ?? "").trim()) return "Enter your UPI ID.";
  return /^[\w.-]{2,256}@[a-zA-Z]{2,64}$/.test(String(value).trim()) ? "" : "Enter a valid UPI ID, like name@okaxis.";
}

/** Luhn checksum used by all major card networks. */
export function luhnValid(number) {
  const digits = digitsOnly(number);
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return digits.length > 0 && sum % 10 === 0;
}

export function cardBrand(number) {
  const digits = digitsOnly(number);
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(60|65|81|82|508)/.test(digits)) return "rupay";
  return "card";
}

export function validateCardNumber(value) {
  const digits = digitsOnly(value);
  if (!digits) return "Enter your card number.";
  if (digits.length < 13 || digits.length > 19 || !luhnValid(digits)) return "Enter a valid card number.";
  return "";
}

/** MM/YY; a card is valid through the last day of its expiry month. */
export function validateExpiry(value, now = new Date()) {
  const match = String(value ?? "").trim().match(/^(0[1-9]|1[0-2])\s*\/\s*(\d{2})$/);
  if (!match) return "Enter expiry as MM/YY.";
  const [, month, year] = match;
  const endOfMonth = new Date(2000 + Number(year), Number(month), 1);
  return endOfMonth > now ? "" : "This card has expired.";
}

export function validateCvv(value, brand = "card") {
  const length = brand === "amex" ? 4 : 3;
  return new RegExp(`^\\d{${length}}$`).test(String(value ?? "").trim()) ? "" : `Enter the ${length}-digit CVV.`;
}

/** "4111111111111111" -> "4111 1111 1111 1111" (max 19 digits). */
export const formatCardNumber = (value) => digitsOnly(value).slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");

/** "123" -> "12/3"; typing a single digit month > 1 pads it ("4" -> "04/"). */
export function formatExpiry(value) {
  let digits = digitsOnly(value).slice(0, 4);
  if (/^[2-9]$/.test(digits)) digits = `0${digits}`;
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export const ADDRESS_VALIDATORS = {
  name: validateName,
  phone: validatePhone,
  flat: required("your flat / house number"),
  area: required("your street or area"),
  city: required("your city"),
  pincode: validatePincode,
};

/** First error in an address object, or "" (used server-side). */
export function validateAddress(address = {}) {
  for (const [field, validate] of Object.entries(ADDRESS_VALIDATORS)) {
    const error = validate(address[field]);
    if (error) return error;
  }
  return "";
}
