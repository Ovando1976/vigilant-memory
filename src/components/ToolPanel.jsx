import React, { useEffect, useMemo, useRef, useState } from "react";

const functionDescription = `
Call this function when a user asks for a color palette.
`;

const paletteToolDef = {
  type: "function",
  name: "display_color_palette",
  description: functionDescription,
  parameters: {
    type: "object",
    strict: true,
    properties: {
      theme: {
        type: "string",
        description: "Description of the theme for the color scheme.",
      },
      colors: {
        type: "array",
        description: "Array of five hex color codes based on the theme.",
        items: {
          type: "string",
          description: "Hex color code",
        },
      },
    },
    required: ["theme", "colors"],
  },
};

const sessionUpdate = {
  type: "session.update",
  session: {
    type: "realtime",
    tools: [paletteToolDef],
    tool_choice: "auto",
  },
};

/* ----------------------------- utils ----------------------------- */

function parseArgsMaybeJson(args) {
  if (!args) return null;
  if (typeof args === "object") return args;
  if (typeof args === "string") {
    try {
      return JSON.parse(args);
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeHex(c) {
  if (typeof c !== "string") return null;
  const s = c.trim();
  if (/^#?[0-9a-f]{3}$/i.test(s)) {
    const h = s.replace(/^#/, "");
    // expand #abc → #aabbcc
    return (
      "#" +
      h
        .split("")
        .map((ch) => ch + ch)
        .join("")
        .toLowerCase()
    );
  }
  if (/^#?[0-9a-f]{6}$/i.test(s)) return ("#" + s.replace(/^#/, "")).toLowerCase();
  // If author gave a CSS color name or rgb(), allow it through
  if (/^(rgb|hsl)a?\(/i.test(s) || /^[a-z]+$/i.test(s)) return s;
  return null;
}

function textColorFor(bg) {
  // For hex -> compute luma; else default to black text on light backgrounds
  const hex = /^#([0-9a-f]{6})$/i.exec(bg);
  if (!hex) return "#000";
  const n = parseInt(hex[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // relative luminance
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luma < 140 ? "#fff" : "#000";
}

/* --------------------------- subcomponent --------------------------- */

function FunctionCallOutput({ output }) {
  const parsed = parseArgsMaybeJson(output?.arguments);
  if (!parsed) {
    return (
      <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
        Could not read function call arguments.
      </div>
    );
  }

  const theme = parsed.theme ?? "";
  const colors = Array.isArray(parsed.colors) ? parsed.colors : [];
  const normalized = colors
    .map(normalizeHex)
    .filter(Boolean)
    .slice(0, 5);

  async function copyToClipboard(value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // noop
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        <span className="font-semibold">Theme:</span> {theme || "—"}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {normalized.map((color) => (
          <button
            key={color}
            type="button"
            className="w-full h-16 rounded-md border border-gray-200 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ backgroundColor: color, color: textColorFor(color) }}
            onClick={() => copyToClipboard(color)}
            title="Click to copy"
          >
            <span className="text-sm font-semibold drop-shadow-sm">{color}</span>
          </button>
        ))}
      </div>

      <pre className="text-xs bg-gray-100 rounded-md p-2 overflow-x-auto border border-gray-200">
        {JSON.stringify(output, null, 2)}
      </pre>
    </div>
  );
}

/* ------------------------------- main ------------------------------- */

export default function ToolPanel({ isSessionActive, sendClientEvent, events }) {
  const [functionCallOutput, setFunctionCallOutput] = useState(null);

  // Keep a stable ref to the sender to avoid adding it to effect deps
  const sendRef = useRef(sendClientEvent);
  useEffect(() => {
    sendRef.current = sendClientEvent;
  }, [sendClientEvent]);

  // Track whether we've already sent the tool definition for the current session
  const toolRegisteredRef = useRef(false);

  // Deduplicate triggers from the same response
  const processedResponseIds = useRef(new Set());

  // Find latest session.created, scanning from newest → oldest
  const hasSessionCreated = useMemo(() => {
    if (!Array.isArray(events) || events.length === 0) return false;
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i]?.type === "session.created") return true;
    }
    return false;
  }, [events]);

  // (1) On session start, send the tool registration exactly once.
  useEffect(() => {
    if (!isSessionActive) {
      toolRegisteredRef.current = false;
      processedResponseIds.current.clear();
      setFunctionCallOutput(null);
      return;
    }
    if (hasSessionCreated && !toolRegisteredRef.current) {
      sendRef.current?.(sessionUpdate);
      toolRegisteredRef.current = true;
    }
  }, [isSessionActive, hasSessionCreated]);

  // (2) Watch for the specific function_call in the most recent response.done
  const latestPaletteCall = useMemo(() => {
    if (!Array.isArray(events) || events.length === 0) return null;

    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      if (ev?.type !== "response.done") continue;
      const resp = ev.response;
      const respId = resp?.id || ev.id || `idx-${i}`;
      if (processedResponseIds.current.has(respId)) continue;

      const call =
        Array.isArray(resp?.output) &&
        resp.output.find(
          (o) =>
            o?.type === "function_call" && o?.name === "display_color_palette"
        );
      if (call) {
        processedResponseIds.current.add(respId);
        return call;
      }
    }
    return null;
  }, [events]);

  // (3) When we see the function call, display it and auto-ask for feedback
  useEffect(() => {
    if (!latestPaletteCall) return;
    setFunctionCallOutput(latestPaletteCall);

    const t = setTimeout(() => {
      sendRef.current?.({
        type: "response.create",
        response: {
          instructions:
            "Ask for feedback about the color palette—do not repeat the colors, just ask if they like them.",
        },
      });
    }, 250);

    return () => clearTimeout(t);
  }, [latestPaletteCall]);

  // (4) Reset UI if session ends
  useEffect(() => {
    if (!isSessionActive) {
      setFunctionCallOutput(null);
    }
  }, [isSessionActive]);

  return (
    <section className="h-full w-full flex flex-col gap-4">
      <div className="h-full bg-gray-50 rounded-md p-4 border border-gray-200">
        <h2 className="text-lg font-bold">Color Palette Tool</h2>
        {isSessionActive ? (
          functionCallOutput ? (
            <FunctionCallOutput output={functionCallOutput} />
          ) : (
            <p className="text-sm text-gray-600">
              Ask for advice on a color palette…
            </p>
          )
        ) : (
          <p className="text-sm text-gray-600">
            Start the session to use this tool…
          </p>
        )}
      </div>
    </section>
  );
}