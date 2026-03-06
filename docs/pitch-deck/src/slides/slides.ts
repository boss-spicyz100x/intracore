export type Slide = {
  id: string;
  title: string;
  content?: string[];
  durationInFrames: number;
};

export const TRANSITION_DURATION_FRAMES = 15;

const DURATION = 270;

export const slides: Slide[] = [
  {
    id: "title",
    title: "IntraCore Solutions",
    content: ["Voice Assistant for IT Support", "24/7 • Multilingual • Secure"],
    durationInFrames: DURATION,
  },
  {
    id: "problem",
    title: "The Problem",
    content: [
      "IT support volume is growing — agents are overwhelmed",
      "Long wait times and inconsistent tracking hurt productivity",
      "Distributed teams need 24/7 access in their language",
      "Manual intake creates bottlenecks and delays",
    ],
    durationInFrames: DURATION,
  },
  {
    id: "solution",
    title: "Our Solution",
    content: [
      "Voice-first AI that handles support tickets around the clock",
      "Employees call in, verify identity, describe the issue — done",
      "No app to install. No queue. Works in 4 languages.",
      "Reduces agent workload while improving employee experience",
    ],
    durationInFrames: DURATION,
  },
  {
    id: "how-it-works",
    title: "How It Works",
    content: [
      "Call or click to connect",
      "Verify identity (phone, email, employee ID)",
      "Describe your issue in your own words",
      "Get a ticket number — check status, update, or close anytime",
    ],
    durationInFrames: DURATION,
  },
  {
    id: "benefits",
    title: "Key Benefits",
    content: [
      "24/7 availability — no more waiting for business hours",
      "Multilingual — English, Thai, Japanese, German",
      "Secure verification before accessing sensitive data",
      "Consistent quality — every call, every language",
    ],
    durationInFrames: DURATION,
  },
  {
    id: "product",
    title: "Product",
    content: [
      "Voice agent for ticketing: create, check status, update, close",
      "Secure identity verification before any account access",
      "Visual companion for ticket history when needed",
      "FAQ handling for common questions",
    ],
    durationInFrames: DURATION,
  },
  {
    id: "flow",
    title: "Flow",
    content: [
      "1. Connect — WebRTC or dial-in",
      "2. Select language — English, Thai, Japanese, German",
      "3. Authenticate — GitHub OAuth",
      "4. Verify identity — phone, email, employee ID (xApp)",
      "5. Create ticket — describe issue, get ticket ID",
      "6. Manage — check status, update, close, history",
    ],
    durationInFrames: DURATION,
  },
  {
    id: "traction",
    title: "Traction",
    content: [
      "Built for Cognigy Capstone Sprint",
      "Production-ready voice assistant + API",
      "Live demo available",
      "github.com/boss-spicyz100x/intracore",
    ],
    durationInFrames: DURATION,
  },
  {
    id: "ask",
    title: "Let's Talk",
    content: [
      "Demo the voice assistant",
      "Explore partnership opportunities",
      "Discuss deployment for your organization",
    ],
    durationInFrames: DURATION,
  },
];

export function computeSlideBoundaries(slides: Slide[], transitionFrames: number): number[] {
  const boundaries: number[] = [0];
  let sum = 0;
  for (let n = 1; n <= slides.length; n++) {
    sum += slides[n - 1].durationInFrames;
    boundaries.push(sum - (n - 1) * transitionFrames);
  }
  return boundaries;
}

export function computeTotalDuration(slides: Slide[], transitionFrames: number): number {
  const totalDurations = slides.reduce((acc, s) => acc + s.durationInFrames, 0);
  return totalDurations - (slides.length - 1) * transitionFrames;
}
