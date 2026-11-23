/**
 * Short, auto-dismissing status messages in the corner of the screen.
 * Toasts stack in a single live region, and can carry one action (e.g. "Undo").
 */
const ACTION_MIN_DURATION = 5000;

function getRegion() {
  let region = document.querySelector(".toast-region");
  if (!region) {
    region = document.createElement("div");
    region.className = "toast-region";
    region.setAttribute("aria-live", "polite");
    document.body.appendChild(region);
  }
  return region;
}

/**
 * @param {string} message
 * @param {{ duration?: number, action?: { label: string, onClick: () => void } }} [options]
 *   Toasts with an action stay up for at least 5 s so there's time to use it.
 */
export function showToast(message, { duration = 1200, action } = {}) {
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", "status");

  const text = document.createElement("span");
  text.textContent = message;
  el.appendChild(text);

  const dismiss = () => el.remove();

  if (action) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toast-action";
    btn.textContent = action.label;
    btn.addEventListener("click", () => {
      dismiss();
      action.onClick();
    });
    el.appendChild(btn);
  }

  getRegion().appendChild(el);
  setTimeout(dismiss, action ? Math.max(duration, ACTION_MIN_DURATION) : duration);
}
