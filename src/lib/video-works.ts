import { createServerFn } from "@tanstack/react-start";

import { SITE_BUCKET } from "./site-assets";

export type VideoWork = {
  id: string;
  client: string;
  title: string;
  category: string;
  span: string;
  ratio: string;
  poster: string;
  video: string;
};

// The film work, keyed by the filenames produced when the masters were
// compressed for the web. A piece appears on the site once both its video and
// its poster are in the bucket — so uploading is the only step, and a piece
// that hasn't been uploaded is simply absent rather than a broken tile.
const CATALOGUE: Array<Omit<VideoWork, "poster" | "video"> & { file: string }> = [
  { id: "ok-thin-biscuit", file: "ok-thin-biscuit", client: "OK Thin", title: "Biscuit film", category: "Film", span: "sm:col-span-12 lg:col-span-7", ratio: "aspect-[16/9]" },
  { id: "em-district-thematic", file: "em-district-thematic", client: "EM District", title: "Thematic film", category: "Film", span: "sm:col-span-12 lg:col-span-5", ratio: "aspect-[16/9]" },
  { id: "em-district-facade", file: "em-district-facade", client: "EM District", title: "3D facade projection", category: "Experiential", span: "sm:col-span-6 lg:col-span-4", ratio: "aspect-[16/9]" },
  { id: "em-district-countdown", file: "em-district-countdown", client: "EM District", title: "Countdown", category: "Social", span: "sm:col-span-6 lg:col-span-4", ratio: "aspect-[16/9]" },
  { id: "airasia-chiang-rai", file: "airasia-chiang-rai", client: "AirAsia", title: "My Name is Chiang Rai", category: "Film", span: "sm:col-span-12 lg:col-span-4", ratio: "aspect-[16/9]" },
  { id: "mg-new-zs", file: "mg-new-zs", client: "MG", title: "New MG ZS launch", category: "Advertising", span: "sm:col-span-6 lg:col-span-6", ratio: "aspect-[16/9]" },
  { id: "mg-live-smart", file: "mg-live-smart", client: "MG", title: "Live Smart", category: "Advertising", span: "sm:col-span-6 lg:col-span-6", ratio: "aspect-[16/9]" },
  { id: "krungthai-live-smart", file: "krungthai-live-smart", client: "Krungthai", title: "Live Smart", category: "Film", span: "sm:col-span-6 lg:col-span-4", ratio: "aspect-[16/9]" },
  { id: "krungthai-man-suang", file: "krungthai-man-suang", client: "Krungthai", title: "Man Suang", category: "Film", span: "sm:col-span-6 lg:col-span-4", ratio: "aspect-[16/9]" },
  { id: "krungthai-missing-dad", file: "krungthai-missing-dad", client: "Krungthai", title: "Missing Dad", category: "Film", span: "sm:col-span-6 lg:col-span-4", ratio: "aspect-[16/9]" },
  { id: "krungthai-khok-khrai", file: "krungthai-khok-khrai", client: "Krungthai", title: "Khok Khrai", category: "Film", span: "sm:col-span-6 lg:col-span-4", ratio: "aspect-[16/9]" },
  { id: "krungthai-home-plus", file: "krungthai-home-plus", client: "Krungthai", title: "Home Plus debit card", category: "Advertising", span: "sm:col-span-6 lg:col-span-4", ratio: "aspect-[16/9]" },
  { id: "krungthai-hisati-shop", file: "krungthai-hisati-shop", client: "Krungthai", title: "HI-SA-TI Shop", category: "Film", span: "sm:col-span-6 lg:col-span-4", ratio: "aspect-[16/9]" },
  { id: "moong-pattana-book-for-moms", file: "moong-pattana-book-for-moms", client: "Moong Pattana", title: "The Book for All Moms", category: "Film", span: "sm:col-span-12 lg:col-span-6", ratio: "aspect-[16/9]" },
  { id: "moong-pattana-calendar-bkkdw", file: "moong-pattana-calendar-bkkdw", client: "Moong Pattana", title: "Happy Calendar — BKKDW", category: "Social", span: "sm:col-span-6 lg:col-span-3", ratio: "aspect-[16/9]" },
  { id: "moong-pattana-calendar-download", file: "moong-pattana-calendar-download", client: "Moong Pattana", title: "Happy Calendar", category: "Social", span: "sm:col-span-6 lg:col-span-3", ratio: "aspect-[16/9]" },
  { id: "banner-protein-teens", file: "banner-protein-teens", client: "Banner Protein", title: "Every activity, all out", category: "Advertising", span: "sm:col-span-6 lg:col-span-6", ratio: "aspect-[16/9]" },
  { id: "banner-protein-recovery", file: "banner-protein-recovery", client: "Banner Protein", title: "Recovery", category: "Advertising", span: "sm:col-span-6 lg:col-span-6", ratio: "aspect-[16/9]" },
];

type StorageList = {
  storage: {
    from(bucket: string): {
      list(
        path: string,
        options: { limit: number },
      ): PromiseLike<{ data: { name: string }[] | null; error: unknown }>;
    };
  };
};

export const getVideoWorks = createServerFn({ method: "GET" }).handler(
  async (): Promise<VideoWork[]> => {
    try {
      const base = (process.env["SUPABASE_URL"] ?? "").replace(/\/$/, "");
      if (!base) return [];

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await (supabaseAdmin as unknown as StorageList).storage
        .from(SITE_BUCKET)
        .list("", { limit: 1000 });

      const present = new Set((data ?? []).map((item) => item.name));
      const url = (name: string) => `${base}/storage/v1/object/public/${SITE_BUCKET}/${name}`;

      return CATALOGUE.filter(
        (work) => present.has(`${work.file}.mp4`) && present.has(`${work.file}.jpg`),
      ).map(({ file, ...work }) => ({
        ...work,
        video: url(`${file}.mp4`),
        poster: url(`${file}.jpg`),
      }));
    } catch (cause) {
      // The still work carries the section on its own; a storage hiccup should
      // not take the page down.
      console.error("[works] Skipping film work; storage unavailable", cause);
      return [];
    }
  },
);
