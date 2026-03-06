import "./index.css";
import { Composition } from "remotion";
import { PitchDeckComposition } from "./PitchDeckComposition";
import {
  slides,
  TRANSITION_DURATION_FRAMES,
  computeTotalDuration,
} from "./slides/slides";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="PitchDeck"
        component={PitchDeckComposition}
        durationInFrames={computeTotalDuration(slides, TRANSITION_DURATION_FRAMES)}
        fps={60}
        width={1920}
        height={1080}
      />
    </>
  );
};
