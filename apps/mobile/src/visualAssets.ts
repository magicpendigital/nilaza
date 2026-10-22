import { ImageSourcePropType } from "react-native";

import { Persona } from "./types";
import { canonicalTarotDeckId } from "./tarotDeckIdentity";

export type FeatureVisualId =
  | "open-reflection-welcome"
  | "open-reflection-home"
  | "oracle"
  | "ai-council"
  | "astrology-aries-v2"
  | "astrology-taurus-v2"
  | "astrology-gemini-v2"
  | "astrology-cancer-v2"
  | "astrology-leo-v2"
  | "astrology-virgo-v2"
  | "astrology-libra-v2"
  | "astrology-scorpio-v2"
  | "astrology-sagittarius-v2"
  | "astrology-capricorn-v2"
  | "astrology-aquarius-v2"
  | "astrology-pisces-v2"
  | "astrology-sanctuary"
  | "astrology-chart-story-stage"
  | "astrology-chart-story-parchment"
  | "astrology"
  | "daily-reflection"
  | "journal"
  | "face-reading"
  | "tarot";

export type DeckVisualRole = "cover" | "back";
export type PersonaVisualRole = "thumbnail" | "cover";

const featureVisuals: Record<FeatureVisualId, ImageSourcePropType> = {
  "open-reflection-welcome": require("../assets/runtime/features/open-reflection-welcome.jpg"),
  "open-reflection-home": require("../assets/runtime/features/open-reflection-home.jpg"),
  oracle: require("../assets/runtime/features/oracle.png"),
  "ai-council": require("../assets/runtime/features/ai-council.png"),
  "astrology-aries-v2": require("../assets/runtime/features/astrology-aries-v2.jpg"),
  "astrology-taurus-v2": require("../assets/runtime/features/astrology-taurus-v2.jpg"),
  "astrology-gemini-v2": require("../assets/runtime/features/astrology-gemini-v2.jpg"),
  "astrology-cancer-v2": require("../assets/runtime/features/astrology-cancer-v2.jpg"),
  "astrology-leo-v2": require("../assets/runtime/features/astrology-leo-v2.jpg"),
  "astrology-virgo-v2": require("../assets/runtime/features/astrology-virgo-v2.jpg"),
  "astrology-libra-v2": require("../assets/runtime/features/astrology-libra-v2.jpg"),
  "astrology-scorpio-v2": require("../assets/runtime/features/astrology-scorpio-v2.jpg"),
  "astrology-sagittarius-v2": require("../assets/runtime/features/astrology-sagittarius-v2.jpg"),
  "astrology-capricorn-v2": require("../assets/runtime/features/astrology-capricorn-v2.jpg"),
  "astrology-aquarius-v2": require("../assets/runtime/features/astrology-aquarius-v2.jpg"),
  "astrology-pisces-v2": require("../assets/runtime/features/astrology-pisces-v2.jpg"),
  "astrology-sanctuary": require("../assets/runtime/features/astrology-sanctuary.jpg"),
  "astrology-chart-story-stage": require("../assets/runtime/features/astrology-chart-story-stage.jpg"),
  "astrology-chart-story-parchment": require("../assets/runtime/features/astrology-chart-story-parchment.jpg"),
  astrology: require("../assets/runtime/features/astrology.png"),
  "daily-reflection": require("../assets/runtime/features/daily-reflection.png"),
  journal: require("../assets/runtime/features/journal.png"),
  "face-reading": require("../assets/runtime/features/face-reading.png"),
  tarot: require("../assets/runtime/features/tarot.png")
};

const deckVisuals: Record<string, Record<DeckVisualRole, ImageSourcePropType>> = {
  "moon-garden": {
    cover: require("../assets/runtime/tarot/deck-covers/moon-garden.jpg"),
    back: require("../assets/runtime/tarot/deck-backs/moon-garden.jpg")
  },
  "rose-mirror": {
    cover: require("../assets/runtime/tarot/deck-covers/rose-mirror.jpg"),
    back: require("../assets/runtime/tarot/deck-backs/rose-mirror.jpg")
  },
  "golden-thread": {
    cover: require("../assets/runtime/tarot/deck-covers/golden-thread.jpg"),
    back: require("../assets/runtime/tarot/deck-backs/golden-thread.jpg")
  },
  "astral-pop-atelier": {
    cover: require("../assets/runtime/tarot/deck-covers/astral-pop-atelier.jpg"),
    back: require("../assets/runtime/tarot/deck-backs/astral-pop-atelier.jpg")
  },
  "star-seeker": {
    cover: require("../assets/runtime/tarot/deck-covers/star-seeker.jpg"),
    back: require("../assets/runtime/tarot/deck-backs/star-seeker.jpg")
  },
  "stellar-mosaic": {
    cover: require("../assets/runtime/tarot/deck-covers/stellar-academy.jpg"),
    back: require("../assets/runtime/tarot/deck-backs/stellar-mosaic.jpg")
  },
  "classic-arcana": {
    cover: require("../assets/runtime/tarot/deck-covers/classic-arcana.jpg"),
    back: require("../assets/runtime/tarot/deck-backs/classic-arcana.jpg")
  },
  "celestial-reverie": {
    cover: require("../assets/runtime/tarot/deck-covers/celestial-reverie.jpg"),
    back: require("../assets/runtime/tarot/deck-backs/celestial-reverie.jpg")
  }
};

const personaFallback = require("../assets/runtime/personas/covers/aristotle-v2.jpg");

const personaVisuals: Record<string, Record<PersonaVisualRole, ImageSourcePropType>> = {
  aristotle: {
    thumbnail: require("../assets/runtime/personas/thumbnails/aristotle-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/aristotle-v2.jpg")
  },
  confucius: {
    thumbnail: require("../assets/runtime/personas/thumbnails/confucius-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/confucius-v2.jpg")
  },
  laozi: {
    thumbnail: require("../assets/runtime/personas/thumbnails/laozi-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/laozi-v2.jpg")
  },
  "marcus-aurelius": {
    thumbnail: require("../assets/runtime/personas/thumbnails/marcus-aurelius-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/marcus-aurelius-v2.jpg")
  },
  "sun-tzu": {
    thumbnail: require("../assets/runtime/personas/thumbnails/sun-tzu-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/sun-tzu-v2.jpg")
  },
  "communication-mentor": {
    thumbnail: require("../assets/runtime/personas/thumbnails/communication-mentor-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/communication-mentor-v2.jpg")
  },
  "calm-living-mentor": {
    thumbnail: require("../assets/runtime/personas/thumbnails/calm-living-mentor-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/calm-living-mentor-v2.jpg")
  },
  "strategic-thinker": {
    thumbnail: require("../assets/runtime/personas/thumbnails/strategic-thinker-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/strategic-thinker-v2.jpg")
  },
  "harmony-guide": {
    thumbnail: require("../assets/runtime/personas/thumbnails/harmony-guide-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/harmony-guide-v2.jpg")
  },
  "stoic-journal": {
    thumbnail: require("../assets/runtime/personas/thumbnails/stoic-journal-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/stoic-journal-v2.jpg")
  },
  "the-mystic": {
    thumbnail: require("../assets/runtime/personas/thumbnails/the-mystic-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/the-mystic-v2.jpg")
  },
  "the-astrologer": {
    thumbnail: require("../assets/runtime/personas/thumbnails/the-astrologer-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/the-astrologer-v2.jpg")
  },
  "inner-child-healer": {
    thumbnail: require("../assets/runtime/personas/thumbnails/inner-child-healer-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/inner-child-healer-v2.jpg")
  },
  "the-love-oracle": {
    thumbnail: require("../assets/runtime/personas/thumbnails/the-love-oracle-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/the-love-oracle-v2.jpg")
  },
  "the-shadow-mirror": {
    thumbnail: require("../assets/runtime/personas/thumbnails/the-shadow-mirror-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/the-shadow-mirror-v2.jpg")
  },
  "the-clear-strategist": {
    thumbnail: require("../assets/runtime/personas/thumbnails/the-clear-strategist-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/the-clear-strategist-v2.jpg")
  },
  "the-star-weaver": {
    thumbnail: require("../assets/runtime/personas/thumbnails/the-star-weaver-v2.jpg"),
    cover: require("../assets/runtime/personas/covers/the-star-weaver-v2.jpg")
  }
};

export function getFeatureVisual(id: FeatureVisualId) {
  return featureVisuals[id];
}

export function getDeckVisual(deckId: string, role: DeckVisualRole = "cover") {
  return deckVisuals[canonicalTarotDeckId(deckId)]?.[role] ?? deckVisuals["moon-garden"][role];
}

export function getPersonaVisual(persona: Persona, role: PersonaVisualRole = "thumbnail") {
  return personaVisuals[persona.slug]?.[role] ?? personaVisuals[persona.slug]?.thumbnail ?? personaFallback;
}
