export const SERVICE_CATEGORY_IDS = [
  "specials",
  "pansky",
  "mens",
] as const;

export type ServiceCategoryId = (typeof SERVICE_CATEGORY_IDS)[number];

export function isServiceCategoryId(v: string): v is ServiceCategoryId {
  return (SERVICE_CATEGORY_IDS as readonly string[]).includes(v);
}

export const SERVICE_CATEGORY_LABELS: Record<
  ServiceCategoryId,
  { en: string; sk: string; icon: string }
> = {
  specials: { en: "Special Offers", sk: "Špeciálna ponuka", icon: "★" },
  pansky: { en: "Pánsky Grooming", sk: "Pánsky Grooming", icon: "♂" },
  mens: { en: "Men's", sk: "Pánsky", icon: "♂" },
};
