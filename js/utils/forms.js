/** Submit buttons ship `disabled` in the HTML; call this after binding the form's submit handler. */
export function enableSubmit(form) {
  form.querySelectorAll('[type="submit"]').forEach((btn) => (btn.disabled = false));
}
