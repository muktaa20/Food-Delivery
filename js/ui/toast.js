/** Show a short, auto-dismissing status message in the corner of the screen. */
export function showToast(message, { duration = 1200 } = {}) {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), duration);
}
