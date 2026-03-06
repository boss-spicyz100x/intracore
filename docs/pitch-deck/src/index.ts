// Entry file for Remotion. Render: npx remotion render <entry-file> PitchDeck out/video.mp4

import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
