import { createRoot } from "react-dom/client";

// crypto.randomUUID is only available on localhost or HTTPS (secure contexts).
// Polyfill it for http:// dev access via IP or custom hostnames.
if (typeof crypto.randomUUID !== "function") {
  crypto.randomUUID = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const h = (n: number) => n.toString(16).padStart(2, "0");
    return `${h(bytes[0])}${h(bytes[1])}${h(bytes[2])}${h(bytes[3])}-${h(bytes[4])}${h(bytes[5])}-${h(bytes[6])}${h(bytes[7])}-${h(bytes[8])}${h(bytes[9])}-${h(bytes[10])}${h(bytes[11])}${h(bytes[12])}${h(bytes[13])}${h(bytes[14])}${h(bytes[15])}` as `${string}-${string}-${string}-${string}-${string}`;
  };
}
import App from "./App";
import "@fontsource-variable/noto-sans-arabic";
import "@fontsource-variable/inter";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
