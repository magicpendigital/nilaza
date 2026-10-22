import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const deckId = "classic-arcana";
const deckRoot = path.join(root, "assets", "tarot", deckId);
const cards = JSON.parse(fs.readFileSync(path.join(root, "packages/content/data/tarot-cards.json"), "utf8"));

const majorScenes = {
  "major-00-fool": "A young traveler pauses at an old stone crossroads, with a small cloth bundle, walking staff and pale companion dog; an open sunlit road leads toward distant hills.",
  "major-01-magician": "An artisan stands at a worktable where a cup, blade, flowering staff and coin become tools for one clear intention; a simple gesture catches a shaft of light in a workshop garden.",
  "major-02-high-priestess": "A calm adult keeper of inner knowing sits at a small stone sanctuary threshold, holding a closed book; a crescent moon hangs over a dark reflecting pool and a pomegranate-patterned curtain.",
  "major-03-empress": "A gracious adult rests in a flourishing orchard among wheat, roses and flowing water, with a small crown of stars and a basket of fruit; abundant but peaceful, never lavish.",
  "major-04-emperor": "A mature ruler sits upright on a simple stone seat above a terraced town, holding a short staff beside a square stone table; sturdy architecture and ram-carved details suggest responsibility.",
  "major-05-hierophant": "A patient teacher in an old cloister shares a lesson with two adult apprentices; an open book, two keys and a column of morning light suggest inherited wisdom and chosen values.",
  "major-06-lovers": "Two adults meet at a garden crossroads, each carrying a small lantern; they face one another with space between them while two paths join beneath flowering branches, expressing connection and choice.",
  "major-07-chariot": "A focused driver guides a compact ceremonial cart through a city gate, drawn by two horses of contrasting colors moving in balance; banners stream forward into open country.",
  "major-08-strength": "A calm adult rests one hand gently on a lion's mane in a quiet garden; the lion is peaceful, and the figure's relaxed posture shows courage through compassion and restraint.",
  "major-09-hermit": "An elder wayfarer pauses on a high ridge at dusk, holding a hooded lantern that reveals a few steps of the mountain path; the distant valley remains quiet and spacious.",
  "major-10-wheel": "A large wooden wheel turns in a village square as leaves, seedpods and small birds mark the seasons around it; a person watches from a doorway, noticing change and opportunity.",
  "major-11-justice": "A composed magistrate stands in an open stone hall with an upright sword and balanced scales; two equal bowls and a clear window express fairness, truth and accountability.",
  "major-12-hanged-man": "A thoughtful traveler sits safely beside a garden pool, studying a reflection that the ripples turn upside down; a leaf floats against gravity in the still image, suggesting a pause and a new perspective.",
  "major-13-death": "An old ceremonial mask and fallen leaves lie beside an open garden gate where a new green shoot emerges; a cloaked traveler walks onward into pale morning, suggesting an ending that makes room for renewal.",
  "major-14-temperance": "A serene traveler pours water between two simple vessels beside a stream, blending warm and cool reflections; one foot rests on the bank and one near the water, showing measured care.",
  "major-15-devil": "Two adults notice loose rings and untied cords lying on a table before a theatrical carved shadow; a small key rests within reach, showing attachment as visible and changeable, without a monster.",
  "major-16-tower": "A weathered stone watchtower shows one clean crack through its upper wall as a red storm bolt lights the clouds; a steady lamp remains below and a clear path leads away from the old structure.",
  "major-17-star": "A water bearer kneels beside a still pool beneath one bright guiding star and a scatter of smaller stars; water feeds a garden bed and the horizon begins to lighten.",
  "major-18-moon": "A winding path crosses a moonlit marsh between two distant cypress silhouettes; a dog and a wolf watch from opposite banks while ripples soften the moon's reflection, holding uncertainty without menace.",
  "major-19-sun": "A young person walks through a bright walled garden of sunflowers beneath a generous sun disc; open shutters and clear morning shadows make the scene warm, lively and uncluttered.",
  "major-20-judgement": "At dawn, a clear bell rings from a small town tower as people open doors and windows to the light; birds rise above the rooftops, suggesting an awakening and a freely chosen next step.",
  "major-21-world": "A traveler stands within a circular stone garden arch after completing a long path; four small seasonal emblems mark the corners and a calm landscape opens beyond, suggesting integration and wholeness."
};

const suitScenes = {
  wands: {
    ace: "A single budding staff is offered above a garden gate by a sunlit hand; one bright leaf marks the first spark of initiative.",
    two: "A traveler studies a folded map from a high garden wall, with two staffs resting beside a small globe and a view of two possible roads.",
    three: "A figure on a coastal ridge watches three small ships sail toward the horizon, three staffs planted nearby as the view opens outward.",
    four: "Four flowering staffs support a simple garland at a village courtyard entrance where neighbors gather for a modest celebration.",
    five: "Five young adults practice with long staffs in an open field, crossing and uncrossing them like a lively lesson rather than a fight.",
    six: "A rider returns through a town gate carrying a laurel-tipped staff while neighbors acknowledge the effort with warm, measured celebration.",
    seven: "A watchful traveler stands on a low rise holding one staff as six staffs approach from the path below; the posture is steady, not aggressive.",
    eight: "Eight slender staffs sweep across a wide clear sky over a river valley, their parallel movement suggesting swift progress and momentum.",
    nine: "A resilient traveler pauses beside a fence of nine upright staffs, alert but composed, with an open gate visible nearby.",
    ten: "A person carries a bundle of ten staffs toward a welcoming house, visibly working hard but still choosing where to set the load down.",
    page: "A curious young adult studies a short flowering staff in a hillside garden, looking toward new growth with creative energy.",
    knight: "A bold rider crosses a sunlit plain with one staff held high, cloak moving in the wind; the horse is energetic but under control.",
    queen: "A confident adult sits in a sunny garden with a sunflower and a flowering staff, offering warm attention without losing self-possession.",
    king: "A visionary steward stands on a garden terrace beside a carved chair and a living staff, looking toward a town he is responsible for guiding."
  },
  cups: {
    ace: "One overflowing cup rests above a clear spring, with water returning to a small garden; a single white blossom signals an open heart.",
    two: "Two adults exchange simple cups beneath a vine-covered arch, their hands meeting at equal height in a quiet sign of mutuality.",
    three: "Three adult companions share a gentle harvest-table moment in a walled garden, each offering a cup above fruit and a leafy garland; their gestures are warm and equal.",
    four: "A thoughtful person sits beside a garden pond while three cups rest on a stone ledge and a companion quietly offers a fourth, inviting attention without pressure.",
    five: "Two cups have spilled near a rain-darkened path while three remain upright; a grieving traveler notices a small bridge and the light beyond the garden wall.",
    six: "Two adults meet again in an old courtyard and exchange a flower-filled cup, with familiar windows and soft afternoon light evoking memory and repair.",
    seven: "A dreamer pauses in a small gallery before seven distinct vessels, each holding a different symbolic object; the room is wondrous but grounded, a study of choices.",
    eight: "A walker leaves eight cups arranged on a terrace and follows a lantern-lit path toward distant hills beneath a quiet moon.",
    nine: "A gracious host rests at a long table with nine cups arranged behind, content in a simple room after sharing a satisfying meal.",
    ten: "A family and chosen friends stand together in a garden beneath an arch of ten cups, with a stream and rooftops beyond, expressing belonging.",
    page: "A curious young adult studies one decorated cup near a tide pool where a tiny fish rises from the water, suggesting an unexpected emotional message.",
    knight: "A courteous rider carries one cup along a calm stream, horse walking steadily through a meadow; the scene suggests an invitation with room for consent.",
    queen: "A compassionate adult sits near the shore, holding a lidded cup like a small keepsake and listening to the changing water.",
    king: "A mature, even-tempered steward sits in a small boat on balanced waves, holding one cup while keeping a calm eye on the distant harbor."
  },
  swords: {
    ace: "One clear sword rises from a stone beside a laurel branch as morning light parts the clouds, a simple image of truth and a new idea.",
    two: "A seated figure considers two sheathed swords laid across a low table by the sea; an open window offers a wider view when they are ready to choose.",
    three: "Three narrow swords stand beside rain-streaked glass and a torn letter, with no body or heart depicted; a small clear patch of sky offers room to heal.",
    four: "A weary scholar rests quietly on a stone bench in a chapel, one sword laid safely on the floor and three hung high on the wall.",
    five: "One traveler lowers a sword while two companions walk away after a costly argument; the open ground between them holds the cost of winning.",
    six: "A small boat carries a family and six sheathed swords across a broad river toward calmer banks and pale morning light.",
    seven: "A careful traveler carries seven sheathed swords across an empty camp at dawn, glancing back toward the route they chose; strategy without threat.",
    eight: "A person discovers a clear walking path through eight upright swords; the loose ribbon at their side has already fallen away.",
    nine: "A night watcher sits beneath nine swords hung neatly on a wall, one candle and an open window grounding a difficult but passing night.",
    ten: "Ten swords rest point-down in the earth as a storm clears over a quiet field; the dark horizon gives way to a narrow band of morning.",
    page: "A watchful young adult stands on a hill with one light sword pointed toward the ground, cloak lifted by the breeze and eyes on the distant road.",
    knight: "A swift rider crosses a plain with a sword held safely upward and away from others, banners streaming as clouds open ahead.",
    queen: "A clear-minded adult sits in an open stone court with a sword resting upright beside the chair and one hand open in welcome to honest words.",
    king: "A measured magistrate studies a book at a plain desk while a sheathed sword rests nearby, joining discernment with responsibility."
  },
  pentacles: {
    ace: "One golden coin rests in an open hand above a fertile garden gate, with seedlings and a well-kept path suggesting a practical beginning.",
    two: "A nimble craftsperson balances two coins on a woven ribbon beside a harbor, keeping work and rest in gentle motion.",
    three: "Three craftspeople build a stone arch together; three coins are set into the design as each person's skill supports the shared work.",
    four: "A householder holds four coins close inside a sturdy home, with an open door nearby suggesting security that can still allow connection.",
    five: "Two travelers cross a snowy lane past a warmly lit window with five coins carved into its sill; they stay side by side and keep moving toward shelter.",
    six: "Two pairs of hands exchange six coins over a balanced table, with equal light falling on giver and receiver.",
    seven: "A gardener studies seven coin-shaped fruits on a vine, taking a patient pause before tending the next row.",
    eight: "An artisan carefully engraves eight coins at a workbench, tools aligned and finished pieces hung neatly along the wall.",
    nine: "An independent gardener walks through a mature orchard with nine coins among the branches, enjoying the results of steady care.",
    ten: "Several generations gather beneath a stone courtyard arch set with ten coins, sharing a well-tended home and a living family craft.",
    page: "An eager apprentice turns one coin beside a tray of seedlings, learning how small, practical choices can grow into a craft.",
    knight: "A steady rider follows a farm track with one coin secured in a gloved hand, moving at the pace of a reliable horse.",
    queen: "A practical, caring adult tends an orchard bench with one coin in hand, surrounded by useful tools, ripe fruit and calm domestic warmth.",
    king: "A responsible steward surveys a harvest and vineyard from a stone terrace, holding one coin as a sign of long-term care rather than wealth display."
  }
};

const sharedStyle = [
  "Use case: stylized-concept.",
  "Asset type: original inner tarot-card illustration only, to be composited into a fixed Nilaza card template.",
  "Style: antique European hand-colored woodcut and early lithographic book illustration, expressive charcoal ink contours, flat patterned color areas, subtle aged-paper grain and slight imperfect print registration. Use a restrained palette of warm ivory, charcoal, dusty ultramarine, faded vermilion, aged ochre and muted sage. Historically evocative yet polished, mature, calm and immediately legible on a mobile screen.",
  "Composition: portrait 2:3 image; one distinct central subject or symbolic scene, simple readable silhouette, key symbols kept in a generous central safe area. Keep meaningful objects count-correct for the card.",
  "Originality: draw on broad historical tarot archetypes but invent a fresh scene and staging for every card. Do not copy a specific published deck's pose, composition, costume, or arrangement of symbols.",
  "Do not include a card frame, border, card title, number, lettering, watermark, modern object, photorealism, neon, horror, gore, threatening occult spectacle, fixed prophecy, sexualization, or childish cartoon styling."
].join("\n");

function sceneFor(card) {
  if (majorScenes[card.id]) return majorScenes[card.id];
  const suit = card.suit?.toLowerCase();
  const rank = card.rank?.toLowerCase();
  const scene = suitScenes[suit]?.[rank];
  if (!scene) throw new Error("Missing scene prompt for " + card.id + " (" + suit + "/" + rank + ")");
  return scene;
}

const manifestCards = cards.map((card) => {
  const scene = sceneFor(card);
  const prompt = [
    sharedStyle,
    "Card: " + card.name.en + ".",
    "Meaning cues: " + card.keywords.en.join(", ") + ".",
    "Card-specific scene: " + scene,
    "No text is to be drawn inside the illustration."
  ].join("\n\n");
  return {
    cardId: card.id,
    name: card.name,
    arcana: card.arcana,
    suit: card.suit,
    rank: card.rank,
    keywords: card.keywords,
    scene,
    artworkPath: "assets/tarot/" + deckId + "/artwork/" + card.id + ".png",
    cardPath: "assets/tarot/" + deckId + "/cards/" + card.id + ".png",
    prompt
  };
});

if (manifestCards.length !== 78 || new Set(manifestCards.map((card) => card.cardId)).size !== 78) {
  throw new Error("Expected 78 unique canonical tarot cards; found " + manifestCards.length);
}

const cardSpec = {
  deckId,
  version: "2026-09-24-classic-style-v1",
  cardSize: { width: 1024, height: 1768 },
  safeArea: { x: 96, y: 128, width: 832, height: 1512 },
  artworkArea: { x: 184, y: 220, width: 656, height: 1130 },
  titleArea: { x: 130, y: 1382, width: 764, height: 104 },
  keywordArea: { x: 150, y: 1488, width: 724, height: 52 },
  colors: {
    background: "#2A2823",
    panel: "#343128",
    ink: "#2A2723",
    ivory: "#F3E9D4",
    gold: "#C9A45C",
    goldDim: "#8A744D",
    moon: "#B5AD9C",
    teal: "#526361"
  },
  style: {
    cornerRadius: 54,
    innerRadius: 26,
    borderWidth: 6,
    artworkCornerRadius: 28,
    textureOpacity: 18,
    foilLineWidth: 3,
    artworkFit: "contain",
    artworkRatioTolerance: 0.08
  },
  output: {
    artworkDir: "assets/tarot/" + deckId + "/artwork",
    cardDir: "assets/tarot/" + deckId + "/cards",
    contactSheetDir: "assets/tarot/" + deckId + "/contact-sheets"
  }
};

fs.mkdirSync(path.join(deckRoot, "artwork"), { recursive: true });
fs.mkdirSync(path.join(deckRoot, "cards"), { recursive: true });
fs.mkdirSync(path.join(deckRoot, "contact-sheets"), { recursive: true });
fs.writeFileSync(path.join(deckRoot, "card-spec.json"), JSON.stringify(cardSpec, null, 2) + "\n", "utf8");
fs.writeFileSync(path.join(deckRoot, deckId + "-full-deck-manifest.json"), JSON.stringify({
  deckId,
  version: "2026-09-24-classic-style-v1",
  status: "full_deck_artwork_in_production",
  includeExisting: true,
  cardCount: manifestCards.length,
  style: {
    vi: "Minh họa Tarot cổ điển kiểu khắc/in màu thủ công châu Âu, nét mực rõ, giấy ngà cũ, màu chàm bụi, đỏ đất, vàng đất và xanh sage; hình tượng nguyên bản, dễ đọc trên màn hình nhỏ.",
    en: "Classic European hand-colored woodcut and early lithograph Tarot, clear ink contours, warm aged ivory paper, dusty blue, faded red, ochre and sage; original archetypal scenes, legible at mobile size."
  },
  visualPromptTemplate: sharedStyle,
  cards: manifestCards
}, null, 2) + "\n", "utf8");

console.log("Deck manifest and card spec written for " + manifestCards.length + " cards.");
