/**
 * Delay calls to `fn` until `wait` ms have passed without another call.
 * The returned function also has `.cancel()` and `.flush()` (run a pending call now).
 */
export function debounce(fn, wait) {
  let timer = null;
  let pendingArgs = null;

  const run = () => {
    timer = null;
    const args = pendingArgs;
    pendingArgs = null;
    fn(...args);
  };

  const debounced = (...args) => {
    pendingArgs = args;
    clearTimeout(timer);
    timer = setTimeout(run, wait);
  };

  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
    pendingArgs = null;
  };

  debounced.flush = () => {
    if (timer === null) return;
    clearTimeout(timer);
    run();
  };

  return debounced;
}
