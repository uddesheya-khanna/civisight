/**
 * CiviSight AI — Cinematic Scroll Landing Page (Photo Edition)
 *
 * Creative direction:
 *   Real infrastructure photography + CSS cinematic scroll effects
 *   + R3F transparent overlay for the AI scan line
 *   + HTML detection boxes positioned over the photo
 *
 * Scroll narrative:
 *   0.00–0.12  Hero / wide bridge shot emerges
 *   0.12–0.26  "Every structure tells a story" — camera zooms in
 *   0.26–0.40  Surface close-up — photo cross-fades to concrete texture
 *   0.36–0.46  "Not everything is easy to see"
 *   0.42–0.58  Scan activates — line sweeps, desaturation, CV boxes appear
 *   0.54–0.68  "From image to insight" — technical grid overlay
 *   0.66–0.84  Three inspection modules
 *   0.84–1.00  Final CTA on clean dark background
 *
 * Dashboard route: /dashboard (verified in App.tsx)
 * No fake AI data. All CV elements labelled illustrative / aria-hidden.
 */
import React, { useRef, Suspense, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { InspectionOverlay } from '../components/3d/InspectionOverlay';
import { useScrollProgress } from '../hooks/useScrollProgress';
// MODULE_DEFINITIONS used via MODULES array below

// ── Palette ────────────────────────────────────────────────────────
const C = {
  bg:       '#0E0D0C',
  accent:   '#8FAD5A',
  white:    '#F5F2EC',
  dim:      'rgba(245,242,236,0.50)',
  dimmer:   'rgba(245,242,236,0.28)',
  red:      '#EF4444',
  orange:   '#F97316',
  concrete: '#77746D',
};

// ── Helpers ────────────────────────────────────────────────────────
function clamp01(v: number) { return Math.max(0, Math.min(1, v)); }
function fio(p: number, iA: number, iB: number, oA: number, oB: number): number {
  if (p < iA) return 0;
  if (p < iB) return clamp01((p - iA) / (iB - iA));
  if (p < oA) return 1;
  if (p < oB) return 1 - clamp01((p - oA) / (oB - oA));
  return 0;
}

// ── Mobile detection ──────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const c = () => setM(window.innerWidth < 768);
    c(); window.addEventListener('resize', c);
    return () => window.removeEventListener('resize', c);
  }, []);
  return m;
}

// ── TextScene ─────────────────────────────────────────────────────
function TextScene({
  opacity, y = 0, children, style,
}: { opacity: number; y?: number; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      opacity,
      transform: `translateY(${y}px)`,
      pointerEvents: opacity > 0.08 ? 'auto' : 'none',
      willChange: 'opacity, transform',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ── Engineering label ──────────────────────────────────────────────
function ELabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{
      fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 700,
      letterSpacing: '0.24em', textTransform: 'uppercase', color: C.accent,
      display: 'block',
      ...style,
    }}>
      {children}
    </span>
  );
}

// ── CV detection box (illustrative) ───────────────────────────────
interface DetectionBoxProps {
  left: string; top: string; width: string; height: string;
  label: string; conf: string; color: string; opacity: number;
}
function DetectionBox({ left, top, width, height, label, conf, color, opacity }: DetectionBoxProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', left, top, width, height,
        border: `1px solid ${color}`,
        opacity,
        pointerEvents: 'none',
      }}
    >
      {/* Corner accent marks */}
      <div style={{ position: 'absolute', top: -1, left: -1, width: 10, height: 10,
        borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <div style={{ position: 'absolute', top: -1, right: -1, width: 10, height: 10,
        borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
      <div style={{ position: 'absolute', bottom: -1, left: -1, width: 10, height: 10,
        borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <div style={{ position: 'absolute', bottom: -1, right: -1, width: 10, height: 10,
        borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
      {/* Label */}
      <div style={{
        position: 'absolute', top: '-22px', left: 0,
        display: 'flex', alignItems: 'center', gap: '6px',
        padding: '2px 8px',
        background: `${color}18`, backdropFilter: 'blur(4px)',
        border: `1px solid ${color}40`,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '8px', fontWeight: 700,
          letterSpacing: '0.18em', color, textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '8px', fontWeight: 500,
          color: `${color}BB`, letterSpacing: '0.08em' }}>
          {conf}
        </span>
      </div>
    </div>
  );
}

// ── Engineering grid overlay (CSS) ────────────────────────────────
function GridOverlay({ opacity }: { opacity: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', inset: 0, opacity,
        backgroundImage: `
          linear-gradient(rgba(143,173,90,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(143,173,90,0.08) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }}
    />
  );
}

// ── Noise vignette ────────────────────────────────────────────────
function Vignette() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none',
      background: `radial-gradient(ellipse at center, transparent 40%, rgba(14,13,12,0.7) 100%)`,
    }} />
  );
}

// ── Minimal nav ───────────────────────────────────────────────────
function LandingNav() {
  return (
    <nav
      aria-label="CiviSight navigation"
      style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 60,
        padding: '20px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(14,13,12,0.72) 0%, transparent 100%)',
      }}
    >
      <span style={{
        fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
        letterSpacing: '0.18em', color: C.white, textTransform: 'uppercase',
        userSelect: 'none',
      }}>
        CiviSight&nbsp;<span style={{ color: C.accent }}>AI</span>
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <Link to="/inspections" style={{
          fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500,
          letterSpacing: '0.14em', color: C.dim, textDecoration: 'none',
          textTransform: 'uppercase',
        }}>History</Link>
        <Link to="/about" style={{
          fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 500,
          letterSpacing: '0.14em', color: C.dim, textDecoration: 'none',
          textTransform: 'uppercase',
        }}>About</Link>
        <Link to="/dashboard" style={{
          fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 700,
          letterSpacing: '0.14em', color: C.bg, textDecoration: 'none',
          textTransform: 'uppercase', background: C.accent,
          padding: '8px 18px', borderRadius: '3px',
        }}>
          Inspect →
        </Link>
      </div>
    </nav>
  );
}

// ── Progress bar ──────────────────────────────────────────────────
function ProgressBar({ p }: { p: number }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1.5px', zIndex: 70 }}>
      <div style={{ height: '100%', background: C.accent, width: `${p * 100}%` }} />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export const Landing: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null!);
  const { progress: p, scrollRef } = useScrollProgress(containerRef);
  const isMobile = useIsMobile();

  useEffect(() => { document.title = 'CiviSight AI — Infrastructure Intelligence'; }, []);

  // ── Photo transforms ─────────────────────────────────────────────
  // Hero photo: starts wide, zooms and desaturates as we scroll
  const heroScale       = 1 + p * 0.14;
  const heroTranslateY  = p * -4; // subtle parallax %
  const heroBrightness  = clamp01(0.78 - p * 0.28);
  const heroSaturate    = p < 0.30 ? 1 : clamp01(1 - (p - 0.30) / 0.28 * 0.80);
  const heroContrast    = 1 + p * 0.12;
  const heroOp          = p < 0.78 ? 1 : 1 - clamp01((p - 0.78) / 0.10);

  // Surface texture cross-fade (appears at 0.26, stays until 0.62)
  const surfaceOp = fio(p, 0.26, 0.34, 0.58, 0.65);
  // Surface also zooms
  const surfaceScale = 1 + (p - 0.26) * 0.06;

  // CV overlays
  // (scan line opacity is handled by InspectionOverlay via scrollRef)
  const detectOp    = fio(p, 0.44, 0.50, 0.56, 0.63);
  const gridOp      = fio(p, 0.56, 0.63, 0.72, 0.80);

  // CTA section
  const ctaOp = fio(p, 0.84, 0.90, 0.99, 1.00);
  const ctaY  = p < 0.84 ? 28 : 28 * (1 - (p - 0.84) / 0.06);

  // ── Text scene timings ──────────────────────────────────────────
  const heroTextOp = fio(p, 0.00, 0.04, 0.10, 0.15);
  const heroTextY  = p < 0.04 ? 20 * (1 - p / 0.04) : p < 0.10 ? 0 : -(p - 0.10) / 0.05 * 22;

  const s1Op = fio(p, 0.13, 0.18, 0.22, 0.28);
  const s1Y  = p < 0.13 ? 20 : p < 0.18 ? 20 * (1 - (p - 0.13) / 0.05) : p < 0.22 ? 0 : -(p - 0.22) / 0.06 * 20;

  const s2Op = fio(p, 0.28, 0.34, 0.40, 0.46);
  const s2Y  = p < 0.28 ? 18 : p < 0.34 ? 18 * (1 - (p - 0.28) / 0.06) : p < 0.40 ? 0 : -(p - 0.40) / 0.06 * 18;

  const s3Op = fio(p, 0.42, 0.47, 0.52, 0.57);

  const s4Op = fio(p, 0.54, 0.59, 0.64, 0.68);
  const s4Y  = p < 0.54 ? 22 : p < 0.59 ? 22 * (1 - (p - 0.54) / 0.05) : p < 0.64 ? 0 : -(p - 0.64) / 0.04 * 22;

  // Module opacities
  const m1Op = fio(p, 0.66, 0.70, 0.72, 0.76);
  const m2Op = fio(p, 0.74, 0.77, 0.79, 0.82);
  const m3Op = fio(p, 0.80, 0.83, 0.84, 0.87);

  const scrollCueOp = fio(p, 0.01, 0.06, 0.10, 0.14);

  // ── Shared layout helpers ────────────────────────────────────────
  const absCenter: React.CSSProperties = {
    position: 'absolute', left: '50%', transform: 'translateX(-50%)',
    textAlign: 'center', width: '100%', maxWidth: '860px', padding: '0 28px',
  };
  const absLeft: React.CSSProperties = {
    position: 'absolute', left: isMobile ? '24px' : '7vw',
    maxWidth: isMobile ? 'calc(100vw - 48px)' : '500px',
  };
  const absRight: React.CSSProperties = {
    position: 'absolute', right: isMobile ? '24px' : '7vw',
    textAlign: 'right', maxWidth: isMobile ? 'calc(100vw - 48px)' : '440px',
  };
  const display: React.CSSProperties = {
    fontFamily: 'Inter, sans-serif', fontWeight: 800,
    letterSpacing: '-0.03em', lineHeight: 1.0,
    color: C.white, margin: 0,
  };
  const heroFontSize  = isMobile ? 'clamp(42px,11vw,72px)' : 'clamp(58px,7.5vw,106px)';
  const bodyFontSize  = isMobile ? 'clamp(36px,9vw,58px)'  : 'clamp(44px,6vw,80px)';

  const MODULES = [
    { op: m1Op, num: '01', route: 'crack_detection',    title: 'CONCRETE',
      surface: 'Concrete Structures',
      body: 'Automated detection of surface cracks and fracture lines in concrete walls, slabs, and columns — preliminary visual observation only.' },
    { op: m2Op, num: '02', route: 'pothole_detection',  title: 'ROAD',
      surface: 'Asphalt Pavements',
      body: 'Visual identification of potholes and road-surface breakdown to help prioritise maintenance — where supported by the installed model.' },
    { op: m3Op, num: '03', route: 'safety_detection',   title: 'SAFETY',
      surface: 'Construction Sites',
      body: 'Detection of on-site personnel and visible helmet-wearing status — a preliminary PPE compliance observation, not a certified assessment.' },
  ];

  return (
    <>
      <style>{`
        @keyframes csBounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(6px)} }
        @keyframes csPulse  { 0%,100%{opacity:.65} 50%{opacity:1} }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── 680 vh scroll container ────────────────────────── */}
      <div ref={containerRef} style={{ height: '680vh', background: C.bg, position: 'relative' }}>

        {/* ── STICKY VIEWPORT ──────────────────────────────── */}
        <div style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden', background: C.bg }}>

          {/* ══ PHOTO LAYER ══════════════════════════════════ */}
          {/* Hero — wide bridge shot */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              opacity: heroOp,
              transition: 'none',
            }}
          >
            <div style={{
              position: 'absolute', inset: '-5%',
              backgroundImage: "url('/hero-bridge.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center 60%',
              transform: `scale(${heroScale}) translateY(${heroTranslateY}%)`,
              filter: `brightness(${heroBrightness}) saturate(${heroSaturate}) contrast(${heroContrast})`,
              willChange: 'transform, filter',
            }} />
          </div>

          {/* Surface texture close-up cross-fade */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: 0,
              opacity: surfaceOp,
              pointerEvents: 'none',
            }}
          >
            <div style={{
              position: 'absolute', inset: '-5%',
              backgroundImage: "url('/concrete-surface.jpg')",
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `scale(${surfaceScale})`,
              filter: `brightness(0.55) saturate(${Math.max(0.1, heroSaturate - 0.1)}) contrast(1.15)`,
            }} />
          </div>

          {/* Dark overlay for text contrast — heavier at top/bottom */}
          <div aria-hidden="true" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `
              linear-gradient(to bottom,
                rgba(14,13,12,0.62) 0%,
                rgba(14,13,12,0.12) 35%,
                rgba(14,13,12,0.12) 65%,
                rgba(14,13,12,0.72) 100%
              )
            `,
          }} />
          <Vignette />

          {/* ══ R3F SCAN OVERLAY (transparent canvas) ════════ */}
          <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            <Suspense fallback={null}>
              <Canvas
                orthographic
                camera={{ zoom: 100, position: [0, 0, 10] }}
                gl={{ alpha: true, antialias: true }}
                style={{ background: 'transparent' }}
                dpr={[1, 1.5]}
              >
                <InspectionOverlay scrollRef={scrollRef} />
              </Canvas>
            </Suspense>
          </div>

          {/* ══ CSS CV OVERLAYS ═══════════════════════════════ */}
          {/* Engineering grid */}
          <GridOverlay opacity={gridOp} />

          {/* Detection bounding boxes — illustrative, aria-hidden */}
          {detectOp > 0.02 && (
            <>
              <DetectionBox
                left="14%" top="35%" width="22%" height="20%"
                label="Surface Region" conf="0.83"
                color={C.red} opacity={detectOp}
              />
              <DetectionBox
                left="50%" top="42%" width="16%" height="14%"
                label="Visual Anomaly" conf="0.71"
                color={C.orange} opacity={detectOp * 0.85}
              />
              <DetectionBox
                left="66%" top="28%" width="20%" height="24%"
                label="Surface Pattern" conf="0.64"
                color={C.orange} opacity={detectOp * 0.65}
              />
            </>
          )}

          {/* ══ PROGRESS ═════════════════════════════════════ */}
          <ProgressBar p={p} />

          {/* ══ NAVIGATION ═══════════════════════════════════ */}
          <LandingNav />

          {/* ══════════════════════════════════════════════════
              TEXT SCENES
          ══════════════════════════════════════════════════ */}

          {/* ── HERO TEXT ─────────────────────────────────── */}
          <TextScene
            opacity={heroTextOp} y={heroTextY}
            style={{ ...absCenter, top: '50%', transform: 'translate(-50%,-50%)' }}
          >
            <ELabel style={{ marginBottom: '18px' }}>Infrastructure Intelligence / 01</ELabel>
            <h1 style={{ ...display, fontSize: heroFontSize, marginBottom: '20px' }}>
              SEE<br />
              INFRASTRUCTURE<br />
              <span style={{ color: C.accent }}>DIFFERENTLY.</span>
            </h1>
            <p style={{
              fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 400,
              lineHeight: 1.72, color: C.dim, marginBottom: '36px',
              maxWidth: '360px', marginLeft: 'auto', marginRight: 'auto',
            }}>
              AI-powered visual inspection for the built environment.
            </p>
            <Link
              to="/dashboard"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '10px',
                padding: '14px 34px',
                background: C.accent, color: C.bg,
                fontFamily: 'Inter, sans-serif', fontSize: '12px',
                fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                textDecoration: 'none', borderRadius: '3px',
              }}
              aria-label="Start Inspection — opens dashboard"
            >
              Start Inspection →
            </Link>
          </TextScene>

          {/* Scroll cue */}
          <div style={{
            position: 'absolute', bottom: '28px', left: '50%',
            transform: 'translateX(-50%)',
            opacity: scrollCueOp, pointerEvents: 'none',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
          }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '8px',
              fontWeight: 600, letterSpacing: '0.26em', color: C.dimmer,
              textTransform: 'uppercase' }}>
              Scroll to explore
            </span>
            <span style={{ fontSize: '14px', color: C.dim,
              animation: 'csBounce 1.8s ease-in-out infinite' }}>↓</span>
          </div>

          {/* ── SCENE 1 — APPROACH ─────────────────────────── */}
          <TextScene
            opacity={s1Op} y={s1Y}
            style={{ ...absLeft, top: '44%', transform: 'translateY(-50%)' }}
          >
            <h2 style={{ ...display, fontSize: bodyFontSize, marginBottom: '16px' }}>
              EVERY STRUCTURE<br />TELLS A STORY.
            </h2>
            <p style={{
              fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 400,
              lineHeight: 1.72, color: C.dim, maxWidth: '320px', margin: 0,
            }}>
              Civil infrastructure accumulates visible evidence of stress, loading, and time.
              CiviSight reads what's already there.
            </p>
          </TextScene>

          {/* ── SCENE 2 — SURFACE ──────────────────────────── */}
          <TextScene
            opacity={s2Op} y={s2Y}
            style={{ ...absRight, top: '42%', transform: 'translateY(-50%)' }}
          >
            <h2 style={{ ...display, fontSize: bodyFontSize, marginBottom: '14px' }}>
              BUT NOT EVERYTHING<br />
              <span style={{ color: C.concrete }}>IS EASY TO SEE.</span>
            </h2>
            <p style={{
              fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 400,
              lineHeight: 1.72, color: C.dim, maxWidth: '300px', marginLeft: 'auto', margin: 0,
            }}>
              Surface deterioration begins long before it becomes a visible crisis.
            </p>
          </TextScene>

          {/* ── SCENE 3 — SCAN BEGINS ──────────────────────── */}
          <TextScene
            opacity={s3Op}
            style={{ ...absCenter, top: '44%', transform: 'translate(-50%,-50%)' }}
          >
            <ELabel style={{ marginBottom: '16px' }}>Analysis active · Illustrative</ELabel>
            <h2 style={{ ...display,
              fontSize: isMobile ? 'clamp(52px,14vw,84px)' : 'clamp(68px,9.5vw,120px)',
              marginBottom: '0',
            }}>
              LOOK<br />
              <span style={{ color: C.accent }}>CLOSER.</span>
            </h2>
          </TextScene>

          {/* ── SCENE 4 — FROM IMAGE TO INSIGHT ────────────── */}
          <TextScene
            opacity={s4Op} y={s4Y}
            style={{ ...absLeft, top: '45%', transform: 'translateY(-50%)' }}
          >
            <ELabel style={{ marginBottom: '16px' }}>Computer vision pipeline</ELabel>
            <h2 style={{ ...display, fontSize: bodyFontSize, marginBottom: '20px' }}>
              FROM IMAGE<br />
              TO <span style={{ color: C.accent }}>INSIGHT.</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {['Capture', 'Analyze', 'Detect', 'Interpret', 'Report'].map((step, i) => (
                <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px',
                    fontWeight: 700, letterSpacing: '0.18em', color: C.accent,
                    minWidth: '22px' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px',
                    fontWeight: 500, letterSpacing: '0.12em', color: C.dim,
                    textTransform: 'uppercase' }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </TextScene>

          {/* ── MODULES ────────────────────────────────────── */}
          {MODULES.map((m) => (
            <TextScene
              key={m.route}
              opacity={m.op}
              style={{ ...absLeft, top: '46%', transform: 'translateY(-50%)' }}
            >
              <ELabel style={{ marginBottom: '14px' }}>{`${m.num} / ${m.surface}`}</ELabel>
              <h2 style={{ ...display,
                fontSize: isMobile ? 'clamp(42px,11vw,68px)' : 'clamp(54px,7vw,88px)',
                marginBottom: '16px',
              }}>
                {m.title}
              </h2>
              <p style={{
                fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 400,
                lineHeight: 1.72, color: C.dim, maxWidth: '360px', marginBottom: '20px',
              }}>
                {m.body}
              </p>
              <Link
                to={`/inspect/${m.route}`}
                style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700,
                  letterSpacing: '0.16em', textTransform: 'uppercase',
                  color: C.accent, textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                }}
              >
                Inspect this module →
              </Link>
            </TextScene>
          ))}

          {/* ── FINAL CTA ────────────────────────────────────── */}
          {/* Dark bg sweeps in beneath the photo */}
          <div style={{
            position: 'absolute', inset: 0,
            background: C.bg,
            opacity: clamp01((p - 0.80) / 0.08),
            pointerEvents: 'none',
          }} />

          <TextScene
            opacity={ctaOp} y={ctaY}
            style={{ ...absCenter, top: '50%', transform: 'translate(-50%,-50%)' }}
          >
            {/* Thin line animates in */}
            <div aria-hidden="true" style={{
              height: '1px', background: C.accent,
              width: `${clamp01((p - 0.86) / 0.06) * 100}px`,
              maxWidth: '100px', margin: '0 auto 28px',
            }} />

            <h2 style={{ ...display,
              fontSize: isMobile ? 'clamp(40px,11vw,68px)' : 'clamp(54px,7.5vw,100px)',
              marginBottom: '22px',
            }}>
              READY TO<br />
              LOOK <span style={{ color: C.accent }}>CLOSER?</span>
            </h2>

            <p style={{
              fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 400,
              lineHeight: 1.75, color: C.dim,
              maxWidth: '340px', margin: '0 auto 36px',
            }}>
              Upload infrastructure imagery and receive a real AI-assisted preliminary
              visual inspection in seconds.
            </p>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link
                to="/dashboard"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  padding: '14px 34px',
                  background: C.accent, color: C.bg,
                  fontFamily: 'Inter, sans-serif', fontSize: '12px',
                  fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase',
                  textDecoration: 'none', borderRadius: '3px',
                }}
                aria-label="Start Inspection — navigate to dashboard"
              >
                Start Inspection →
              </Link>
              <Link
                to="/about"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  padding: '14px 28px',
                  border: `1px solid rgba(143,173,90,0.35)`, color: C.dim,
                  fontFamily: 'Inter, sans-serif', fontSize: '12px',
                  fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
                  textDecoration: 'none', borderRadius: '3px',
                }}
              >
                Learn more
              </Link>
            </div>

            {/* Disclaimer */}
            <p role="note" style={{
              fontFamily: 'Inter, sans-serif', fontSize: '10px', fontWeight: 400,
              lineHeight: 1.75, color: 'rgba(245,242,236,0.26)',
              maxWidth: '400px', margin: '28px auto 0',
            }}>
              CiviSight provides AI-assisted preliminary visual observations and does not
              replace professional engineering inspection or structural assessment.
            </p>
          </TextScene>

          {/* Bottom strip */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '14px 32px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            opacity: ctaOp * 0.55, pointerEvents: ctaOp > 0.4 ? 'auto' : 'none',
          }}>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '9px',
              fontWeight: 500, letterSpacing: '0.18em', color: C.concrete,
              textTransform: 'uppercase' }}>
              © CiviSight AI
            </span>
            <div style={{ display: 'flex', gap: '22px' }}>
              {([['Dashboard', '/dashboard'], ['Inspections', '/inspections'],
                 ['Reports', '/reports'], ['About', '/about']] as [string, string][]).map(([label, to]) => (
                <Link key={to} to={to} style={{
                  fontFamily: 'Inter, sans-serif', fontSize: '9px', fontWeight: 500,
                  letterSpacing: '0.16em', color: C.concrete, textDecoration: 'none',
                  textTransform: 'uppercase',
                }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

        </div>{/* end sticky */}
      </div>{/* end scroll container */}
    </>
  );
};
