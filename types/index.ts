export interface Flashcard {
  id: string;
  created_at: string;
  word: string;
  preposition: string | null;
  meaning: string;
  example_sentence: string;
  repetitions: number;
  interval: number;
  ease_factor: number;
  next_review_date: string;
}

// Gemini'nin döndürdüğü ham JSON satırı (henüz DB'ye kaydedilmemiş)
export interface ExtractedWord {
  word: string;
  preposition: string;
  meaning: string;
  example_sentence: string;
}

// SM-2 değerlendirme dereceleri
export type SM2Rating = 1 | 3 | 5; // 1 = Zor (Again), 3 = Orta (Good), 5 = Kolay (Easy)

export interface SM2Result {
  repetitions: number;
  interval: number;
  ease_factor: number;
  next_review_date: string; // ISO string
}
