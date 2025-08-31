// src/data/siteData.ts
// ----------------------------------------------------------------------------------
// Centralised dataset describing historic and popular sites across the U.S. Virgin Islands.
// Extend this file as you add new places – the SiteInfo schema is intentionally flexible.
// ----------------------------------------------------------------------------------

// --------------------------------- Types -----------------------------------------
/**
 * @typedef {Object} VisitorInfo
 * @property {string=} hours
 * @property {string=} entryFee
 * @property {string=} parking
 */

/**
 * @typedef {Object} SiteInfo
 * @property {string} name
 * @property {string} era
 * @property {string} description
 * @property {string[]=} photos
 * @property {string[]=} ai_recreations
 * @property {VisitorInfo=} visitor
 * @property {{center: [number, number], zoom: number}=} mapFocus
 */

// --------------------------------- Data ------------------------------------------
// NOTE: use **snake‑case** keys only. These become the canonical route / slug IDs
// used throughout the UI (see <SiteDetail/> etc.).
/** @type {Record<string, SiteInfo>} */
export const siteData = {
  fort_christian: {
    name: "Fort Christian",
    era: "Danish Colonial (1672-1900s)",
    description:
      "Oldest standing structure in the USVI. Built 1672 by the Danish West India Company as a fort, prison and governor's residence.",
    photos: ["/photos/fort_christian_1900.jpg"],
    ai_recreations: ["/ai/fort_christian_1675.png"],
    visitor: {
      hours: "Mon-Sat 9 am - 4 pm",
      entryFee: "$10 adults / $5 children",
      parking: "Metered street parking along Hospital St.",
    },
    mapFocus: { center: [18.3419, -64.9339], zoom: 18 },
  },
  market_square: {
    name: "Market Square (Pladsen)",
    era: "18th-19th-century trading plaza",
    description:
      "Primary town market for produce, livestock and enslaved people until 1848; today hosts farmers' stalls and cultural events.",
    photos: ["/photos/market_square_1885.jpg"],
    ai_recreations: ["/ai/market_square_1820.png"],
    visitor: {
      hours: "Open plaza - 24 hrs",
      entryFee: "Free",
      parking: "Public lot on Strand Gade",
    },
    mapFocus: { center: [18.342, -64.933], zoom: 19 },
  },
  slave_quarters: {
    name: "Slave Quarters",
    era: "18th-19th c.",
    description:
      "Dense residential blocks that housed enslaved Africans behind merchant estates. Partial stone foundations remain visible.",
    photos: [],
    ai_recreations: ["/ai/slave_quarters_1800.png"],
    visitor: {
      hours: "Outdoor ruins - always accessible",
      entryFee: "Free",
      parking: "Street",
    },
    mapFocus: { center: [18.3412, -64.933], zoom: 20 },
  },
  custom_house: {
    name: "Danish Custom House",
    era: "Late-1700s - early-1900s",
    description:
      "Neo-classical yellow-brick building where cargo duties were collected and shipping papers issued.",
    photos: ["/photos/custom_house_1910.jpg"],
    ai_recreations: ["/ai/custom_house_1790.png"],
    visitor: {
      hours: "Exterior view only",
      entryFee: "Free",
      parking: "King-s Wharf lot",
    },
    mapFocus: { center: [18.3421, -64.9335], zoom: 19 },
  },
  kings_quarter: {
    name: "King-s Quarter",
    era: "18th-century planned district",
    description:
      "One of three original residential quarters, home to colonial officials and merchants.",
    photos: [],
    ai_recreations: ["/ai/kings_quarter_1780.png"],
    visitor: {},
    mapFocus: { center: [18.348, -64.933], zoom: 16 },
  },
  queens_quarter: {
    name: "Queen-s Quarter",
    era: "18th-19th c.",
    description:
      "Mixed residential-commercial zone west of Fort Christian, severely damaged by the 1826 and 1832 fires.",
    photos: [],
    ai_recreations: ["/ai/queens_quarter_1831.png"],
    visitor: {},
    mapFocus: { center: [18.3445, -64.936], zoom: 16 },
  },
  crown_prince_quarter: {
    name: "Crown Prince's Quarter",
    era: "Early-1800s hillside suburb",
    description: "Developed for free people of color, artisans and tradesmen.",
    photos: [],
    ai_recreations: ["/ai/crown_prince_quarter_1850.png"],
    visitor: {},
    mapFocus: { center: [18.346, -64.9385], zoom: 16 },
  },
  reformed_church: {
    name: "Reformed Dutch Church",
    era: "Founded 1740s",
    description:
      "Early Protestant congregation serving mixed white, free and enslaved parishioners.",
    photos: ["/photos/reformed_church_1890.jpg"],
    ai_recreations: ["/ai/reformed_church_1750.png"],
    visitor: {
      hours: "Sun-Fri 10 am - 3 pm",
      entryFee: "Donation",
    },
    mapFocus: { center: [18.3424, -64.9329], zoom: 19 },
  },
  military_barracks: {
    name: "Military Barracks",
    era: "18th–19th c.",
    description:
      "Garrison housing Danish troops; strategic during uprisings and naval visits.",
    photos: [],
    ai_recreations: ["/ai/military_barracks_1810.png"],
    visitor: {},
    mapFocus: { center: [18.342, -64.9342], zoom: 18 },
  },
  emancipation_garden: {
    name: "Emancipation Garden",
    era: "Post‑1848 public square",
    description:
      "Commemorates the 1848 abolition of slavery; venue for annual July 3rd celebrations.",
    photos: ["/photos/emancipation_garden_1938.jpg"],
    ai_recreations: ["/ai/emancipation_garden_1850.png"],
    visitor: {
      hours: "Open 24 hrs",
      entryFee: "Free",
    },
    mapFocus: { center: [18.3423, -64.9332], zoom: 19 },
  },
  lutheran_church: {
    name: "Frederick Lutheran Church",
    era: "Consecrated 1793",
    description:
      "Oldest Lutheran church in the Western Hemisphere; baroque tower added 1826.",
    photos: ["/photos/lutheran_church_1905.jpg"],
    ai_recreations: ["/ai/lutheran_church_1795.png"],
    visitor: {
      hours: "Tue–Sat 9 am – 2 pm",
      entryFee: "Donation",
    },
    mapFocus: { center: [18.3426, -64.9325], zoom: 19 },
  },
  bluebeards_castle: {
    name: "Bluebeard’s Castle (Tower)",
    era: "17th‑century watchtower",
    description:
      "Stone tower on Hassel Island ridge, tied to pirate folklore; now a hotel landmark.",
    photos: ["/photos/bluebeards_castle_1920.jpg"],
    ai_recreations: ["/ai/bluebeards_castle_1700.png"],
    visitor: {
      hours: "Hotel grounds – guest access",
      entryFee: "Lobby pass",
    },
    mapFocus: { center: [18.3375, -64.921], zoom: 17 },
  },
  blackbeards_castle: {
    name: "Blackbeard’s Castle",
    era: "1679 Skytsborg",
    description:
      "Watchtower once called Skytsborg; later associated with Edward Teach (Blackbeard). Offers panoramic views.",
    photos: ["/photos/blackbeards_castle_1912.jpg"],
    ai_recreations: ["/ai/blackbeards_castle_1680.png"],
    visitor: {
      hours: "Daily tours 10 am – 3 pm",
      entryFee: "$15 guided",
    },
    mapFocus: { center: [18.341, -64.93], zoom: 18 },
  },

  /* ---------------------- Popular attractions – St. Thomas ---------------------- */
  magens_bay: {
    name: "Magens Bay Beach",
    era: "Natural beach",
    description:
      "One‑mile crescent of white sand ranked among the world’s most beautiful beaches; calm, swimmable water and full facilities.",
    photos: ["/photos/magens_bay_modern.jpg"],
    visitor: {
      hours: "Daily 8 am – 5 pm",
      entryFee: "$5 adult / $2 child / $2 vehicle",
      parking: "On‑site lot included with vehicle fee",
    },
    mapFocus: { center: [18.3631, -64.9307], zoom: 15 },
  },
  coral_world: {
    name: "Coral World Ocean Park",
    era: "Marine attraction",
    description:
      "Aquarium, sea‑lion encounters and underwater observatory tower showcasing Caribbean marine life at Coki Point.",
    photos: ["/photos/coral_world_modern.jpg"],
    visitor: {
      hours: "Daily 9 am – 4 pm",
      entryFee: "$24 adults / $13 children",
      parking: "Free lot",
    },
    mapFocus: { center: [18.3443, -64.8667], zoom: 17 },
  },
  paradise_point: {
    name: "Paradise Point Skyride",
    era: "Modern tramway (1994)",
    description:
      "Cable car rising 700 ft above Charlotte Amalie harbor for panoramic views, cocktails and shopping at the summit.",
    photos: ["/photos/paradise_point_tram.jpg"],
    visitor: {
      hours: "Tues‑Fri 9 am – 5 pm (ship days vary)",
      entryFee: "$24 round‑trip",
      parking: "Paid garage at base station",
    },
    mapFocus: { center: [18.3368, -64.9274], zoom: 17 },
  },
  mountain_top: {
    name: "Mountain Top",
    era: "Scenic overlook",
    description:
      "Highest accessible point on St. Thomas (1,547 ft) famous for banana daiquiris and a view over Magens Bay and 20+ islands.",
    photos: ["/photos/mountain_top_view.jpg"],
    visitor: {
      hours: "Daily 9 am – 5 pm",
      entryFee: "Free observation deck",
      parking: "Large free lot",
    },
    mapFocus: { center: [18.3557, -64.9408], zoom: 16 },
  },

  /* ---------------------- St. John highlights ----------------------------------- */
  trunk_bay: {
    name: "Trunk Bay, Virgin Islands National Park",
    era: "Natural beach & reef",
    description:
      "Iconic white‑sand beach with an underwater snorkel trail and vibrant coral reef, part of one of America’s most protected parks.",
    photos: ["/photos/trunk_bay_modern.jpg"],
    visitor: {
      hours: "Daily 8 am – 4 pm",
      entryFee: "$5 adults / under‑16 free",
      parking: "Small paid lot – arrive early",
    },
    mapFocus: { center: [18.3549, -64.7966], zoom: 15 },
  },
  annaberg_plantation: {
    name: "Annaberg Sugar Plantation Ruins",
    era: "Danish Colonial (1720s)",
    description:
      "Well‑preserved windmill, factory and slave village ruins interpreting St. John’s sugar and enslavement history within VINP.",
    photos: ["/photos/annaberg_ruins.jpg"],
    visitor: {
      hours: "Sunrise‑sunset",
      entryFee: "Free (park admission)",
      parking: "Trail‑side pull‑offs",
    },
    mapFocus: { center: [18.3602, -64.7256], zoom: 17 },
  },

  /* ---------------------- St. Croix favorites ----------------------------------- */
  buck_island: {
    name: "Buck Island Reef National Monument",
    era: "Marine protected area (1961)",
    description:
      "Uninhabited island off St. Croix with pristine coral reef, underwater trail and Turtle Beach—accessible only by permitted boat tours.",
    photos: ["/photos/buck_island_snorkel.jpg"],
    visitor: {
      hours: "Guided tours depart daily",
      entryFee: "Included in tour cost",
      parking: "Tour operator lots at Christiansted marina",
    },
    mapFocus: { center: [17.789, -64.6139], zoom: 13 },
  },
  sandy_point: {
    name: "Sandy Point National Wildlife Refuge",
    era: "Sea-turtle nesting habitat",
    description:
      "Two-mile undeveloped beach on St. Croix's west end; leatherback turtles nest April-Aug. Limited weekend access.",
    photos: ["/photos/sandy_point_beach.jpg"],
    visitor: {
      hours: "Sat-Sun 10 am - 4 pm (Nov-Mar); closed Apr-Aug turtle season",
      entryFee: "Free",
      parking: "Gravel lot at refuge gate",
    },
    mapFocus: { center: [17.6818, -64.8802], zoom: 14 },
  },
};

// --------------------------------- Exports ---------------------------------------
/**
 * Convenience alias for valid site keys – import wherever you need strong typing.
 */
// SiteId type alias removed for JS compatibility

export default siteData;
