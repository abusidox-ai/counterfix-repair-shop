import { createFileRoute } from "@tanstack/react-router";
import { Game } from "@/game/Game";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Counterfix — The Repair Shop" },
      { name: "description", content: "Run a first-person repair counter: take jobs, unscrew devices at your repair desk, swap parts and spot stolen goods." },
      { property: "og:title", content: "Counterfix — The Repair Shop" },
      { property: "og:description", content: "A tactile first-person repair-shop sim. Ten customers, one repair desk, and a few stolen gadgets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Game,
});
