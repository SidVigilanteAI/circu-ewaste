"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Recycle,
  Wrench,
  HeartHandshake,
  Sparkles,
  Upload,
  FileText,
  Camera,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Leaf,
  DollarSign,
  Cpu,
  ArrowRight,
  RotateCcw,
  Search,
  Activity,
  MapPin,
  Lock,
  Award,
  Printer,
  X,
  TrendingUp,
  Store,
  Layers,
  HelpCircle
} from "lucide-react";

import dynamic from "next/dynamic";

const NearbyMapVisualizer = dynamic(
  () => import("../components/NearbyMapVisualizer"),
  {
    ssr: false,
    loading: () => (
      <div className="h-96 rounded-3xl bg-slate-900/60 border border-slate-800 flex items-center justify-center text-slate-400 text-xs">
        <span className="animate-spin mr-2">⏳</span> Initializing Live PIN Map Visualizer...
      </div>
    )
  }
);

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

interface DeviceCandidate {
  brand: string;
  model: string;
  category: string;
  release_year?: string;
  serial_or_specs?: string;
  confidence_score?: number;
  raw_extracted_text?: string;
}

interface DiagnosticQuestion {
  id: string;
  question: string;
  options: string[];
  description?: string;
}

interface ArbitrageQuote {
  platform: string;
  quote_inr: string;
  payout_type: string;
  convenience_level: string;
}

interface RepairPartEstimate {
  part_name: string;
  cost_range_inr: string;
  diy_difficulty: string;
}

interface LocalDropoffCenter {
  name: string;
  center_type: string;
  category?: "RECYCLE" | "REPAIR" | "DONATE";
  address_or_channel: string;
  contact_or_link: string;
  phone?: string;
  pincode?: string;
  distance_km?: string;
  latitude?: number;
  longitude?: number;
  timing?: string;
  rating?: string;
}

interface ResourceLinkEstimate {
  title: string;
  url: string;
  category: string;
  summary: string;
  estimated_value: string;
}

interface CircularEvaluationResult {
  recommendation: "REUSE" | "REPAIR" | "DONATE" | "RECYCLE";
  recommendation_title: string;
  recommendation_reasoning: string;
  eco_impact_ewaste_kg: number;
  eco_impact_co2_kg: number;
  hazardous_materials_saved: string[];
  resale_value_inr: string;
  repair_cost_inr: string;
  scrap_value_inr: string;
  repairability_score: number;
  repair_difficulty_label: string;
  product_overview: string;
  key_specs: string[];
  resource_links: ResourceLinkEstimate[];
  arbitrage_table: ArbitrageQuote[];
  diy_repair_parts: RepairPartEstimate[];
  data_sanitization_guide: string[];
  local_dropoff_options: LocalDropoffCenter[];
  next_action_steps: string[];
}

export default function CircuScanApp() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [activeTab, setActiveTab] = useState<"image" | "pdf" | "text">("image");
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [backendAlive, setBackendAlive] = useState(false);

  // Step 2 & 3 state
  const [device, setDevice] = useState<DeviceCandidate | null>(null);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [userLocation, setUserLocation] = useState("Bengaluru, India");
  const [evaluation, setEvaluation] = useState<CircularEvaluationResult | null>(null);
  const [showCertificate, setShowCertificate] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check backend health on mount
  useEffect(() => {
    fetch(`${API_BASE}/health`)
      .then((res) => res.json())
      .then((d) => {
        if (d.status === "ok") setBackendAlive(true);
      })
      .catch(() => setBackendAlive(false));
  }, []);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setSelectedFile(f);
      setErrorMsg(null);
      if (f.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(f));
      } else {
        setFilePreview(null);
      }
    }
  };

  // Step 1: Submit Ingestion to FastAPI
  const handleIngest = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      let candidate: DeviceCandidate;

      if (activeTab === "image") {
        if (!selectedFile) {
          setErrorMsg("Please select an image of your gadget or label first.");
          setLoading(false);
          return;
        }
        setLoadingMsg("Running RapidOCR + Gemini Vision AI for hardware detection...");
        const formData = new FormData();
        formData.append("file", selectedFile);
        const res = await fetch(`${API_BASE}/api/ingest/image`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
        candidate = await res.json();
      } else if (activeTab === "pdf") {
        if (!selectedFile) {
          setErrorMsg("Please select a PDF document first.");
          setLoading(false);
          return;
        }
        setLoadingMsg("Parsing PDF spec sheet / invoice with PyMuPDF...");
        const formData = new FormData();
        formData.append("file", selectedFile);
        const res = await fetch(`${API_BASE}/api/ingest/pdf`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
        candidate = await res.json();
      } else {
        if (!textInput.trim()) {
          setErrorMsg("Please enter device details or model name.");
          setLoading(false);
          return;
        }
        setLoadingMsg("Analyzing device specifications...");
        const res = await fetch(`${API_BASE}/api/ingest/text`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: textInput }),
        });
        if (!res.ok) throw new Error(await res.text());
        candidate = await res.json();
      }

      setDevice(candidate);

      // Fetch dynamic diagnostic questions
      setLoadingMsg(`Generating tailored condition questions for ${candidate.brand} ${candidate.model}...`);
      const qRes = await fetch(`${API_BASE}/api/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(candidate),
      });
      if (!qRes.ok) throw new Error(await qRes.text());
      const qData = await qRes.json();

      setQuestions(qData.questions);
      const initialAnswers: Record<string, string> = {};
      qData.questions.forEach((q: DiagnosticQuestion) => {
        initialAnswers[q.id] = q.options[0];
      });
      setAnswers(initialAnswers);

      setStep(2);
    } catch (err: any) {
      setErrorMsg(`Extraction error: ${err.message || "Could not process input"}`);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit Answers to Evaluate Circular Decision
  const handleEvaluate = async () => {
    if (!device) return;
    setErrorMsg(null);
    setLoading(true);
    setLoadingMsg(`Conducting deep web research, arbitrage quotes & drop-offs for ${device.brand} ${device.model}...`);

    try {
      const res = await fetch(`${API_BASE}/api/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device,
          answers,
          location_or_city: userLocation,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      const evalData: CircularEvaluationResult = await res.json();
      setEvaluation(evalData);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(`Evaluation failed: ${err.message || "Failed to process circular decision"}`);
    } finally {
      setLoading(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setSelectedFile(null);
    setFilePreview(null);
    setTextInput("");
    setDevice(null);
    setQuestions([]);
    setAnswers({});
    setEvaluation(null);
    setErrorMsg(null);
    setShowCertificate(false);
  };

  // Recommendation themes
  const getDecisionTheme = (rec?: string) => {
    switch (rec) {
      case "REUSE":
        return {
          badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          icon: <Recycle className="w-8 h-8 text-emerald-400" />,
          glow: "from-emerald-950/60 via-slate-900 to-slate-950 border-emerald-500/40",
          accentText: "text-emerald-400",
        };
      case "REPAIR":
        return {
          badge: "bg-amber-500/20 text-amber-400 border-amber-500/30",
          icon: <Wrench className="w-8 h-8 text-amber-400" />,
          glow: "from-amber-950/60 via-slate-900 to-slate-950 border-amber-500/40",
          accentText: "text-amber-400",
        };
      case "DONATE":
        return {
          badge: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
          icon: <HeartHandshake className="w-8 h-8 text-indigo-400" />,
          glow: "from-indigo-950/60 via-slate-900 to-slate-950 border-indigo-500/40",
          accentText: "text-indigo-400",
        };
      case "RECYCLE":
        return {
          badge: "bg-rose-500/20 text-rose-400 border-rose-500/30",
          icon: <ShieldCheck className="w-8 h-8 text-rose-400" />,
          glow: "from-rose-950/60 via-slate-900 to-slate-950 border-rose-500/40",
          accentText: "text-rose-400",
        };
      default:
        return {
          badge: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
          icon: <Recycle className="w-8 h-8 text-emerald-400" />,
          glow: "from-emerald-950/60 via-slate-900 to-slate-950 border-emerald-500/40",
          accentText: "text-emerald-400",
        };
    }
  };

  const decisionTheme = getDecisionTheme(evaluation?.recommendation);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Recycle className="w-6 h-6 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  CircuScan
                </span>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  v2.2 Pro
                </span>
              </div>
              <p className="text-xs text-slate-400">AI Circular Electronics & E-Waste Reduction Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
              <span className={`w-2 h-2 rounded-full ${backendAlive ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
              <span className="text-slate-300">{backendAlive ? "FastAPI Online" : "Backend Offline"}</span>
            </div>
            {step > 1 && (
              <button
                onClick={resetAll}
                className="flex items-center gap-1.5 text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>New Scan</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        {/* Progress Step Indicator */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
            <div
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                step === 1
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                  : step > 1
                  ? "bg-slate-900/60 border-slate-800 text-slate-400"
                  : "bg-slate-900/30 border-slate-900 text-slate-600"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step > 1 ? "bg-emerald-500 text-slate-950" : step === 1 ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-400"
                }`}
              >
                {step > 1 ? "✓" : "1"}
              </div>
              <span className="truncate">1. Ingest Media</span>
            </div>

            <div
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                step === 2
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                  : step > 2
                  ? "bg-slate-900/60 border-slate-800 text-slate-400"
                  : "bg-slate-900/30 border-slate-900 text-slate-600"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step > 2 ? "bg-emerald-500 text-slate-950" : step === 2 ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-400"
                }`}
              >
                {step > 2 ? "✓" : "2"}
              </div>
              <span className="truncate">2. Diagnostic Health</span>
            </div>

            <div
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                step === 3
                  ? "bg-emerald-950/40 border-emerald-500/50 text-emerald-300"
                  : "bg-slate-900/30 border-slate-900 text-slate-600"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === 3 ? "bg-emerald-400 text-slate-950" : "bg-slate-800 text-slate-400"
                }`}
              >
                3
              </div>
              <span className="truncate">3. 4R Decision & Value</span>
            </div>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm">{errorMsg}</div>
          </div>
        )}

        {/* STEP 1: INGESTION */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center max-w-2xl mx-auto mb-8">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
                Don't Trash It.{" "}
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                  Trace Its Circular Value.
                </span>
              </h1>
              <p className="text-slate-400 text-sm sm:text-base">
                Upload device photos (with or without labels), invoices (PyMuPDF), or enter specifications. CircuScan diagnoses whether to Reuse, Repair, Donate, or Recycle with live arbitrage valuations.
              </p>
            </div>

            {/* Ingestion Mode Tabs */}
            <div className="bg-slate-900/80 border border-slate-800 p-1.5 rounded-2xl flex max-w-md mx-auto">
              <button
                onClick={() => {
                  setActiveTab("image");
                  setSelectedFile(null);
                  setFilePreview(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "image"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Image (Vision AI)</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("pdf");
                  setSelectedFile(null);
                  setFilePreview(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "pdf"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>PDF (PyMuPDF)</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab("text");
                  setSelectedFile(null);
                  setFilePreview(null);
                }}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeTab === "text"
                    ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Direct Text</span>
              </button>
            </div>

            {/* Ingestion Content Box */}
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 backdrop-blur-sm shadow-xl">
              {activeTab === "image" && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-950/40 group"
                  >
                    {filePreview ? (
                      <div className="space-y-4">
                        <img
                          src={filePreview}
                          alt="Preview"
                          className="max-h-64 mx-auto rounded-xl shadow-lg border border-slate-700 object-contain"
                        />
                        <p className="text-xs text-emerald-400 font-medium">Click to choose a different photo</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:scale-105 group-hover:border-emerald-500/50 transition-all">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-400" />
                        </div>
                        <div className="font-medium text-slate-200 text-sm sm:text-base">
                          Upload device photo, label, or unlabelled gadget
                        </div>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Our dual-engine uses <strong className="text-emerald-400">RapidOCR</strong> for printed stickers and <strong className="text-emerald-400">Gemini Vision AI</strong> to identify unlabelled hardware designs.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "pdf" && (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="application/pdf"
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-950/40 group"
                  >
                    {selectedFile ? (
                      <div className="space-y-3">
                        <FileText className="w-12 h-12 mx-auto text-emerald-400" />
                        <div className="text-sm font-medium text-slate-200">{selectedFile.name}</div>
                        <p className="text-xs text-slate-400">{(selectedFile.size / 1024).toFixed(1)} KB — Click to change PDF</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="w-14 h-14 mx-auto rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center group-hover:scale-105 group-hover:border-emerald-500/50 transition-all">
                          <FileText className="w-6 h-6 text-slate-400 group-hover:text-emerald-400" />
                        </div>
                        <div className="font-medium text-slate-200 text-sm sm:text-base">
                          Upload Invoice, Spec Sheet, or User Manual (PDF)
                        </div>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Parsed instantaneously using <strong className="text-emerald-400">PyMuPDF</strong> for high-fidelity text and serial retrieval.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === "text" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                      Device Description or Model
                    </label>
                    <textarea
                      rows={3}
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="e.g., Apple iPhone 11 64GB with cracked back glass, or Dell Latitude 7490 i5 8GB RAM with dying battery"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition-colors"
                    />
                  </div>

                  <div>
                    <span className="text-xs text-slate-400 block mb-2 font-medium">Quick Suggestions:</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "iPhone 12 128GB",
                        "MacBook Air M1 2020",
                        "Sony WH-1000XM4",
                        "OnePlus 9 Pro",
                        "Dell XPS 13 9360",
                        "Samsung Galaxy S21"
                      ].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setTextInput(item)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-emerald-300 border border-slate-700 transition-colors cursor-pointer"
                        >
                          + {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <div className="mt-6 pt-6 border-t border-slate-800/80 flex justify-end">
                <button
                  onClick={handleIngest}
                  disabled={loading}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>{loadingMsg || "Analyzing..."}</span>
                    </>
                  ) : (
                    <>
                      <span>Scan & Extract Device</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: DIAGNOSTIC QUESTIONNAIRE & LOCATION */}
        {step === 2 && device && (
          <div className="space-y-6 max-w-3xl mx-auto">
            {/* Extracted Device Summary Card */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
                      {device.category}
                    </span>
                    {device.release_year && (
                      <span className="text-xs text-slate-400">Year: {device.release_year}</span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold text-white mt-0.5">
                    {device.brand} {device.model}
                  </h2>
                  {device.serial_or_specs && (
                    <p className="text-xs text-slate-400 mt-0.5">Specs/Details: {device.serial_or_specs}</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setStep(1)}
                className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors self-end sm:self-auto cursor-pointer"
              >
                <span>Edit / Re-scan</span>
              </button>
            </div>

            {/* Location / City Selector for Drop-Off Finder */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-slate-300 font-medium">
                  Your City / PIN Code (for local drop-offs):
                </span>
              </div>
              <input
                type="text"
                value={userLocation}
                onChange={(e) => setUserLocation(e.target.value)}
                placeholder="e.g. Mumbai, 560001, Delhi NCR"
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60 sm:w-60"
              />
            </div>

            {/* Questions Header */}
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-bold text-white">Diagnostic Verification Health Check</h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Answer these 3-4 diagnostic questions so our AI can calculate repair viability, resale quotes, and environmental diversion.
              </p>
            </div>

            {/* Dynamic Question Cards */}
            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-slate-900/50 border border-slate-800/90 rounded-2xl p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm sm:text-base font-semibold text-slate-100">{q.question}</h3>
                    </div>
                  </div>

                  {q.description && (
                    <p className="text-xs text-slate-400 ml-7">{q.description}</p>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 ml-0 sm:ml-7">
                    {q.options.map((option) => {
                      const isSelected = answers[q.id] === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setAnswers({ ...answers, [q.id]: option })}
                          className={`p-3 rounded-xl text-xs sm:text-sm text-left border transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-emerald-950/60 border-emerald-500 text-white font-medium shadow-sm shadow-emerald-500/20"
                              : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900/60"
                          }`}
                        >
                          <span>{option}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Evaluation Action */}
            <div className="pt-4 flex justify-between items-center">
              <button
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-sm font-medium transition-colors cursor-pointer"
              >
                Back
              </button>

              <button
                onClick={handleEvaluate}
                disabled={loading}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>{loadingMsg || "Analyzing Market..."}</span>
                  </>
                ) : (
                  <>
                    <span>Evaluate 4R Outcome & Market Value</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: COMPREHENSIVE CIRCULAR EVALUATION REPORT */}
        {step === 3 && evaluation && device && (
          <div className="space-y-8 max-w-4xl mx-auto">
            {/* HERO 4R DECISION BANNER */}
            <div className={`p-6 sm:p-8 rounded-3xl border bg-gradient-to-b ${decisionTheme.glow} shadow-2xl relative overflow-hidden`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
                    {decisionTheme.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border ${decisionTheme.badge}`}>
                        RECOMMENDED: {evaluation.recommendation}
                      </span>
                      <span className="text-xs text-slate-400">{device.brand} {device.model}</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                      {evaluation.recommendation_title}
                    </h1>
                  </div>
                </div>

                <button
                  onClick={() => setShowCertificate(true)}
                  className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer self-end sm:self-auto"
                >
                  <Award className="w-4 h-4" />
                  <span>Green Certificate</span>
                </button>
              </div>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-3xl mt-2 whitespace-pre-line">
                {evaluation.recommendation_reasoning}
              </p>
            </div>

            {/* ECO-IMPACT & CARBON METRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
                  <Leaf className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{evaluation.eco_impact_ewaste_kg} kg</div>
                  <div className="text-xs text-slate-400 font-medium">E-Waste Diverted from Landfills</div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                  <Activity className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{evaluation.eco_impact_co2_kg} kg</div>
                  <div className="text-xs text-slate-400 font-medium">CO₂ Emissions Avoided</div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800/90 rounded-2xl p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                  <Wrench className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <div className="text-2xl font-black text-white">{evaluation.repairability_score} / 10</div>
                  <div className="text-xs text-slate-400 font-medium">
                    Repairability ({evaluation.repair_difficulty_label || "Moderate"})
                  </div>
                </div>
              </div>
            </div>

            {/* LIVE MARKETPLACE RESALE ARBITRAGE MATRIX (UPGRADE C) */}
            {evaluation.arbitrage_table?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-emerald-400" />
                      <span>Live Resale Arbitrage Matrix</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Compare payout options across India's top re-commerce platforms side-by-side.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
                  {evaluation.arbitrage_table.map((arb, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-xs font-bold text-white block">{arb.platform}</span>
                        <div className="text-lg font-black text-emerald-400 my-1.5">{arb.quote_inr}</div>
                      </div>
                      <div className="space-y-1 text-[11px] text-slate-400 border-t border-slate-850 pt-2">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="w-3 h-3 text-emerald-400" />
                          <span>{arb.payout_type}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Store className="w-3 h-3 text-cyan-400" />
                          <span>{arb.convenience_level}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DIY REPAIR GUIDE & SPARE PARTS BREAKDOWN (UPGRADE D) */}
            {evaluation.diy_repair_parts?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-amber-400" />
                      <span>DIY Repair Parts & Feasibility Breakdown</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Estimated spare parts costs in India and difficulty ratings before deciding to repair.
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                    Score: {evaluation.repairability_score}/10 ({evaluation.repair_difficulty_label})
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  {evaluation.diy_repair_parts.map((part, i) => (
                    <div key={i} className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-200">{part.part_name}</span>
                        <div className="text-base font-bold text-amber-400 mt-1">{part.cost_range_inr}</div>
                      </div>
                      <div className="mt-3 pt-2 border-t border-slate-850 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Difficulty:</span>
                        <span className="font-semibold text-slate-300">{part.diy_difficulty}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI DATA SANITIZATION & PRIVACY SHIELD (UPGRADE E) */}
            {evaluation.data_sanitization_guide?.length > 0 && (
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-3">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-cyan-400" />
                  <span>Privacy Shield: Data Sanitization Guide</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Follow these device-specific instructions before transferring or recycling to guarantee 100% data security.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {evaluation.data_sanitization_guide.map((stepGuide, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span>{stepGuide}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* INTERACTIVE PIN-CALIBRATED MAP VISUALIZER FOR RECYCLERS & REPAIR SHOPS */}
            {evaluation.local_dropoff_options?.length > 0 && (
              <NearbyMapVisualizer
                initialCenters={evaluation.local_dropoff_options}
                initialLocation={userLocation}
                deviceBrand={device?.brand}
                deviceCategory={device?.category}
              />
            )}

            {/* CURATED WEB SEARCH RESOURCE LINKS WITH VALUE ESTIMATIONS */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Search className="w-5 h-5 text-emerald-400" />
                  <span>Curated Web Sources & Link Estimations</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Live verified platforms with purpose descriptions and specific financial estimations.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {evaluation.resource_links?.map((link, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/90 hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                          {link.category}
                        </span>
                        <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                          {link.title}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{link.summary}</p>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-800">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block uppercase">Estimated Value</span>
                        <span className="text-xs sm:text-sm font-bold text-emerald-400">{link.estimated_value}</span>
                      </div>
                      {link.url && (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <span>Visit Resource</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PRODUCT OVERVIEW & NEXT ACTION STEPS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>Hardware Overview</span>
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">{evaluation.product_overview}</p>
                <div className="space-y-1.5 pt-2">
                  {evaluation.key_specs?.map((spec, i) => (
                    <div key={i} className="text-xs text-slate-400 flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Action Checklist</span>
                </h3>
                <div className="space-y-2.5 pt-1">
                  {evaluation.next_action_steps?.map((stepText, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs text-slate-300 flex items-start gap-2.5">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{stepText}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Reset Action */}
            <div className="pt-4 flex justify-center">
              <button
                onClick={resetAll}
                className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm sm:text-base flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Scan Another Device</span>
              </button>
            </div>
          </div>
        )}

        {/* GREEN IMPACT CERTIFICATE MODAL (UPGRADE F) */}
        {showCertificate && evaluation && device && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-emerald-500/50 rounded-3xl p-8 max-w-xl w-full shadow-2xl relative">
              <button
                onClick={() => setShowCertificate(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-full bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 mx-auto flex items-center justify-center">
                  <Award className="w-8 h-8 text-emerald-400" />
                </div>

                <div>
                  <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    Official Environmental Impact Certificate
                  </span>
                  <h2 className="text-2xl font-black text-white mt-2">CircuScan Green Impact Award</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Awarded for responsible circular electronics lifecycle stewardship.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-left">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Electronic Device:</span>
                    <span className="font-bold text-white">{device.brand} {device.model}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Circular Action:</span>
                    <span className="font-bold text-emerald-400">{evaluation.recommendation}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">E-Waste Diverted:</span>
                    <span className="font-bold text-white">{evaluation.eco_impact_ewaste_kg} kg</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">CO₂e Emissions Spared:</span>
                    <span className="font-bold text-cyan-400">{evaluation.eco_impact_co2_kg} kg CO₂e</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Certification Date:</span>
                    <span className="text-slate-300">{new Date().toLocaleDateString("en-IN")}</span>
                  </div>
                </div>

                <div className="flex gap-3 justify-center pt-2">
                  <button
                    onClick={() => window.print()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs flex items-center gap-2 hover:bg-emerald-400 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print / Save as PDF</span>
                  </button>
                  <button
                    onClick={() => setShowCertificate(false)}
                    className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs hover:bg-slate-700 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12 text-center text-xs text-slate-500">
        <p>CircuScan v2.2 Pro • Next.js, RapidOCR, PyMuPDF & Gemini Multimodal Vision • Promoting Circular Tech</p>
      </footer>
    </div>
  );
}
