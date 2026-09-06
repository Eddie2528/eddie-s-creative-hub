// The starting point for the works section: every piece, grouped by the
// campaign it belongs to. Rows in site_works override all of this — title,
// order, whether it shows at all — so this list is only what the site falls
// back to before anyone has edited anything.

export type WorkKind = "image" | "video";

export type CatalogueEntry = {
  id: string;
  campaign: string;
  title: string;
  category: string;
  kind: WorkKind;
  // A filename in the bucket, or "bundled:<key>" for artwork that ships with
  // the build and has never been uploaded.
  asset: string;
  poster?: string;
};

export const WORKS_CATALOGUE: CatalogueEntry[] = [
  // The Mall M7 M8
  { id: "the-mall-thematic", campaign: "The Mall M7 M8", title: "Thematic key visual", category: "Branding", kind: "image", asset: "bundled:the-mall-thematic" },
  { id: "the-mall-food", campaign: "The Mall M7 M8", title: "Food zone", category: "Retail", kind: "image", asset: "bundled:the-mall-food" },
  { id: "the-mall-pet", campaign: "The Mall M7 M8", title: "Pet zone", category: "Retail", kind: "image", asset: "bundled:the-mall-pet" },
  { id: "the-mall-shopping", campaign: "The Mall M7 M8", title: "Shopping zone", category: "Retail", kind: "image", asset: "bundled:the-mall-shopping" },
  { id: "the-mall-harbourland", campaign: "The Mall M7 M8", title: "Harbourland zone", category: "Retail", kind: "image", asset: "bundled:the-mall-harbourland" },

  // EM District
  { id: "em-district-kv", campaign: "EM District", title: "Thematic key visual", category: "Branding", kind: "image", asset: "bundled:em-district-kv" },
  { id: "em-district-thematic", campaign: "EM District", title: "Thematic film", category: "Film", kind: "video", asset: "em-district-thematic.mp4", poster: "em-district-thematic.jpg" },
  { id: "em-district-facade", campaign: "EM District", title: "3D facade projection", category: "Experiential", kind: "video", asset: "em-district-facade.mp4", poster: "em-district-facade.jpg" },
  { id: "em-district-countdown", campaign: "EM District", title: "Countdown", category: "Social", kind: "video", asset: "em-district-countdown.mp4", poster: "em-district-countdown.jpg" },

  // OK Thin
  { id: "ok-thin-kv", campaign: "OK Thin", title: "Biscuit key visual", category: "Advertising", kind: "image", asset: "bundled:ok-thin-kv" },
  { id: "ok-thin-bus", campaign: "OK Thin", title: "Bus campaign", category: "Out-of-home", kind: "image", asset: "bundled:ok-thin-bus" },
  { id: "ok-thin-biscuit", campaign: "OK Thin", title: "Biscuit film", category: "Film", kind: "video", asset: "ok-thin-biscuit.mp4", poster: "ok-thin-biscuit.jpg" },

  // Moong Pattana
  { id: "moong-pattana-book", campaign: "Moong Pattana", title: "The Book for All Moms", category: "Campaign", kind: "image", asset: "bundled:moong-pattana-book" },
  { id: "moong-pattana-book-for-moms", campaign: "Moong Pattana", title: "The Book for All Moms", category: "Film", kind: "video", asset: "moong-pattana-book-for-moms.mp4", poster: "moong-pattana-book-for-moms.jpg" },
  { id: "moong-pattana-calendar-download", campaign: "Moong Pattana", title: "Happy Calendar", category: "Social", kind: "video", asset: "moong-pattana-calendar-download.mp4", poster: "moong-pattana-calendar-download.jpg" },
  { id: "moong-pattana-calendar-bkkdw", campaign: "Moong Pattana", title: "Happy Calendar — BKKDW", category: "Social", kind: "video", asset: "moong-pattana-calendar-bkkdw.mp4", poster: "moong-pattana-calendar-bkkdw.jpg" },

  // Krungthai
  { id: "krungthai-man-suang", campaign: "Krungthai", title: "Man Suang", category: "Film", kind: "video", asset: "krungthai-man-suang.mp4", poster: "krungthai-man-suang.jpg" },
  { id: "krungthai-missing-dad", campaign: "Krungthai", title: "Missing Dad", category: "Film", kind: "video", asset: "krungthai-missing-dad.mp4", poster: "krungthai-missing-dad.jpg" },
  { id: "krungthai-khok-khrai", campaign: "Krungthai", title: "Khok Khrai", category: "Film", kind: "video", asset: "krungthai-khok-khrai.mp4", poster: "krungthai-khok-khrai.jpg" },
  { id: "krungthai-live-smart", campaign: "Krungthai", title: "Live Smart", category: "Film", kind: "video", asset: "krungthai-live-smart.mp4", poster: "krungthai-live-smart.jpg" },
  { id: "krungthai-home-plus", campaign: "Krungthai", title: "Home Plus debit card", category: "Advertising", kind: "video", asset: "krungthai-home-plus.mp4", poster: "krungthai-home-plus.jpg" },
  { id: "krungthai-hisati-shop", campaign: "Krungthai", title: "HI-SA-TI Shop", category: "Film", kind: "video", asset: "krungthai-hisati-shop.mp4", poster: "krungthai-hisati-shop.jpg" },

  // MG
  { id: "mg-new-zs", campaign: "MG", title: "New MG ZS launch", category: "Advertising", kind: "video", asset: "mg-new-zs.mp4", poster: "mg-new-zs.jpg" },
  { id: "mg-live-smart", campaign: "MG", title: "Live Smart", category: "Advertising", kind: "video", asset: "mg-live-smart.mp4", poster: "mg-live-smart.jpg" },

  // Banner Protein
  { id: "banner-protein-teens", campaign: "Banner Protein", title: "Every activity, all out", category: "Advertising", kind: "video", asset: "banner-protein-teens.mp4", poster: "banner-protein-teens.jpg" },
  { id: "banner-protein-recovery", campaign: "Banner Protein", title: "Recovery", category: "Advertising", kind: "video", asset: "banner-protein-recovery.mp4", poster: "banner-protein-recovery.jpg" },

  // AirAsia
  { id: "airasia-chiang-rai", campaign: "AirAsia", title: "My Name is Chiang Rai", category: "Film", kind: "video", asset: "airasia-chiang-rai.mp4", poster: "airasia-chiang-rai.jpg" },
];

// Campaign order on the page, and the order pieces start in within each.
export const CAMPAIGN_ORDER = [
  "The Mall M7 M8",
  "EM District",
  "Krungthai",
  "OK Thin",
  "Moong Pattana",
  "MG",
  "Banner Protein",
  "AirAsia",
];
