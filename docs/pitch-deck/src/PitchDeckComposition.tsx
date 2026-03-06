import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import {
  slides,
  TRANSITION_DURATION_FRAMES,
} from "./slides/slides";
import { SlideScene } from "./components/SlideScene";

export const PitchDeckComposition: React.FC = () => {
  return (
    <TransitionSeries>
      {slides.flatMap((slide, i) => {
        const elements: React.ReactNode[] = [
          <TransitionSeries.Sequence
            key={`seq-${slide.id}`}
            durationInFrames={slide.durationInFrames}
          >
            <SlideScene slide={slide} />
          </TransitionSeries.Sequence>,
        ];
        if (i < slides.length - 1) {
          elements.push(
            <TransitionSeries.Transition
              key={`trans-${slide.id}`}
              presentation={fade()}
              timing={linearTiming({
                durationInFrames: TRANSITION_DURATION_FRAMES,
              })}
            />
          );
        }
        return elements;
      })}
    </TransitionSeries>
  );
};
