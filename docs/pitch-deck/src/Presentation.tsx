import { Player, type PlayerRef } from "@remotion/player";
import { useEffect, useRef, useState } from "react";
import { PitchDeckComposition } from "./PitchDeckComposition";
import {
  slides,
  TRANSITION_DURATION_FRAMES,
  computeSlideBoundaries,
  computeTotalDuration,
} from "./slides/slides";
import { M3 } from "./theme/m3-tokens";

const slideBoundaries = computeSlideBoundaries(
  slides,
  TRANSITION_DURATION_FRAMES
);

function findSlideIndexFromFrame(frame: number): number {
  let idx = 0;
  for (let i = 0; i < slideBoundaries.length; i++) {
    if (frame >= slideBoundaries[i]) {
      idx = i;
    } else {
      break;
    }
  }
  return idx;
}

export const Presentation: React.FC = () => {
  const playerRef = useRef<PlayerRef>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const onFrameUpdate = (e: { detail: { frame: number } }) => {
      const idx = findSlideIndexFromFrame(e.detail.frame);
      setCurrentSlideIndex(idx);
    };

    player.addEventListener("frameupdate", onFrameUpdate);
    return () => player.removeEventListener("frameupdate", onFrameUpdate);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentSlideIndex > 0) {
        playerRef.current?.seekTo(
          slideBoundaries[Math.max(0, currentSlideIndex - 1)]
        );
      } else if (
        e.key === "ArrowRight" &&
        currentSlideIndex < slides.length - 1
      ) {
        playerRef.current?.seekTo(
          slideBoundaries[Math.min(slides.length - 1, currentSlideIndex + 1)]
        );
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlideIndex]);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "min(1920px, 100vw)",
        aspectRatio: "16/9",
      }}
    >
      <Player
        ref={playerRef}
        component={PitchDeckComposition}
        durationInFrames={computeTotalDuration(slides, TRANSITION_DURATION_FRAMES)}
        fps={60}
        compositionWidth={1920}
        compositionHeight={1080}
        controls={false}
        style={{ width: "100%", height: "100%" }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 24,
          right: 24,
          padding: "12px 20px",
          background: "rgba(254, 247, 255, 0.92)",
          borderRadius: M3.radiusLarge,
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        }}
      >
        <span style={{ color: M3.onSurfaceVariant }}>
          Slide {currentSlideIndex + 1} / {slides.length}
        </span>
      </div>
    </div>
  );
};
