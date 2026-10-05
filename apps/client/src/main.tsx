import { createRoot } from "react-dom/client";
import App from "./App";
import "@fontsource-variable/noto-sans-arabic";
import "@fontsource-variable/inter";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
