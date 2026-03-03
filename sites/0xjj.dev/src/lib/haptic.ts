import { WebHaptics } from "web-haptics";

const instance = typeof window !== "undefined" ? new WebHaptics() : null;

export function haptic() {
  instance?.trigger("light");
}
