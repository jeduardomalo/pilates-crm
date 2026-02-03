"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", background: "#F9F8F6", color: "#333" }}>
        <div style={{ maxWidth: "28rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#666", fontSize: "0.875rem", marginBottom: "1.5rem", whiteSpace: "pre-wrap" }}>
            {error.message}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              width: "100%",
              background: "#333",
              color: "white",
              padding: "0.5rem 1rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
