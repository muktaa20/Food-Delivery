/**
 * Login and signup forms (shared by login.html and signup.html).
 * Accounts are stored in localStorage via store.js. After success we return
 * the user to `?next=` (same-site pages only) or the home page.
 */
import { $, $$ } from "../utils/dom.js";
import { enableSubmit } from "../utils/forms.js";
import { getAuth, signup, login, requestPasswordReset, verifyResetCode, setNewPassword } from "../store.js";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;

/** Only allow relative same-site page targets, so ?next= can't redirect off-site. */
function nextUrl() {
  const next = new URLSearchParams(location.search).get("next") ?? "";
  return /^[a-z]+\.html([?#].*)?$/i.test(next) ? next : "index.html";
}

function setFieldError(form, name, message) {
  const input = form[name];
  const slot = form.querySelector(`[data-error-for="${name}"]`);
  if (input) input.setAttribute("aria-invalid", message ? "true" : "false");
  if (slot) slot.textContent = message ?? "";
}

function clearErrors(form) {
  $$("[data-error-for]", form).forEach((el) => (el.textContent = ""));
  $$("[aria-invalid]", form).forEach((el) => el.setAttribute("aria-invalid", "false"));
}

/** Score 0-4 from length and character variety. */
function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= MIN_PASSWORD_LENGTH) score++;
  if (pw.length >= 12) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^a-zA-Z0-9]/.test(pw)) score++;
  return score;
}

const STRENGTH_LABELS = ["Too short", "Weak", "Fair", "Good", "Strong"];

function bindPasswordToggles(form) {
  $$("[data-toggle-password]", form).forEach((btn) => {
    const input = form[btn.dataset.togglePassword];
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", String(show));
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      btn.innerHTML = `<i class="fa-regular ${show ? "fa-eye-slash" : "fa-eye"}" aria-hidden="true"></i>`;
    });
  });
}

function bindPasswordMeter(form) {
  const meter = $("#password-meter", form);
  form["password"].addEventListener("input", () => {
    const pw = form["password"].value;
    const score = pw ? passwordStrength(pw) : 0;
    meter.dataset.score = pw ? String(score) : "";
    meter.querySelector("span").textContent = pw ? STRENGTH_LABELS[score] : "";
  });
}

async function withBusy(form, label, task) {
  const button = form.querySelector('button[type="submit"]');
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> ${label}`;
  try {
    return await task();
  } finally {
    button.disabled = false;
    button.innerHTML = original;
  }
}

function initSignupForm() {
  const form = $("#signup-form");
  if (!form) return;
  bindPasswordMeter(form);

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearErrors(form);
    const name = form["name"].value.trim();
    const username = form["username"].value.trim();
    const email = form["email"].value.trim();
    const password = form["password"].value;
    const confirm = form["confirm"].value;

    const errors = {};
    if (name.length < 2) errors.name = "Enter your full name.";
    if (!USERNAME_RE.test(username)) errors.username = "3–20 letters, numbers, dots or underscores.";
    if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";
    if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    if (confirm !== password) errors.confirm = "Passwords don't match.";
    if (!form["terms"].checked) errors.terms = "Please accept the terms to continue.";

    const fields = Object.keys(errors);
    if (fields.length) {
      fields.forEach((f) => setFieldError(form, f, errors[f]));
      form[fields[0]]?.focus();
      return;
    }

    const result = await withBusy(form, "Creating account…", () => signup({ name, username, email, password }));
    if (!result.ok) {
      setFieldError(form, result.field ?? "email", result.error);
      form[result.field ?? "email"]?.focus();
      return;
    }
    location.href = nextUrl();
  });
  bindPasswordToggles(form);
  enableSubmit(form);
}

function initLoginForm() {
  const form = $("#login-form");
  if (!form) return;
  const error = $("#login-error");
  if (new URLSearchParams(location.search).has("reset")) $("#login-notice").hidden = false;

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearErrors(form);
    error.textContent = "";
    const identifier = form["username"].value.trim();
    const password = form["password"].value;

    if (!identifier) setFieldError(form, "username", "Enter your username or email.");
    if (!password) setFieldError(form, "password", "Enter your password.");
    if (!identifier || !password) return;

    const result = await withBusy(form, "Signing in…", () => login(identifier, password));
    if (!result.ok) {
      error.textContent = result.error;
      form["password"].select();
      return;
    }
    location.href = nextUrl();
  });
  bindPasswordToggles(form);
  enableSubmit(form);
}

/** Three steps on one page: find account, enter code, set new password. */
function initForgotPassword() {
  const requestForm = $("#forgot-form");
  if (!requestForm) return;
  const codeForm = $("#code-form");
  const passwordForm = $("#new-password-form");
  const title = $("#forgot-title");
  const sub = $("#forgot-sub");
  let identifier = "";

  const showStep = (form, heading, text) => {
    [requestForm, codeForm, passwordForm].forEach((f) => (f.hidden = f !== form));
    title.textContent = heading;
    sub.textContent = text;
    form.querySelector("input:not([type=checkbox])")?.focus();
  };

  async function sendCode() {
    const result = await requestPasswordReset(identifier);
    if (!result.ok) return result;
    $("#demo-code").textContent = result.code;
    $("#demo-minutes").textContent = result.minutes;
    codeForm.reset();
    clearErrors(codeForm);
    showStep(codeForm, "Enter your reset code", `Enter the 6-digit code for ${result.email}.`);
    return result;
  }

  const backToStart = (message) => {
    showStep(requestForm, "Forgot your password?", "Enter your username or email and we'll give you a reset code.");
    setFieldError(requestForm, "identifier", message);
  };

  requestForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearErrors(requestForm);
    identifier = requestForm["identifier"].value.trim();
    if (!identifier) return setFieldError(requestForm, "identifier", "Enter your username or email.");
    const result = await withBusy(requestForm, "Checking…", sendCode);
    if (!result.ok) setFieldError(requestForm, "identifier", result.error);
  });

  codeForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearErrors(codeForm);
    const code = codeForm["code"].value.trim();
    if (!/^\d{6}$/.test(code)) return setFieldError(codeForm, "code", "Enter the 6-digit code.");
    const result = await withBusy(codeForm, "Verifying…", () => verifyResetCode(code));
    if (result.ok) showStep(passwordForm, "Set a new password", "Choose a new password for your account.");
    else if (result.expired) backToStart(result.error);
    else {
      setFieldError(codeForm, "code", result.error);
      codeForm["code"].select();
    }
  });

  $("#resend-code").addEventListener("click", sendCode);

  passwordForm.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    clearErrors(passwordForm);
    const password = passwordForm["password"].value;
    let invalid = false;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFieldError(passwordForm, "password", `Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      invalid = true;
    }
    if (passwordForm["confirm"].value !== password) {
      setFieldError(passwordForm, "confirm", "Passwords don't match.");
      invalid = true;
    }
    if (invalid) return;
    const result = await withBusy(passwordForm, "Saving…", () => setNewPassword(password));
    if (result.ok) {
      const params = new URLSearchParams({ reset: "1" });
      const next = new URLSearchParams(location.search).get("next");
      if (next) params.set("next", next);
      location.href = `login.html?${params}`;
    } else if (result.expired) backToStart(result.error);
    else setFieldError(passwordForm, "password", result.error);
  });

  bindPasswordMeter(passwordForm);
  bindPasswordToggles(passwordForm);
  [requestForm, codeForm, passwordForm].forEach(enableSubmit);
}

/** Keep ?next= when switching between login and signup. */
function carryNextParam() {
  const next = new URLSearchParams(location.search).get("next");
  if (!next) return;
  $$("a[data-auth-switch]").forEach((a) => (a.href = `${a.getAttribute("href")}?next=${encodeURIComponent(next)}`));
}

export function init() {
  if (getAuth()) {
    location.replace(nextUrl());
    return;
  }
  carryNextParam();
  initSignupForm();
  initLoginForm();
  initForgotPassword();
}
