import raw from "@/data/en/yds_ozturk.json";

export interface EnCard { word: string; rank: number; pos?: string; example?: string; tr?: string; note?: string }
export interface EnDeck { id: string; title: string; cards: EnCard[] }

export const EN_SOURCE: string = raw.source;
export const EN_DECKS: EnDeck[] = raw.decks as EnDeck[];
export const getEnDeck = (id: string) => EN_DECKS.find((d) => d.id === id);
