/**
 * Fotoğraf yükleme kontrol listesi.
 * Eski haline dönmek için bunu false yap.
 * false olunca Gemini sonucu yine doğrudan kaydolur.
 */
export const DRAFT_REVIEW = true;

export function draftBlockReason(row: { word: string; meaning: string }): string | null {
  const word = row.word.trim();
  const meaning = row.meaning.trim();
  if (!word || !meaning) return "Kelime ve anlam boş.";
  if (word.toLocaleLowerCase("tr") === meaning.toLocaleLowerCase("tr")) return "Kelime ile anlam aynı.";
  if (/[ğĞşŞıİ]/.test(word)) return "Kelime Türkçe görünüyor.";
  return null;
}
