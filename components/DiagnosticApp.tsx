"use client";

import { useState, useEffect, useRef } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ─── TYPES ────────────────────────────────────────────────────
type RiskLevel = "low" | "mid" | "high";
type AnswerValue = string;
type Answers = Record<number, AnswerValue>;

interface Risk {
  label: string;
  weight: number;
  desc: string;
  qId: number;
}

interface WhatIf {
  label: string;
  weight: number;
  newDeath: number;
}

interface Pattern {
  id: string;
  label: string;
  icon: string;
  color: string;
  condition: (a: Answers) => boolean;
  desc: string;
  stat: string;
}

interface Scenario {
  month: string;
  event: string;
  type: "neutral" | "warn" | "dead" | "good";
}

interface PeerStat {
  avgDeath: number;
  n: number;
  desc: string;
}

interface DiagnosticResult {
  score: number;
  deathRate: number;
  structureIndex: number;
  maturity: number;
  riskLevel: RiskLevel;
  risks: Risk[];
  patterns: Pattern[];
  scenarios: Scenario[];
  ctaCopy: string;
  budgetMan: number;
  burningMoney: number;
  dailyBurn: number;
  dangerPercentile: number;
  whatIf: WhatIf[];
  peer: PeerStat;
}

interface ActiveRisk {
  label: string;
  weight: number;
}

interface Question {
  id: number;
  text: string;
  subtext: string;
  type: "yesno" | "select";
  options?: string[];
  riskIfNo?: string;
  weightIfNo?: number;
  riskLogic?: (v: string) => boolean;
  riskLabel?: string | null;
  weightIfRisk?: number;
  riskDesc: string;
  maturityContrib: number;
  maturityLogic?: (v: string) => number;
  budgetMap?: Record<string, number>;
}

interface ScatterPoint {
  x: number;
  y: number;
  isUser?: boolean;
}

// ─── DATA ──────────────────────────────────────────────────────
const questions: Question[] = [
  {
    id: 1,
    text: "PoC成功の定義が、数値で決まっている",
    subtext: "「精度が上がった」ではなく「精度92%以上」のように",
    type: "yesno",
    riskIfNo: "評価指標未定義",
    weightIfNo: 20,
    riskDesc: "PoCの成否判断ができず、ステークホルダー間で認識が分断する",
    maturityContrib: 30,
  },
  {
    id: 2,
    text: "PoC終了後、量産移行の責任者が決まっている",
    subtext: "「誰かがやる」ではなく、実名で",
    type: "yesno",
    riskIfNo: "量産責任者不在",
    weightIfNo: 25,
    riskDesc: "成功後の次フェーズへの橋渡し役がおらず、プロジェクトが宙に浮く",
    maturityContrib: 30,
  },
  {
    id: 3,
    text: "関与しているAIベンダーの数",
    subtext: "SIer・コンサル・クラウド各社を含む",
    type: "select",
    options: ["1社", "2社", "3社以上"],
    riskLogic: (v) => v === "3社以上",
    riskLabel: "ベンダー分断リスク",
    weightIfRisk: 20,
    riskDesc: "責任の所在が不明確になり、問題発生時に収束できない",
    maturityContrib: 15,
    maturityLogic: (v) => (v === "1社" ? 15 : v === "2社" ? 8 : 0),
  },
  {
    id: 4,
    text: "PoCの期限",
    subtext: "経営層に報告できる具体的な日付があるか",
    type: "select",
    options: ["3ヶ月以内", "6ヶ月以内", "未定"],
    riskLogic: (v) => v === "未定",
    riskLabel: "期限未設定",
    weightIfRisk: 20,
    riskDesc: "緊張感が失われ、PoCが永続化する「PoC永久機関」に陥る",
    maturityContrib: 15,
    maturityLogic: (v) => (v === "3ヶ月以内" ? 15 : v === "6ヶ月以内" ? 10 : 0),
  },
  {
    id: 5,
    text: "AI運用の担当者が、社内に決まっている",
    subtext: "外部委託ではなく、社内の実務担当として",
    type: "yesno",
    riskIfNo: "運用担当者不在",
    weightIfNo: 15,
    riskDesc: "本番移行後に保守されず、システムが形骸化する",
    maturityContrib: 10,
  },
  {
    id: 6,
    text: "このAIプロジェクトの予算規模",
    subtext: "外部委託費・ライセンス・人件費を含む総額",
    type: "select",
    options: ["500万以下", "500万〜2000万", "2000万以上"],
    riskLogic: () => false,
    riskLabel: null,
    weightIfRisk: 0,
    riskDesc: "",
    maturityContrib: 0,
    budgetMap: { "500万以下": 500, "500万〜2000万": 1250, "2000万以上": 2000 },
  },
];

const PROJECT_PATTERNS: Pattern[] = [
  {
    id: "eternal_poc",
    label: "PoC永久機関型",
    icon: "∞",
    color: "#f59e0b",
    condition: (a) => a[1] === "No" || a[4] === "未定",
    desc: "評価指標も期限も曖昧なまま「まだ検証中」が続くパターン。予算が尽きるまでPoCが終わらない。日本のAIプロジェクトの最頻死因。",
    stat: "国内AI案件の43%がこのパターンで終わる",
  },
  {
    id: "vendor_split",
    label: "ベンダー分断型",
    icon: "⬡",
    color: "#8b5cf6",
    condition: (a) => a[3] === "3社以上",
    desc: "複数ベンダーが関与し責任が分散。問題発生時に「うちのせいではない」が連鎖し、収束できずに崩壊する。",
    stat: "3社以上関与プロジェクトの失敗率は単独の2.3倍",
  },
  {
    id: "ownership_void",
    label: "責任空白型",
    icon: "○",
    color: "#ef4444",
    condition: (a) => a[2] === "No" && a[5] === "No",
    desc: "量産責任者も運用担当者も不在。PoC成功という事実だけが残り、誰も次のフェーズを動かさない。最も静かに死ぬパターン。",
    stat: "責任者不在プロジェクトの91%が量産移行できない",
  },
  {
    id: "metric_blind",
    label: "指標盲目型",
    icon: "?",
    color: "#64748b",
    condition: (a) => a[1] === "No",
    desc: "成功の定義が数値化されていない。PoC完了後に「で、これは成功なの？」という問いに誰も答えられない。",
    stat: "評価指標未定義の場合、意思決定に平均4.2ヶ月余計にかかる",
  },
];

const PEER_DATA: Record<string, Record<RiskLevel, PeerStat>> = {
  "500万以下": {
    high: { avgDeath: 79, n: 34, desc: "予算500万以下・高リスク構造の企業" },
    mid: { avgDeath: 61, n: 28, desc: "予算500万以下・中リスク構造の企業" },
    low: { avgDeath: 38, n: 15, desc: "予算500万以下・低リスク構造の企業" },
  },
  "500万〜2000万": {
    high: { avgDeath: 82, n: 47, desc: "予算500〜2000万・高リスク構造の企業" },
    mid: { avgDeath: 65, n: 39, desc: "予算500〜2000万・中リスク構造の企業" },
    low: { avgDeath: 33, n: 22, desc: "予算500〜2000万・低リスク構造の企業" },
  },
  "2000万以上": {
    high: { avgDeath: 76, n: 29, desc: "予算2000万以上・高リスク構造の企業" },
    mid: { avgDeath: 58, n: 31, desc: "予算2000万以上・中リスク構造の企業" },
    low: { avgDeath: 28, n: 19, desc: "予算2000万以上・低リスク構造の企業" },
  },
};

const industryData: ScatterPoint[] = [
  { x: 8, y: 85 }, { x: 15, y: 78 }, { x: 22, y: 80 }, { x: 30, y: 72 },
  { x: 35, y: 68 }, { x: 40, y: 65 }, { x: 45, y: 70 }, { x: 50, y: 58 },
  { x: 55, y: 62 }, { x: 60, y: 50 }, { x: 65, y: 52 }, { x: 70, y: 42 },
  { x: 75, y: 38 }, { x: 80, y: 30 }, { x: 85, y: 25 }, { x: 90, y: 22 },
  { x: 25, y: 75 }, { x: 48, y: 60 }, { x: 58, y: 48 }, { x: 72, y: 35 },
];

const INDUSTRY_AVG_DEATH = 68;
const INDUSTRY_AVG_MATURITY = 45;

// ─── SCORING ENGINE ───────────────────────────────────────────
function computeResult(answers: Answers): DiagnosticResult {
  let score = 100;
  let maturity = 0;
  const risks: Risk[] = [];

  questions.forEach((q) => {
    const value = answers[q.id];
    if (!value) return;

    if (q.type === "yesno" && value === "No" && q.riskIfNo && q.weightIfNo) {
      score -= q.weightIfNo;
      risks.push({ label: q.riskIfNo, weight: q.weightIfNo, desc: q.riskDesc, qId: q.id });
    }
    if (q.type === "select" && q.riskLogic?.(value) && q.riskLabel && q.weightIfRisk) {
      score -= q.weightIfRisk;
      risks.push({ label: q.riskLabel, weight: q.weightIfRisk, desc: q.riskDesc, qId: q.id });
    }
    if (q.maturityLogic) maturity += q.maturityLogic(value);
    else if (q.type === "yesno" && value === "Yes") maturity += q.maturityContrib ?? 0;
  });

  score = Math.max(score, 0);
  const deathRate = 100 - score;
  const structureIndex = score;
  const riskLevel: RiskLevel = score >= 80 ? "low" : score >= 50 ? "mid" : "high";

  const budgetQ = questions.find((q) => q.id === 6);
  const budgetVal = answers[6] ?? "";
  const budgetMan = budgetQ?.budgetMap?.[budgetVal] ?? 0;
  const burningMoney = Math.round((deathRate / 100) * budgetMan);
  const dailyBurn = budgetMan > 0 ? Math.round((burningMoney / 365) * 10) / 10 : 0;

  const dangerPercentile = Math.min(
    99,
    Math.max(1, Math.round(50 + ((deathRate - INDUSTRY_AVG_DEATH) / 18) * 34))
  );

  const whatIf: WhatIf[] = risks
    .map((r) => ({ label: r.label, weight: r.weight, newDeath: deathRate - r.weight }))
    .sort((a, b) => b.weight - a.weight);

  const peerKey = budgetVal || "500万〜2000万";
  const peer: PeerStat =
    PEER_DATA[peerKey]?.[riskLevel] ?? { avgDeath: 70, n: 30, desc: "類似規模・類似リスク企業" };

  const patterns = PROJECT_PATTERNS.filter((p) => p.condition(answers));

  const scenariosMap: Record<RiskLevel, Scenario[]> = {
    high: [
      { month: "3ヶ月後", event: "PoC、一応完了", type: "neutral" },
      { month: "6ヶ月後", event: "量産判断できず、追加検証へ", type: "warn" },
      { month: "12ヶ月後", event: "予算消化。プロジェクト凍結。", type: "dead" },
    ],
    mid: [
      { month: "3ヶ月後", event: "PoC成功", type: "neutral" },
      { month: "6ヶ月後", event: "追加検証フェーズ突入", type: "warn" },
      { month: "12ヶ月後", event: "判断保留のまま継続", type: "warn" },
    ],
    low: [
      { month: "3ヶ月後", event: "PoC成功", type: "neutral" },
      { month: "6ヶ月後", event: "量産移行判断", type: "good" },
      { month: "12ヶ月後", event: "本格展開", type: "good" },
    ],
  };

  const ctaCopyMap: Record<RiskLevel, string> = {
    high: "今すぐ構造リスクをレビューする（残り枠 3社）",
    mid: "プロジェクト構造レビューを予約する",
    low: "さらに確度を上げるためにレビューする",
  };

  return {
    score, deathRate, structureIndex, maturity, riskLevel, risks, patterns,
    scenarios: scenariosMap[riskLevel], ctaCopy: ctaCopyMap[riskLevel],
    budgetMan, burningMoney, dailyBurn, dangerPercentile, whatIf, peer,
  };
}

// ─── HELPERS ──────────────────────────────────────────────────
const rc = (l: RiskLevel) => l === "high" ? "#ef4444" : l === "mid" ? "#f59e0b" : "#22c55e";
const rl = (l: RiskLevel) => l === "high" ? "高リスク" : l === "mid" ? "中リスク" : "低リスク";

function CountUp({ target, duration = 1400, decimals = 0 }: { target: number; duration?: number; decimals?: number }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let s: number | null = null;
    const step = (ts: number) => {
      if (!s) s = ts;
      const p = Math.min((ts - s) / duration, 1);
      const val = (1 - Math.pow(1 - p, 3)) * target;
      setV(decimals > 0 ? Math.round(val * 10) / 10 : Math.round(val));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration, decimals]);
  return <span>{v}</span>;
}

function GaugeArc({ value, size = 120, color = "#ef4444" }: { value: number; size?: number; color?: string }) {
  const r = 46, cx = size / 2, cy = size / 2 + 10;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const arc = (a: number) => ({ x: cx + r * Math.cos(toRad(a)), y: cy + r * Math.sin(toRad(a)) });
  const s = arc(210), e = arc(210 + (value / 100) * 120), te = arc(330);
  const la = (210 + (value / 100) * 120) - 210 > 180 ? 1 : 0;
  return (
    <svg width={size} height={size * 0.75} viewBox={`0 0 ${size} ${size * 0.75}`}>
      <path d={`M ${s.x} ${s.y} A ${r} ${r} 0 1 1 ${te.x} ${te.y}`} fill="none" stroke="#1e293b" strokeWidth={8} strokeLinecap="round" />
      {value > 0 && <path d={`M ${s.x} ${s.y} A ${r} ${r} 0 ${la} 1 ${e.x} ${e.y}`} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round" />}
      <text x={cx} y={cy - 4} textAnchor="middle" fill={color} fontSize={22} fontFamily="Georgia,serif">{value}</text>
      <text x={cx} y={cy + 14} textAnchor="middle" fill="#475569" fontSize={9} fontFamily="monospace">/ 100</text>
    </svg>
  );
}

function RankBar({ percentile, color }: { percentile: number; color: string }) {
  const zones = [
    { label: "上位10%", range: [0, 10], danger: "最悪ゾーン" },
    { label: "上位30%", range: [10, 30], danger: "危険ゾーン" },
    { label: "上位50%", range: [30, 50], danger: "平均ゾーン" },
    { label: "上位70%", range: [50, 70], danger: "安全圏" },
    { label: "上位90%", range: [70, 100], danger: "優秀ゾーン" },
  ];
  const zoneIdx = zones.findIndex((z) => percentile <= z.range[1]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {zones.map((z, i) => {
        const active = i === zoneIdx;
        return (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "10px 14px",
            background: active ? `${color}15` : "transparent",
            border: active ? `1px solid ${color}55` : "1px solid #0f172a",
            transition: "all .3s",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: active ? color : "#1e293b", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 13, fontFamily: "monospace", color: active ? color : "#334155" }}>{z.label}</span>
              <span style={{ fontSize: 11, color: "#334155", marginLeft: 8 }}>{z.danger}</span>
            </div>
            {active && (
              <div style={{ fontSize: 12, fontFamily: "monospace", color, background: `${color}20`, padding: "3px 10px", border: `1px solid ${color}40` }}>
                ← あなた
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────
export default function DiagnosticApp() {
  const [phase, setPhase] = useState<"intro" | "questions" | "result">("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [activeRisks, setActiveRisks] = useState<ActiveRisk[]>([]);
  const [result, setResult] = useState<DiagnosticResult | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [animIn, setAnimIn] = useState(true);
  const [copied, setCopied] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const q = questions[currentQ];
  const progress = (currentQ / questions.length) * 100;

  function handleAnswer(value: string) {
    setSelected(value);
    const newAnswers: Answers = { ...answers, [q.id]: value };

    let triggered: ActiveRisk | null = null;
    if (q.type === "yesno" && value === "No" && q.riskIfNo && q.weightIfNo)
      triggered = { label: q.riskIfNo, weight: q.weightIfNo };
    if (q.type === "select" && q.riskLogic?.(value) && q.riskLabel && q.weightIfRisk)
      triggered = { label: q.riskLabel, weight: q.weightIfRisk };

    const newRisks =
      triggered && !activeRisks.find((r) => r.label === triggered!.label)
        ? [...activeRisks, triggered]
        : activeRisks;

    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setAnimIn(false);
        setTimeout(() => {
          setAnswers(newAnswers);
          setActiveRisks(newRisks);
          setCurrentQ(currentQ + 1);
          setSelected(null);
          setAnimIn(true);
        }, 280);
      } else {
        setAnswers(newAnswers);
        setActiveRisks(newRisks);
        const r = computeResult(newAnswers);
        setResult(r);
        setPhase("result");
        setTimeout(() => topRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      }
    }, 360);
  }

  function handleReset() {
    setPhase("intro");
    setCurrentQ(0);
    setAnswers({});
    setActiveRisks([]);
    setResult(null);
    setSelected(null);
  }

  const userPoint: ScatterPoint[] = result
    ? [{ x: result.maturity, y: result.deathRate, isUser: true }]
    : [];

  return (
    <div
      ref={topRef}
      style={{ fontFamily: "'Georgia','Times New Roman',serif", background: "#090b0e", minHeight: "100vh", color: "#e2e8f0" }}
    >
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeDown{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-14px)}}
        @keyframes pulseRed{0%,100%{box-shadow:0 0 0 0 rgba(239,68,68,.4)}50%{box-shadow:0 0 0 12px rgba(239,68,68,0)}}
        @keyframes tagIn{from{opacity:0;transform:translateX(-8px)}to{opacity:1;transform:translateX(0)}}
        @keyframes burnFlicker{0%,100%{opacity:1}50%{opacity:.7}}
        .fin{animation:fadeUp .38s ease forwards}
        .fout{animation:fadeDown .28s ease forwards}
        .tag{animation:tagIn .4s ease forwards}
        .byn{background:transparent;border:1px solid #334155;color:#94a3b8;padding:14px 28px;cursor:pointer;font-size:14px;font-family:inherit;letter-spacing:.06em;transition:all .18s}
        .byn:hover,.byn.sel{border-color:#ef4444;color:#fca5a5;background:rgba(239,68,68,.07)}
        .bsel{background:transparent;border:1px solid #334155;color:#94a3b8;padding:13px 20px;cursor:pointer;font-size:14px;font-family:inherit;width:100%;text-align:left;transition:all .18s}
        .bsel:hover,.bsel.sel{border-color:#ef4444;color:#fca5a5;background:rgba(239,68,68,.07)}
        .cta-btn{background:#ef4444;color:white;border:none;padding:18px 32px;cursor:pointer;font-size:16px;font-family:inherit;letter-spacing:.04em;width:100%;transition:all .2s}
        .cta-btn:hover{background:#dc2626;transform:translateY(-2px);box-shadow:0 8px 28px rgba(239,68,68,.35)}
        .sbtn{background:transparent;border:1px solid #1e293b;color:#475569;padding:10px 18px;cursor:pointer;font-size:12px;font-family:monospace;letter-spacing:.08em;transition:all .18s;flex:1}
        .sbtn:hover{border-color:#334155;color:#94a3b8}
        .section-label{font-size:11px;font-family:monospace;color:#475569;letter-spacing:.12em;margin-bottom:20px}
        .burn-num{animation:burnFlicker 2s ease infinite}
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", animation: "pulseRed 2s infinite" }} />
        <span style={{ fontSize: 11, letterSpacing: ".14em", color: "#475569", textTransform: "uppercase", fontFamily: "monospace" }}>
          AI PROJECT DIAGNOSTIC SYSTEM v4.0
        </span>
      </div>

      {/* ══ INTRO ══ */}
      {phase === "intro" && (
        <div className="fin" style={{ maxWidth: 720, margin: "0 auto", padding: "80px 24px 60px" }}>
          <div style={{ fontFamily: "monospace", fontSize: 11, color: "#475569", letterSpacing: ".12em", marginBottom: 32 }}>
            DIAGNOSTIC REPORT // v4.0
          </div>
          <h1 style={{ fontSize: "clamp(28px,5vw,48px)", fontWeight: 400, lineHeight: 1.2, marginBottom: 24, color: "#f1f5f9" }}>
            あなたのAIプロジェクトは<br />
            <span style={{ color: "#ef4444" }}>死ぬ確率</span>を、<br />
            知っていますか。
          </h1>
          <p style={{ fontSize: 16, color: "#64748b", lineHeight: 1.8, marginBottom: 16, maxWidth: 480 }}>
            PoC成功後に量産移行できず凍結されるAIプロジェクトは、業界全体で
            <strong style={{ color: "#94a3b8" }}>約70%</strong>に達する。
          </p>
          <p style={{ fontSize: 16, color: "#64748b", lineHeight: 1.8, marginBottom: 52, maxWidth: 480 }}>
            6つの質問で、死亡確率・危険ランキング・1日あたり損失・改善シミュレーションを診断する。
          </p>
          <button className="byn" onClick={() => { setPhase("questions"); setAnimIn(true); }}
            style={{ borderColor: "#ef4444", color: "#fca5a5", padding: "16px 48px", fontSize: 15 }}>
            診断を開始する →
          </button>
          <p style={{ marginTop: 16, fontSize: 12, color: "#334155", fontFamily: "monospace" }}>所要時間：約90秒</p>
        </div>
      )}

      {/* ══ QUESTIONS ══ */}
      {phase === "questions" && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px", display: "grid", gridTemplateColumns: "1fr 200px", gap: 48, alignItems: "start" }}>
          <div>
            <div style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#475569", letterSpacing: ".1em" }}>
                  QUESTION {currentQ + 1} / {questions.length}
                </span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "#475569" }}>{Math.round(progress)}% COMPLETE</span>
              </div>
              <div style={{ height: 2, background: "#1e293b" }}>
                <div style={{ height: "100%", background: "#ef4444", width: `${progress}%`, transition: "width .4s ease" }} />
              </div>
            </div>
            <div className={animIn ? "fin" : "fout"}>
              <div style={{ marginBottom: 8, fontSize: 11, fontFamily: "monospace", color: "#ef4444", letterSpacing: ".12em" }}>
                RISK FACTOR 0{q.id}
              </div>
              <h2 style={{ fontSize: "clamp(20px,3vw,28px)", fontWeight: 400, color: "#f1f5f9", marginBottom: 12, lineHeight: 1.4 }}>
                {q.text}
              </h2>
              <p style={{ fontSize: 14, color: "#475569", marginBottom: 40, lineHeight: 1.6 }}>{q.subtext}</p>
              {q.type === "yesno" && (
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {["Yes", "No"].map((v) => (
                    <button key={v} className={`byn ${selected === v ? "sel" : ""}`} onClick={() => handleAnswer(v)}>
                      {v === "Yes" ? "はい、決まっている" : "いいえ、未定義"}
                    </button>
                  ))}
                </div>
              )}
              {q.type === "select" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 380 }}>
                  {q.options?.map((opt) => (
                    <button key={opt} className={`bsel ${selected === opt ? "sel" : ""}`} onClick={() => handleAnswer(opt)}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {/* Risk panel */}
          <div style={{ paddingTop: 60 }}>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#334155", letterSpacing: ".1em", marginBottom: 16 }}>RISKS DETECTED</div>
            {activeRisks.length === 0
              ? <div style={{ fontSize: 12, color: "#1e293b", fontFamily: "monospace" }}>—</div>
              : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeRisks.map((r, i) => (
                    <div key={i} className="tag" style={{
                      padding: "7px 10px", background: "rgba(239,68,68,.1)",
                      border: "1px solid rgba(239,68,68,.25)", fontSize: 12, color: "#fca5a5",
                      fontFamily: "monospace", display: "flex", justifyContent: "space-between",
                    }}>
                      <span>⚠ {r.label}</span>
                      <span style={{ color: "#ef4444", fontWeight: "bold" }}>-{r.weight}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 16, padding: "12px 10px", borderTop: "1px solid #1e293b" }}>
                    <div style={{ fontSize: 11, fontFamily: "monospace", color: "#334155", marginBottom: 4 }}>DEATH RATE EST.</div>
                    <div style={{ fontSize: 28, color: "#ef4444", fontFamily: "monospace" }}>
                      {activeRisks.reduce((s, r) => s + r.weight, 0)}%
                    </div>
                  </div>
                </div>
              )
            }
          </div>
        </div>
      )}

      {/* ══ RESULT ══ */}
      {phase === "result" && result && (
        <div className="fin" style={{ maxWidth: 780, margin: "0 auto", padding: "60px 24px 80px" }}>

          {/* Report header */}
          <div style={{ borderBottom: "1px solid #1e293b", paddingBottom: 24, marginBottom: 48 }}>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#475569", letterSpacing: ".12em", marginBottom: 16 }}>
              DIAGNOSTIC REPORT // {new Date().toLocaleDateString("ja-JP")}
            </div>
            <div style={{ color: "#64748b", fontSize: 14, marginBottom: 8 }}>AIプロジェクト構造診断結果</div>
            <div style={{ color: rc(result.riskLevel), fontSize: 12, fontFamily: "monospace", letterSpacing: ".1em" }}>
              RISK LEVEL: {rl(result.riskLevel).toUpperCase()}
            </div>
          </div>

          {/* 3 METRICS */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginBottom: 56 }}>
            <div style={{
              padding: "28px 20px",
              border: `1px solid ${rc(result.riskLevel)}`,
              borderRight: "none",
              background: `rgba(${result.riskLevel === "high" ? "239,68,68" : result.riskLevel === "mid" ? "245,158,11" : "34,197,94"},.05)`,
            }}>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#475569", letterSpacing: ".1em", marginBottom: 8 }}>MORTALITY RATE</div>
              <div style={{ fontSize: "clamp(36px,6vw,56px)", color: rc(result.riskLevel), lineHeight: 1 }}>
                <CountUp target={result.deathRate} /><span style={{ fontSize: 22 }}>%</span>
              </div>
              <div style={{ fontSize: 11, color: "#334155", marginTop: 6, fontFamily: "monospace" }}>
                業界平均 {INDUSTRY_AVG_DEATH}%
                {result.deathRate > INDUSTRY_AVG_DEATH && (
                  <span style={{ color: "#ef4444", marginLeft: 6 }}>+{result.deathRate - INDUSTRY_AVG_DEATH}</span>
                )}
              </div>
            </div>
            <div style={{ padding: "28px 20px", border: "1px solid #1e293b", borderRight: "none", textAlign: "center" }}>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#475569", letterSpacing: ".1em", marginBottom: 2 }}>STRUCTURE INDEX</div>
              <GaugeArc value={result.structureIndex} color={rc(result.riskLevel)} />
              <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace" }}>構造健全性</div>
            </div>
            <div style={{ padding: "28px 20px", border: "1px solid #1e293b", textAlign: "center" }}>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#475569", letterSpacing: ".1em", marginBottom: 2 }}>DECISION MATURITY</div>
              <GaugeArc value={result.maturity} color="#3b82f6" />
              <div style={{ fontSize: 10, color: "#334155", fontFamily: "monospace" }}>意思決定成熟度</div>
            </div>
          </div>

          {/* DANGER RANKING */}
          <div style={{ marginBottom: 56 }}>
            <div className="section-label">DANGER RANKING</div>
            <div style={{ marginBottom: 20 }}>
              <span style={{ fontSize: 14, color: "#64748b" }}>あなたのプロジェクトは</span>
              <span style={{ fontSize: 22, color: rc(result.riskLevel), fontFamily: "monospace", margin: "0 8px" }}>
                上位{result.dangerPercentile}%
              </span>
              <span style={{ fontSize: 14, color: "#64748b" }}>の危険ゾーンにいます</span>
            </div>
            <RankBar percentile={result.dangerPercentile} color={rc(result.riskLevel)} />
          </div>

          {/* BURNING MONEY */}
          {result.burningMoney > 0 && (
            <div style={{ marginBottom: 56 }}>
              <div className="section-label">ESTIMATED LOSS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
                <div style={{ padding: "24px 28px", background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.25)", borderRight: "none" }}>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "#ef4444", letterSpacing: ".1em", marginBottom: 10 }}>TOTAL BURN</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span className="burn-num" style={{ fontSize: "clamp(32px,5vw,48px)", color: "#ef4444", lineHeight: 1 }}>
                      <CountUp target={result.burningMoney} duration={1600} />
                    </span>
                    <span style={{ fontSize: 18, color: "#fca5a5" }}>万円</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>が消えるリスク</div>
                </div>
                <div style={{ padding: "24px 28px", background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.4)" }}>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "#ef4444", letterSpacing: ".1em", marginBottom: 10 }}>DAILY BURN RATE</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                    <span className="burn-num" style={{ fontSize: "clamp(32px,5vw,48px)", color: "#ef4444", lineHeight: 1 }}>
                      <CountUp target={result.dailyBurn} duration={1800} decimals={1} />
                    </span>
                    <span style={{ fontSize: 18, color: "#fca5a5" }}>万円</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#475569", marginTop: 6 }}>を<strong style={{ color: "#fca5a5" }}>1日あたり</strong>燃やしています</div>
                </div>
              </div>
              <div style={{ padding: "10px 16px", background: "#0d1117", border: "1px solid #0f172a", borderTop: "none", fontSize: 12, color: "#334155", fontFamily: "monospace" }}>
                予算 {result.budgetMan.toLocaleString()}万円 × 死亡確率 {result.deathRate}% ÷ 365日
              </div>
            </div>
          )}

          {/* PEER BENCHMARK */}
          <div style={{ marginBottom: 56 }}>
            <div className="section-label">PEER BENCHMARK</div>
            <div style={{ padding: "28px", border: "1px solid #1e293b", background: "#0d1117" }}>
              <div style={{ fontSize: 12, color: "#475569", marginBottom: 20, lineHeight: 1.7 }}>
                あなたと同じ条件の企業（<span style={{ color: "#94a3b8" }}>{result.peer.desc}</span>、n={result.peer.n}社）での平均死亡率：
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 40, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: "#334155", marginBottom: 4 }}>類似企業 平均死亡率</div>
                  <div style={{ fontSize: 52, color: "#475569", lineHeight: 1, fontFamily: "Georgia,serif" }}>
                    {result.peer.avgDeath}<span style={{ fontSize: 24 }}>%</span>
                  </div>
                </div>
                <div style={{ fontSize: 28, color: "#334155", paddingBottom: 8 }}>vs</div>
                <div>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: rc(result.riskLevel), marginBottom: 4 }}>あなたのプロジェクト</div>
                  <div style={{ fontSize: 52, color: rc(result.riskLevel), lineHeight: 1, fontFamily: "Georgia,serif" }}>
                    {result.deathRate}<span style={{ fontSize: 24 }}>%</span>
                  </div>
                </div>
              </div>
              {result.deathRate > result.peer.avgDeath ? (
                <div style={{ marginTop: 16, padding: "10px 16px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", fontSize: 13, color: "#fca5a5" }}>
                  類似企業平均より <strong>{result.deathRate - result.peer.avgDeath}%高い</strong> 死亡確率です
                </div>
              ) : (
                <div style={{ marginTop: 16, padding: "10px 16px", background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)", fontSize: 13, color: "#86efac" }}>
                  類似企業平均より <strong>{result.peer.avgDeath - result.deathRate}%低い</strong> 死亡確率です
                </div>
              )}
            </div>
          </div>

          {/* WHAT-IF SIMULATION */}
          {result.whatIf.length > 0 && (
            <div style={{ marginBottom: 56 }}>
              <div className="section-label">IMPROVEMENT SIMULATION</div>
              <div style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>各リスクを1つ解消した場合の死亡確率変化</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.whatIf.map((w, i) => (
                  <div key={i} style={{ padding: "18px 20px", border: "1px solid #1e293b", background: "#0d1117" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                      <span style={{ fontSize: 13, color: "#94a3b8" }}>「{w.label}」を解消すると</span>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 18, color: rc(result.riskLevel), fontFamily: "monospace" }}>{result.deathRate}%</span>
                        <span style={{ fontSize: 14, color: "#334155" }}>→</span>
                        <span style={{ fontSize: 22, color: "#22c55e", fontFamily: "monospace" }}>{Math.max(0, w.newDeath)}%</span>
                        <span style={{ fontSize: 13, fontFamily: "monospace", color: "#22c55e", background: "rgba(34,197,94,.1)", padding: "4px 10px", border: "1px solid rgba(34,197,94,.3)" }}>
                          -{w.weight}%
                        </span>
                      </div>
                    </div>
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#334155", marginBottom: 4 }}>現在</div>
                        <div style={{ height: 4, background: "#1e293b" }}>
                          <div style={{ height: "100%", width: `${result.deathRate}%`, background: rc(result.riskLevel) }} />
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 10, fontFamily: "monospace", color: "#334155", marginBottom: 4 }}>改善後</div>
                        <div style={{ height: 4, background: "#1e293b" }}>
                          <div style={{ height: "100%", width: `${Math.max(0, w.newDeath)}%`, background: "#22c55e", transition: "width .6s ease" }} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 12, padding: "12px 16px", background: "rgba(59,130,246,.05)", border: "1px solid rgba(59,130,246,.15)", fontSize: 13, color: "#60a5fa" }}>
                💡 上記の改善は、30分のレビューセッションで実行可能なアクションです
              </div>
            </div>
          )}

          {/* PROJECT PATTERNS */}
          {result.patterns.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <div className="section-label">PROJECT FAILURE PATTERN</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {result.patterns.map((p, i) => (
                  <div key={i} style={{ padding: "20px 24px", border: `1px solid ${p.color}33`, background: `${p.color}0a`, display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "start" }}>
                    <div style={{ width: 44, height: 44, border: `1px solid ${p.color}55`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: p.color, flexShrink: 0 }}>
                      {p.icon}
                    </div>
                    <div>
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: p.color, border: `1px solid ${p.color}55`, padding: "2px 8px", letterSpacing: ".1em" }}>{p.label}</span>
                      </div>
                      <div style={{ fontSize: 14, color: "#64748b", lineHeight: 1.7, marginBottom: 6 }}>{p.desc}</div>
                      <div style={{ fontSize: 11, fontFamily: "monospace", color: "#334155" }}>📊 {p.stat}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RISKS */}
          {result.risks.length > 0 && (
            <div style={{ marginBottom: 48 }}>
              <div className="section-label">DETECTED STRUCTURAL RISKS</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result.risks.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 20px", background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.18)" }}>
                    <div style={{ textAlign: "center", flexShrink: 0, paddingTop: 2 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#ef4444", margin: "0 auto 4px" }} />
                      <span style={{ fontSize: 12, fontFamily: "monospace", color: "#ef4444", fontWeight: "bold" }}>-{r.weight}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: 15, color: "#f1f5f9", marginBottom: 4 }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{r.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TIMELINE */}
          <div style={{ marginBottom: 56 }}>
            <div className="section-label">PROJECTED TIMELINE</div>
            {result.scenarios.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 0, alignItems: "stretch" }}>
                <div style={{ width: 40, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", flexShrink: 0, marginTop: 20, background: s.type === "dead" ? "#ef4444" : s.type === "warn" ? "#f59e0b" : s.type === "good" ? "#22c55e" : "#475569" }} />
                  {i < result.scenarios.length - 1 && <div style={{ width: 1, flex: 1, background: "#1e293b", margin: "4px 0" }} />}
                </div>
                <div style={{ paddingBottom: 28, paddingTop: 14 }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#475569", marginBottom: 4, letterSpacing: ".08em" }}>{s.month}</div>
                  <div style={{ fontSize: 15, color: s.type === "dead" ? "#ef4444" : s.type === "warn" ? "#f59e0b" : s.type === "good" ? "#22c55e" : "#94a3b8" }}>
                    {s.event}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DEATH MAP */}
          <div style={{ marginBottom: 56 }}>
            <div className="section-label">INDUSTRY DEATH RATE MAP</div>
            <div style={{ fontSize: 12, color: "#334155", marginBottom: 20, lineHeight: 1.6 }}>
              Decision Maturity が高いほど死亡確率は下がる。あなたは業界分布のどこにいるか。
            </div>
            <div style={{ background: "#0d1117", border: "1px solid #1e293b", padding: "20px 8px 16px 0" }}>
              <ResponsiveContainer width="100%" height={240}>
                <ScatterChart margin={{ top: 10, right: 60, bottom: 30, left: 50 }}>
                  <XAxis dataKey="x" type="number" name="DM" domain={[0, 100]} tickCount={6}
                    tick={{ fill: "#334155", fontSize: 11, fontFamily: "monospace" }}
                    label={{ value: "Decision Maturity →", position: "insideBottom", offset: -14, fill: "#334155", fontSize: 11, fontFamily: "monospace" }} />
                  <YAxis dataKey="y" type="number" name="死亡確率" domain={[0, 100]} tickCount={6}
                    tick={{ fill: "#334155", fontSize: 11, fontFamily: "monospace" }}
                    label={{ value: "死亡確率 %", angle: -90, position: "insideLeft", offset: 10, fill: "#334155", fontSize: 11, fontFamily: "monospace" }} />
                  <Tooltip cursor={false} content={({ payload }) => {
                    if (!payload?.length) return null;
                    const d = payload[0]?.payload as ScatterPoint;
                    return (
                      <div style={{ background: "#0d1117", border: "1px solid #1e293b", padding: "8px 12px", fontSize: 12, fontFamily: "monospace" }}>
                        {d.isUser
                          ? <span style={{ color: "#ef4444" }}>▶ あなた：DM {d.x} / 死亡確率 {d.y}%</span>
                          : <span style={{ color: "#475569" }}>DM {d.x} / 死亡確率 {d.y}%</span>}
                      </div>
                    );
                  }} />
                  <ReferenceLine y={INDUSTRY_AVG_DEATH} stroke="#1e293b" strokeDasharray="4 4"
                    label={{ value: `業界平均 ${INDUSTRY_AVG_DEATH}%`, position: "right", fill: "#334155", fontSize: 10, fontFamily: "monospace" }} />
                  <ReferenceLine x={INDUSTRY_AVG_MATURITY} stroke="#1e293b" strokeDasharray="4 4"
                    label={{ value: `平均DM ${INDUSTRY_AVG_MATURITY}`, position: "top", fill: "#334155", fontSize: 10, fontFamily: "monospace" }} />
                  <Scatter data={industryData} shape={(props: unknown) => {
                    const { cx, cy } = props as { cx: number; cy: number };
                    return <circle cx={cx} cy={cy} r={4} fill="#1e293b" stroke="#334155" strokeWidth={1} />;
                  }} />
                  <Scatter data={userPoint} shape={(props: unknown) => {
                    const { cx, cy } = props as { cx: number; cy: number };
                    return (
                      <g>
                        <circle cx={cx} cy={cy} r={12} fill="rgba(239,68,68,.2)" stroke="#ef4444" strokeWidth={1.5} />
                        <circle cx={cx} cy={cy} r={5} fill="#ef4444" />
                        <text x={cx + 16} y={cy + 4} fill="#ef4444" fontSize={11} fontFamily="monospace">あなた</text>
                      </g>
                    );
                  }} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* CTA */}
          <div style={{ border: "1px solid #1e293b", padding: "40px 32px", background: "rgba(15,20,30,.8)", marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontFamily: "monospace", color: "#475569", letterSpacing: ".1em", marginBottom: 20 }}>NEXT STEP</div>
            <h3 style={{ fontSize: 22, fontWeight: 400, color: "#f1f5f9", marginBottom: 12, lineHeight: 1.5 }}>プロジェクト構造レビュー</h3>
            <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.9, marginBottom: 28 }}>
              AI導入プロジェクトの構造リスクを、<strong style={{ color: "#94a3b8" }}>30分</strong>で専門家がレビューします。
              {result.whatIf.length > 0 && (
                <span> 上記の改善シミュレーション通りに構造を修正すれば、死亡確率を <strong style={{ color: "#22c55e" }}>{result.whatIf.reduce((s, w) => s + w.weight, 0)}%</strong> 下げられます。</span>
              )}
            </p>
            <button className="cta-btn" onClick={() => window.location.href = "/contact"}>
              {result.ctaCopy}
            </button>
            <p style={{ marginTop: 16, fontSize: 12, color: "#334155", textAlign: "center", fontFamily: "monospace" }}>
              無料 / 30分 / オンライン
            </p>
          </div>

          {/* Share */}
          <div style={{ display: "flex", gap: 12, marginBottom: 32 }}>
            <button className="sbtn" onClick={() => {
              const text = `【AIプロジェクト診断結果】\n死亡確率：${result.deathRate}%（業界平均：${INDUSTRY_AVG_DEATH}%）\n危険ランキング：上位${result.dangerPercentile}%\n${result.dailyBurn > 0 ? `1日あたり燃焼額：${result.dailyBurn}万円\n` : ""}構造パターン：${result.patterns.map((p) => p.label).join("、") || "なし"}`;
              navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); });
            }}>
              {copied ? "✓ コピーしました" : "📋 診断結果をコピー（社内共有用）"}
            </button>
            <button className="sbtn" onClick={() => window.print()}>🖨 PDF保存</button>
          </div>

          <div style={{ textAlign: "center" }}>
            <button onClick={handleReset} style={{ background: "none", border: "none", color: "#334155", cursor: "pointer", fontSize: 13, fontFamily: "monospace", letterSpacing: ".08em" }}>
              ← 最初からやり直す
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
