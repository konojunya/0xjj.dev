export const supportsHaptic =
  typeof window !== "undefined"
    ? window.matchMedia("(pointer: coarse)").matches
    : false;

function hasVibrate(
  nav: Navigator,
): nav is Navigator & { vibrate: (pattern: number | number[]) => boolean } {
  return "vibrate" in nav && typeof nav.vibrate === "function";
}

/**
 * Trigger haptic feedback on mobile devices.
 * Uses Vibration API on Android, and iOS checkbox trick on iOS.
 */
export function haptic() {
  try {
    if (!supportsHaptic) return;

    if (hasVibrate(navigator)) {
      navigator.vibrate(50);
      return;
    }

    // iOS haptic trick via checkbox switch element
    const label = document.createElement("label");
    label.ariaHidden = "true";
    label.style.display = "none";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);

    try {
      document.head.appendChild(label);
      label.click();
    } finally {
      document.head.removeChild(label);
    }
  } catch {}
}
