/**
 * Promise-based confirm dialog built on the native <dialog> element, which
 * provides focus trapping, Escape-to-close and a backdrop for free.
 */
import { escapeHtml } from "../utils/format.js";

/**
 * @param {{ title: string, message: string, confirmLabel?: string, cancelLabel?: string }} options
 * @returns {Promise<boolean>} true if the user confirmed
 */
export function confirmDialog({ title, message, confirmLabel = "Confirm", cancelLabel = "Cancel" }) {
  const dialog = document.createElement("dialog");
  dialog.className = "confirm-dialog";
  dialog.setAttribute("aria-labelledby", "confirm-dialog-title");
  dialog.innerHTML = `
    <form method="dialog">
      <h3 id="confirm-dialog-title">${escapeHtml(title)}</h3>
      <p>${escapeHtml(message)}</p>
      <div class="dialog-actions">
        <button class="btn btn-ghost" value="cancel">${escapeHtml(cancelLabel)}</button>
        <button class="btn" value="confirm" autofocus>${escapeHtml(confirmLabel)}</button>
      </div>
    </form>
  `;
  document.body.appendChild(dialog);

  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => {
        resolve(dialog.returnValue === "confirm");
        dialog.remove();
      },
      { once: true }
    );
    // Clicking the backdrop (the dialog element itself, outside the form) cancels.
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close("cancel");
    });
    dialog.showModal();
  });
}
