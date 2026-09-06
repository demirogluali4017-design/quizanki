import { SM2Rating, SM2Result } from "@/types";

interface SM2Input {
  repetitions: number;
  interval: number;
  ease_factor: number;
}

const MIN_EASE_FACTOR = 1.3;

/**
 * SM-2 (SuperMemo 2) algoritmasının basitleştirilmiş 3 kademeli versiyonu.
 *
 * rating:
 *  1 -> Zor (Again)  : kart sıfırlanır, yarın tekrar gösterilir, ease_factor düşer
 *  3 -> Orta (Good)   : interval * ease_factor kadar ileri atlanır
 *  5 -> Kolay (Easy)  : interval * ease_factor * 1.3 kadar ileri atlanır, ease_factor artar
 *
 * @param current Kartın mevcut SM-2 durumu
 * @param rating Kullanıcının verdiği değerlendirme
 * @returns Kartın yeni SM-2 durumu (next_review_date dahil)
 */
export function calculateSM2(current: SM2Input, rating: SM2Rating): SM2Result {
  let { repetitions, interval, ease_factor } = current;

  switch (rating) {
    case 1: {
      // Zor: baştan başla
      repetitions = 0;
      interval = 1;
      ease_factor = Math.max(MIN_EASE_FACTOR, ease_factor - 0.2);
      break;
    }

    case 3: {
      // Orta: normal ilerleme
      repetitions += 1;
      interval = repetitions === 1 ? 1 : Math.round(interval * ease_factor);
      // ease_factor Orta seçiminde değişmez
      break;
    }

    case 5: {
      // Kolay: hızlandırılmış ilerleme
      repetitions += 1;
      interval =
        repetitions === 1
          ? 1
          : Math.round(interval * ease_factor * 1.3);
      ease_factor = ease_factor + 0.15;
      break;
    }

    default: {
      const _exhaustive: never = rating;
      throw new Error(`Geçersiz SM2 rating: ${_exhaustive}`);
    }
  }

  // interval en az 1 gün olmalı
  interval = Math.max(1, interval);

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return {
    repetitions,
    interval,
    ease_factor: Number(ease_factor.toFixed(2)),
    next_review_date: nextReviewDate.toISOString(),
  };
}
