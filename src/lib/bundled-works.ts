import theMallThematic from "@/assets/works/the-mall-thematic.jpg";
import theMallFood from "@/assets/works/the-mall-food.jpg";
import theMallPet from "@/assets/works/the-mall-pet.jpg";
import theMallShopping from "@/assets/works/the-mall-shopping.jpg";
import theMallHarbourland from "@/assets/works/the-mall-harbourland.jpg";
import emDistrictKv from "@/assets/works/em-district-kv.jpg";
import okThinKv from "@/assets/works/ok-thin-kv.jpg";
import okThinBus from "@/assets/works/ok-thin-bus.jpg";
import moongPattanaBook from "@/assets/works/moong-pattana-book.jpg";

// Artwork compiled into the build, for pieces never uploaded to Storage. Shared
// so the back-office shows the same thumbnail the site shows.
export const BUNDLED_WORKS: Record<string, string> = {
  "the-mall-thematic": theMallThematic,
  "the-mall-food": theMallFood,
  "the-mall-pet": theMallPet,
  "the-mall-shopping": theMallShopping,
  "the-mall-harbourland": theMallHarbourland,
  "em-district-kv": emDistrictKv,
  "ok-thin-kv": okThinKv,
  "ok-thin-bus": okThinBus,
  "moong-pattana-book": moongPattanaBook,
};

export function resolveBundled(value: string | null | undefined): string | null {
  if (!value) return null;
  return value.startsWith("bundled:") ? (BUNDLED_WORKS[value.slice(8)] ?? null) : value;
}
