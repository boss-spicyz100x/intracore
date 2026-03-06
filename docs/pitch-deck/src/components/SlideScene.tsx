import { AbsoluteFill } from "remotion";
import { loadFont } from "@remotion/google-fonts/Roboto";
import type { Slide } from "../slides/slides";
import { M3 } from "../theme/m3-tokens";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "700"],
  subsets: ["latin"],
});

type SlideSceneProps = {
  slide: Slide;
};

function SlideDecorations({ slideId }: { slideId: string }) {
  const svgStyle = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    overflow: "visible" as const,
    pointerEvents: "none" as const,
  };

  const defs = (
    <defs>
      <linearGradient id={`blob1-${slideId}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={M3.primaryContainer} stopOpacity="0.45" />
        <stop offset="100%" stopColor={M3.primary} stopOpacity="0.12" />
      </linearGradient>
      <linearGradient id={`blob2-${slideId}`} x1="100%" y1="100%" x2="0%" y2="0%">
        <stop offset="0%" stopColor={M3.outlineVariant} stopOpacity="0.35" />
        <stop offset="100%" stopColor={M3.primaryContainer} stopOpacity="0.08" />
      </linearGradient>
    </defs>
  );

  switch (slideId) {
    case "title":
      return (
        <svg style={svgStyle} viewBox="0 0 1920 1080">
          <defs>
            <linearGradient id="titleGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={M3.primaryContainer} stopOpacity="0.4" />
              <stop offset="100%" stopColor={M3.primary} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path d="M0 0 L1920 0 L1920 360 Q960 480 0 360 Z" fill="url(#titleGrad1)" />
          <path d="M0 1080 L1920 1080 L1920 720 Q960 600 0 720 Z" fill={M3.primaryContainer} opacity="0.15" />
          <rect x="100" y="100" width="200" height="200" rx="48" fill={M3.primary} opacity="0.06" transform="rotate(-12 200 200)" />
          <rect x="1620" y="780" width="180" height="180" rx="48" fill={M3.primaryContainer} opacity="0.2" transform="rotate(18 1710 870)" />
          <path d="M960 200 Q1400 400 960 600 Q520 400 960 200z" fill="none" stroke={M3.primary} strokeWidth="2" opacity="0.08" />
        </svg>
      );
    case "problem":
      return (
        <svg style={svgStyle} viewBox="0 0 1920 1080">
          {defs}
          <path d="M0 0 L1920 0 L1920 400 L0 540 Z" fill="url(#blob1-problem)" opacity="0.6" />
          <path d="M0 1080 L1920 1080 L1920 680 L0 540 Z" fill="url(#blob2-problem)" opacity="0.5" />
          <polygon points="100,100 200,50 180,180 50,200" fill={M3.primary} opacity="0.05" />
          <polygon points="1820,980 1720,1030 1740,900 1870,880" fill={M3.outlineVariant} opacity="0.08" />
        </svg>
      );
    case "solution":
      return (
        <svg style={svgStyle} viewBox="0 0 1920 1080">
          {defs}
          <path d="M0 1080 Q480 400 960 600 T1920 1080V1080H0z" fill="url(#blob1-solution)" opacity="0.5" />
          <ellipse cx="1600" cy="200" rx="200" ry="120" fill={M3.primaryContainer} opacity="0.2" transform="rotate(-15 1600 200)" />
          <path d="M0 0 L300 0 L250 200 L0 250 Z" fill={M3.primary} opacity="0.06" />
        </svg>
      );
    case "how-it-works":
      return (
        <svg style={svgStyle} viewBox="0 0 1920 1080">
          {defs}
          <rect x="100" y="200" width="120" height="120" rx="24" fill={M3.primaryContainer} opacity="0.15" />
          <rect x="400" y="400" width="120" height="120" rx="24" fill={M3.primary} opacity="0.08" />
          <rect x="700" y="600" width="120" height="120" rx="24" fill={M3.primaryContainer} opacity="0.12" />
          <rect x="1500" y="300" width="100" height="100" rx="20" fill={M3.outlineVariant} opacity="0.1" transform="rotate(10 1550 350)" />
          <line x1="220" y1="260" x2="460" y2="460" stroke={M3.primary} strokeWidth="2" opacity="0.08" />
          <line x1="520" y1="460" x2="760" y2="660" stroke={M3.primary} strokeWidth="2" opacity="0.08" />
        </svg>
      );
    case "benefits":
      return (
        <svg style={svgStyle} viewBox="0 0 1920 1080">
          {defs}
          <ellipse cx="300" cy="300" rx="180" ry="100" fill={M3.primaryContainer} opacity="0.2" transform="rotate(-20 300 300)" />
          <ellipse cx="1600" cy="700" rx="150" ry="80" fill={M3.primary} opacity="0.1" transform="rotate(15 1600 700)" />
          <rect x="1700" y="100" width="80" height="80" rx="40" fill={M3.primaryContainer} opacity="0.15" />
          <rect x="50" y="900" width="100" height="60" rx="30" fill={M3.outlineVariant} opacity="0.12" />
        </svg>
      );
    case "product":
      return (
        <svg style={svgStyle} viewBox="0 0 1920 1080">
          {defs}
          <path d="M960 100 L1760 380 L1760 780 L960 980 L160 780 L160 380 Z" fill="none" stroke={M3.primary} strokeWidth="1.5" opacity="0.06" />
          <path d="M960 250 L1520 480 L1520 780 L960 900 L400 780 L400 480 Z" fill="none" stroke={M3.primary} strokeWidth="1" opacity="0.05" />
          <circle cx="960" cy="540" r="80" fill={M3.primaryContainer} opacity="0.1" />
          <rect x="100" y="500" width="60" height="60" rx="8" fill={M3.primary} opacity="0.06" transform="rotate(45 130 530)" />
        </svg>
      );
    case "flow":
      return (
        <svg style={svgStyle} viewBox="0 0 1920 1080">
          {defs}
          <path d="M0 200 Q480 200 480 400 Q480 600 960 600 Q1440 600 1440 800 Q1440 1000 1920 1000" fill="none" stroke={M3.primary} strokeWidth="2" opacity="0.08" strokeDasharray="20 10" />
          <circle cx="240" cy="200" r="60" fill={M3.primaryContainer} opacity="0.15" />
          <circle cx="720" cy="600" r="50" fill={M3.primary} opacity="0.1" />
          <circle cx="1200" cy="800" r="40" fill={M3.primaryContainer} opacity="0.12" />
          <rect x="1750" y="450" width="80" height="80" rx="12" fill={M3.outlineVariant} opacity="0.1" />
        </svg>
      );
    case "traction":
      return (
        <svg style={svgStyle} viewBox="0 0 1920 1080">
          <defs>
            <linearGradient id="tractionGrad" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={M3.primary} stopOpacity="0.15" />
              <stop offset="100%" stopColor={M3.primaryContainer} stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <rect x="200" y="700" width="120" height="280" rx="24" fill={M3.primaryContainer} opacity="0.2" />
          <rect x="400" y="550" width="120" height="430" rx="24" fill={M3.primary} opacity="0.12" />
          <rect x="600" y="400" width="120" height="580" rx="24" fill={M3.primaryContainer} opacity="0.18" />
          <rect x="800" y="300" width="120" height="680" rx="24" fill={M3.primary} opacity="0.1" />
          <rect x="1000" y="250" width="120" height="730" rx="24" fill={M3.primaryContainer} opacity="0.22" />
          <rect x="1200" y="350" width="120" height="630" rx="24" fill={M3.primary} opacity="0.08" />
          <path d="M0 1080 L0 600 Q480 400 960 500 L1920 400 L1920 1080 Z" fill="url(#tractionGrad)" opacity="0.6" />
          <circle cx="960" cy="350" r="80" fill="none" stroke={M3.primary} strokeWidth="2" opacity="0.08" />
        </svg>
      );
    case "ask":
      return (
        <svg style={svgStyle} viewBox="0 0 1920 1080">
          {defs}
          <path d="M960 0 Q1600 300 960 540 Q320 300 960 0z" fill={M3.primaryContainer} opacity="0.15" />
          <path d="M960 1080 Q320 780 960 540 Q1600 780 960 1080z" fill={M3.primary} opacity="0.06" />
          <circle cx="960" cy="540" r="200" fill="none" stroke={M3.primary} strokeWidth="1" opacity="0.08" />
          <circle cx="960" cy="540" r="120" fill="none" stroke={M3.primary} strokeWidth="1" opacity="0.05" />
        </svg>
      );
    default:
      return (
        <svg style={svgStyle} viewBox="0 0 1920 1080">
          {defs}
          <path d="M1920 0c-60 80-180 140-340 120-160-20-360-140-460-260-100-120-140-260-60-380 80-120 280-220 520-180 240 40 420 200 340 500H1920V0z" fill={`url(#blob1-${slideId})`} />
          <path d="M0 1080c100-80 200-240 160-420-40-180-200-340-360-400-160-60-320-40-420 60-100 100-140 320-40 500 100 180 360 260 660 260V1080H0z" fill={`url(#blob2-${slideId})`} />
        </svg>
      );
  }
}

export const SlideScene: React.FC<SlideSceneProps> = ({ slide }) => {
  return (
    <AbsoluteFill
      style={{
        background: M3.surface,
        padding: 80,
      }}
    >
      <SlideDecorations slideId={slide.id} />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 6,
          background: M3.primary,
          borderTopRightRadius: M3.radiusMedium,
          borderBottomRightRadius: M3.radiusMedium,
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
        }}
      >
        <h1
          style={{
            fontFamily,
            fontSize: M3.headlineLarge.fontSize,
            fontWeight: M3.headlineLarge.fontWeight,
            color: M3.onSurface,
            marginBottom: 48,
          }}
        >
          {slide.title}
        </h1>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          {slide.content?.map((item, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: M3.primary,
                  marginTop: 14,
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  fontFamily,
                  fontSize: M3.bodyLarge.fontSize,
                  color: M3.onSurfaceVariant,
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                {item}
              </p>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
