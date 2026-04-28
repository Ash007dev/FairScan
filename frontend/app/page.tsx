"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileCheck, AlertTriangle, Zap, Cpu, ExternalLink } from "@/components/Icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const SENSITIVE_WORDS = ["gender", "sex", "race", "ethnicity", "age",
  "religion", "nationality", "marital", "disability", "zip", "native", "caste"];

function isSensitive(col: string): boolean {
  const clean = col.toLowerCase().replace(/[_\-\s]/g, "");
  return SENSITIVE_WORDS.some(w => clean.includes(w));
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [decisionCol, setDecisionCol] = useState("");
  const [modelName, setModelName] = useState("Hiring Screening Model v2");
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const dropRef = useRef<HTMLLabelElement>(null);

  async function parseFile(picked: File) {
    setFile(picked);
    setError("");
    setDecisionCol("");
    const text = await picked.text();
    const firstLine = text.split("\n")[0];
    const cols = firstLine.split(",").map(c => c.trim().replace(/"/g, ""));
    setColumns(cols);
    if (cols.includes("income")) setDecisionCol("income");
    else if (cols.includes("class")) setDecisionCol("class");
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) parseFile(picked);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const picked = e.dataTransfer.files?.[0];
    if (picked?.name.endsWith(".csv")) parseFile(picked);
  }

  async function handleSubmit() {
    if (!file) { setError("Please upload a CSV file first."); return; }
    if (!decisionCol) { setError("Please select the decision column."); return; }
    setLoading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("decision_column", decisionCol);
      form.append("model_name", modelName);
      const res = await fetch(`${API_URL}/audit`, { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Upload failed");
      }
      const data = await res.json();
      router.push(`/loading/${data.audit_id}`);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Is the backend running?");
      setLoading(false);
    }
  }

  async function runDemo() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/demo/run`, { method: "POST" });
      const data = await res.json();
      router.push(`/loading/${data.audit_id}`);
    } catch {
      setError("Could not load demo dataset.");
      setLoading(false);
    }
  }

  const sensitiveDetected = columns.filter(isSensitive);

  return (
    <main style={{
      minHeight: "100vh",
      background: "#000000",
      fontFamily: "'Space Grotesk', sans-serif",
      position: "relative",
      overflow: "hidden"
    }}>
      {/* Floating gradient orbs */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "-10%", left: "-5%",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.15) 0%, transparent 70%)",
          animation: "orb-drift 20s ease-in-out infinite"
        }} />
        <div style={{
          position: "absolute", bottom: "-5%", right: "-5%",
          width: 500, height: 500, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(6,214,240,0.12) 0%, transparent 70%)",
          animation: "orb-drift 25s ease-in-out infinite reverse"
        }} />
        <div style={{
          position: "absolute", top: "40%", right: "15%",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)",
          animation: "orb-drift 18s ease-in-out infinite 5s"
        }} />
      </div>

      {/* Navbar */}
      <nav style={{
        position: "relative", zIndex: 10,
        background: "rgba(255,255,255,0.03)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
        padding: "0 32px", height: 64,
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #a855f7, #06d6f0)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}><Cpu size={16} color="#fff" /></div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: -0.5 }}>
            Fair<span style={{ color: "#a855f7" }}>Scan</span>
          </span>
        </div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "6px 14px",
          background: "rgba(16,185,129,0.1)",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#10b981"
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse-dot 2s infinite" }} />
          Google AI Hackathon 2026
        </div>
      </nav>

      {/* Hero */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "72px 24px 48px" }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "6px 16px",
          background: "rgba(168,85,247,0.1)",
          border: "1px solid rgba(168,85,247,0.3)",
          borderRadius: 20, marginBottom: 28, fontSize: 12, fontWeight: 600, color: "#c084fc",
          backdropFilter: "blur(10px)"
        }}>
          ✦ Powered by Google Gemini · Checks for bias in seconds
        </div>

        <h1 style={{
          fontSize: "clamp(36px, 6vw, 58px)",
          fontWeight: 800, lineHeight: 1.08,
          letterSpacing: -2, marginBottom: 20
        }}>
          <span style={{
            background: "linear-gradient(135deg, #ffffff 0%, #e2b8ff 50%, #06d6f0 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
          }}>Find hidden bias</span>
          <br />
          <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: "0.7em" }}>
            before you launch your AI
          </span>
        </h1>

        <p style={{
          fontSize: 16, color: "rgba(255,255,255,0.45)",
          maxWidth: 480, margin: "0 auto", lineHeight: 1.7, fontWeight: 400
        }}>
          Upload a dataset to instantly check if your AI is making unfair decisions, find out why, and see if it breaks any laws all in under 30 seconds.
        </p>
      </div>

      {/* Upload Card */}
      <div style={{
        position: "relative", zIndex: 1,
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 24,
        maxWidth: 560, margin: "0 auto 40px",
        padding: 36,
        boxShadow: "0 32px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
      }}>

        {/* Drop Zone */}
        <label
          ref={dropRef}
          htmlFor="csv-upload"
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            display: "flex", alignItems: "center", gap: 16,
            border: dragging ? "2px solid #06d6f0" : file ? "2px solid #a855f7" : "1px dashed rgba(255,255,255,0.15)",
            borderRadius: 16, padding: "20px 24px", cursor: "pointer",
            background: dragging ? "rgba(6,214,240,0.05)" : file ? "rgba(168,85,247,0.06)" : "rgba(255,255,255,0.02)",
            marginBottom: 28, transition: "all 0.25s",
            boxShadow: dragging ? "0 0 0 4px rgba(6,214,240,0.15)" : file ? "0 0 0 4px rgba(168,85,247,0.12)" : "none"
          }}
        >
          <div style={{
            width: 48, height: 48, borderRadius: 12, flexShrink: 0,
            background: file ? "rgba(168,85,247,0.2)" : "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            {file ? <FileCheck size={22} color="#c084fc" /> : <Upload size={20} color="rgba(255,255,255,0.4)" />}
          </div>
          <div style={{ flex: 1 }}>
            {file ? (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#c084fc" }}>{file.name}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 3, fontWeight: 500 }}>
                  {columns.length} columns · {(file.size / 1024 / 1024).toFixed(1)} MB
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>
                  {dragging ? "Drop it here!" : "Drop your dataset here"}
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 3 }}>
                  CSV files only · max 50MB
                </div>
              </>
            )}
          </div>
          {file && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#a855f7", background: "rgba(168,85,247,0.15)", padding: "4px 10px", borderRadius: 8 }}>
              Change
            </span>
          )}
        </label>
        <input id="csv-upload" type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} />

        {/* Column picker */}
        {columns.length > 0 && (
          <div style={{ marginBottom: 28, animation: "slide-up 0.3s ease" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: ".1em", marginBottom: 12 }}>
              WHICH COLUMN HAS THE FINAL OUTCOME?
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {columns.map(col => {
                const sensitive = isSensitive(col);
                const selected = decisionCol === col;
                return (
                  <button key={col} onClick={() => setDecisionCol(col)} style={{
                    padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 12, fontWeight: 600,
                    border: selected
                      ? "2px solid #06d6f0"
                      : sensitive
                      ? "1px solid rgba(168,85,247,0.4)"
                      : "1px solid rgba(255,255,255,0.1)",
                    background: selected
                      ? "rgba(6,214,240,0.15)"
                      : sensitive
                      ? "rgba(168,85,247,0.06)"
                      : "rgba(255,255,255,0.04)",
                    color: selected ? "#06d6f0" : sensitive ? "#a78bfa" : "rgba(255,255,255,0.6)",
                    transition: "all 0.15s",
                    boxShadow: selected ? "0 0 14px rgba(6,214,240,0.35)" : "none"
                  }}>
                    {col} {selected && "✓"}
                  </button>
                );
              })}
            </div>
            {sensitiveDetected.length > 0 && (
              <div style={{
                marginTop: 14, display: "flex", alignItems: "center", gap: 10,
                padding: "10px 14px",
                background: "rgba(168,85,247,0.08)",
                border: "1px solid rgba(168,85,247,0.25)",
                borderRadius: 10, fontSize: 12, color: "#c084fc", fontWeight: 500
              }}>
                <AlertTriangle size={13} color="#c084fc" />
                <span>
                  Sensitive columns detected: <strong>{sensitiveDetected.join(", ")}</strong> shown in purple
                </span>
              </div>
            )}
          </div>
        )}

        {/* Model name */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: ".1em", marginBottom: 10 }}>
            WHAT IS THE NAME OF YOUR PROJECT?
          </div>
          <input
            type="text"
            value={modelName}
            onChange={e => setModelName(e.target.value)}
            style={{
              width: "100%", height: 48,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 12, padding: "0 16px",
              fontSize: 14, color: "#f0f0ff", outline: "none",
              fontWeight: 500, transition: "border-color 0.2s",
              fontFamily: "inherit"
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 16, padding: "12px 16px", borderRadius: 12, fontSize: 13,
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontWeight: 500
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={loading || !file || !decisionCol}
          style={{
            width: "100%", height: 54, borderRadius: 14, border: "none",
            background: loading || !file || !decisionCol
              ? "rgba(255,255,255,0.05)"
              : "linear-gradient(135deg, #7c3aed, #2563eb)",
            color: loading || !file || !decisionCol ? "rgba(255,255,255,0.2)" : "#fff",
            fontSize: 15, fontWeight: 700,
            cursor: loading || !file || !decisionCol ? "not-allowed" : "pointer",
            transition: "all 0.2s",
            boxShadow: loading || !file || !decisionCol
              ? "none"
              : "0 8px 32px rgba(124,58,237,0.4), 0 0 0 1px rgba(255,255,255,0.1) inset",
            letterSpacing: 0.3
          }}
        >
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Zap size={16} color="inherit" />
            {loading ? "Starting analysis..." : "Check for bias"}
          </span>
        </button>

        {/* Demo link */}
        <div style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(255,255,255,0.3)" }}>
          No dataset?{" "}
          <span
            onClick={runDemo}
            style={{
              color: "#06d6f0", cursor: "pointer", fontWeight: 700,
              textDecoration: "none", transition: "color 0.2s",
              display: "inline-flex", alignItems: "center", gap: 5
            }}
          >
            Try our demo dataset <ExternalLink size={11} color="#06d6f0" />
          </span>
          <span style={{ display: "block", marginTop: 4, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
            it has built-in bias so you can see how it works!
          </span>
        </div>
      </div>

      {/* Feature pills */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", justifyContent: "center", gap: 16,
        flexWrap: "wrap", paddingBottom: 56, padding: "0 24px 56px"
      }}>
        {[
          ["#a855f7", "Checks EU & US Laws"],
          ["#06d6f0", "Powered by Gemini"],
          ["#10b981", "No data stored"],
          ["#f59e0b", "Results in 30s"]
        ].map(([color, label]) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 8,
            fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500,
            padding: "6px 14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 20
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: color }} />
            {label}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes orb-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -30px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.95); }
        }
        @keyframes slide-up {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity:1; transform:scale(1); }
          50% { opacity:0.4; transform:scale(0.8); }
        }
        label:hover { border-color: rgba(168,85,247,0.5) !important; }
        button:not(:disabled):hover { filter: brightness(1.1); transform: translateY(-1px); }
      `}</style>
    </main>
  );
}