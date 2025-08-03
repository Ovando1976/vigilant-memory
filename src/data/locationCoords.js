/* ------------------------------------------------------------------
   src/data/locationCoords.ts
   ------------------------------------------------------------------
   • Coordinates in WGS‑84 decimal degrees
   • Primary sources: OpenStreetMap (2024‑07‑29), VI‑GIS parcel viewer
   • “★” entries were manually snapped to a landmark / intersection.
   • All locations referenced in taxiRates.ts are present – no zeroes.
------------------------------------------------------------------- */

export const locationCoords = {
  /* ── St Thomas ─────────────────────────────────────────────── */
  Adelphi: { lat: 18.3561, lng: -64.9582 }, // ★
  Altona: { lat: 18.3393, lng: -64.9458 }, // ★
  "Anna’s Retreat": { lat: 18.3436, lng: -64.8816 }, // ★ (aka Tutu)
  Tutu: { lat: 18.3436, lng: -64.8816 },
  Barrett: { lat: 18.36, lng: -64.8925 },
  Bellevue: { lat: 18.3375, lng: -64.9055 },
  Benner: { lat: 18.3117, lng: -64.851 },
  Bolongo: { lat: 18.31057, lng: -64.90055 }, // ★ resort entry
  Bovoni: { lat: 18.3187, lng: -64.8887 }, // ★
  "Bonne Esperance": { lat: 18.3644, lng: -64.96855 }, // ★
  "Bonne Resolution": { lat: 18.3713, lng: -64.9355 }, // ★
  Bordeaux: { lat: 18.3581, lng: -64.9787 },
  Bournefield: { lat: 18.3375, lng: -64.9762 }, // ✈️ near airport taxi area
  "Botany Bay": { lat: 18.3608, lng: -65.0414 }, // ★
  "Caret Bay Estate": { lat: 18.3615, lng: -64.9851 }, // ★
  "Cassi Hill": { lat: 18.3433, lng: -64.9194 }, // ★
  "Charlotte Amalie": { lat: 18.3419, lng: -64.9339 }, // Fort Christian
  "Charlotte Amalie West": { lat: 18.3532, lng: -64.9734 },
  "Charlotte Amalie East": { lat: 18.3398, lng: -64.8996 },
  Contant: { lat: 18.3461, lng: -64.9506 }, // ★
  "Contant Development": { lat: 18.3445, lng: -64.9488 },
  "Contant Soto Town": { lat: 18.3453, lng: -64.9523 },
  "Cowell Battery": { lat: 18.3414, lng: -64.9369 }, // ★
  Donoe: { lat: 18.3476, lng: -64.8905 },
  Dorothea: { lat: 18.3617, lng: -64.9653 }, // Upper ★
  "Dorothea Upper": { lat: 18.3617, lng: -64.9653 },
  "Dorothea Lower": { lat: 18.3631, lng: -64.9617 },
  Enighed: { lat: 18.3289, lng: -64.7924 }, // STT lumber yard
  "Estate Thomas": { lat: 18.3415, lng: -64.9257 },
  "Estate Havensight": { lat: 18.3353, lng: -64.9243 },
  "Fort Christian": { lat: 18.3421, lng: -64.9307 }, // ★
  Frenchtown: { lat: 18.3405, lng: -64.9434 }, // ★
  Fredenhøj: { lat: 18.3364, lng: -64.8712 },
  "Frenchman’s Bay": { lat: 18.3213, lng: -64.9224 }, // ★
  Havensight: { lat: 18.3351, lng: -64.9265 }, // Cross‑road ★
  "Hawk Hill": { lat: 18.3536, lng: -64.9581 }, // ★
  "Hull Bay": { lat: 18.3677, lng: -64.9598 }, // ★
  Lovenlund: { lat: 18.3669, lng: -64.9184 }, // ★
  "Louisenhoj Castle": { lat: 18.3475, lng: -64.9201 }, // ★
  "Magens Bay": { lat: 18.3627, lng: -64.9394 }, // ★
  "Mahogany Run": { lat: 18.365, lng: -64.9074 },
  "Mandahl Bay": { lat: 18.3625, lng: -64.8957 },
  "Market Square East": { lat: 18.3453, lng: -64.9306 },
  "Mountain Top": { lat: 18.3592, lng: -64.973 }, // ★
  "Nadir Hill": { lat: 18.3378, lng: -64.8813 },
  Nazareth: { lat: 18.3161, lng: -64.8519 },
  Nisky: { lat: 18.342, lng: -64.9513 }, // ★
  "Paradise Point": { lat: 18.3358, lng: -64.9216 },
  Peterborg: { lat: 18.3758, lng: -64.9308 },
  "Raphune Hill": { lat: 18.3431, lng: -64.8949 }, // ★
  "Red Hook": { lat: 18.3183, lng: -64.8646 }, // ★
  Rosendahl: { lat: 18.3654, lng: -64.9229 },
  "Scott Free": { lat: 18.3532, lng: -64.9658 }, // ★
  "Smith Bay": { lat: 18.3494, lng: -64.8653 }, // ★
  "Solberg Lookout": { lat: 18.3551, lng: -64.9435 }, // ★
  "Solberg Upper": { lat: 18.3589, lng: -64.941 }, // ★
  Sorgenfri: { lat: 18.3528, lng: -64.9451 }, // ★
  "St. Peter Mountain": { lat: 18.3594, lng: -64.9511 }, // ★
  "Tabor / Harmony": { lat: 18.3587, lng: -64.8852 },
  "University of the Virgin Islands": { lat: 18.3362, lng: -64.9738 }, // ★
  "West Indian Dock": { lat: 18.3367, lng: -64.9476 }, // ★
  Wintberg: { lat: 18.3629, lng: -64.9104 },

  /* — Airport & pier aliases — */
  "Cyril E. King Airport": { lat: 18.33729, lng: -64.97333 },
  "Airport Terminal": { lat: 18.33729, lng: -64.97333 },
  "Crown Bay": { lat: 18.3367, lng: -64.9476 },

  /* ── St Croix ──────────────────────────────────────────────── */
  Christiansted: { lat: 17.7466, lng: -64.7052 },
  Frederiksted: { lat: 17.7111, lng: -64.8827 },
  "Grove Place": { lat: 17.7316, lng: -64.8254 },
  Kingshill: { lat: 17.722, lng: -64.8049 },
  "Sunny Isle": { lat: 17.7207, lng: -64.7783 },
  "La Reine": { lat: 17.7335, lng: -64.7883 },
  "Judith’s Fancy": { lat: 17.7762, lng: -64.7486 },
  "Salt River": { lat: 17.7833, lng: -64.7667 },
  "Estate Whim": { lat: 17.6994, lng: -64.8605 },
  "Estate Diamond": { lat: 17.7267, lng: -64.825 },

  /* ── St John ───────────────────────────────────────────────── */
  "Cruz Bay": { lat: 18.3319, lng: -64.7936 }, // ★
  "Coral Bay": { lat: 18.3343, lng: -64.7135 },
  Emmaus: { lat: 18.33, lng: -64.7172 },
  "Caneel Bay": { lat: 18.3426, lng: -64.7926 }, // ★
  "Bordeaux Mountain": { lat: 18.3385, lng: -64.7414 },
  "Maho Bay": { lat: 18.3547, lng: -64.7434 },
  "Fish Bay": { lat: 18.3172, lng: -64.7669 },
  "Chocolate Hole": { lat: 18.3178, lng: -64.7836 },
  "Enighed (St. John)": { lat: 18.3304, lng: -64.7961 }, // freight dock ★
  Bethany: { lat: 18.3331, lng: -64.7811 },
};
