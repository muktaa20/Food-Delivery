/** Login and signup forms (shared by login.html and signup.html). */
import { $ } from "../utils/dom.js";
import { signup, login } from "../store.js";

const MIN_PASSWORD_LENGTH = 5;
const AFTER_AUTH_URL = "index.html";

function initSignupForm() {
  const form = $("#signup-form");
  if (!form) return;
  const error = $("#signup-error");

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const name = form["name"].value.trim();
    const username = form["username"].value.trim();
    const email = form["email"].value.trim();
    const password = form["password"].value;

    if (!name || !username || !email || !password) {
      error.textContent = "Please fill all fields.";
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      error.textContent = `Password should be at least ${MIN_PASSWORD_LENGTH} characters.`;
      return;
    }

    const result = signup({ name, username, email, password });
    if (!result.ok) {
      error.textContent = result.error;
      return;
    }
    window.location.href = AFTER_AUTH_URL;
  });
}

function initLoginForm() {
  const form = $("#login-form");
  if (!form) return;
  const error = $("#login-error");

  form.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const identifier = form["username"].value.trim();
    const password = form["password"].value;

    if (!identifier || !password) {
      error.textContent = "Please fill all fields.";
      return;
    }

    const result = login(identifier, password);
    if (!result.ok) {
      error.textContent = result.error;
      return;
    }
    window.location.href = AFTER_AUTH_URL;
  });
}

export function init() {
  initSignupForm();
  initLoginForm();
}
