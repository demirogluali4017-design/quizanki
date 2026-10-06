export type MarkKind = "v" | "c" | "r";

export type ReadingQuestion = {
  kind: "Ana fikir" | "Detay" | "Kelime" | "Çıkarım";
  prompt: string;
  options: string[];
  answer: number;
  why: string;
};

export type ReadingPassage = {
  id: string;
  topic: string;
  title: string;
  minutes: number;
  sourceNote: string;
  paragraphs: string[];
  summaryTr: string;
  questions: ReadingQuestion[];
};

/**
 * Metinler gazeteden kopyalanmaz. YDS parça uzunluğunda, sınav konularında
 * yeniden yazılmış okuma metinleridir. İşaretler:
 * [[v:...]] fiil, [[c:...]] bağlaç, [[r:...]] gönderim.
 */
export const READINGS: ReadingPassage[] = [
  {
    id: "glaciers",
    topic: "Çevre",
    title: "Des glaciers qui reculent, des rivières qui changent",
    minutes: 4,
    sourceNote: "YDS biçiminde özgün parça",
    paragraphs: [
      "Dans plusieurs vallées alpines, les glaciers [[v:perdent]] chaque année une couche de glace visible à l'œil nu. [[c:Cependant]], le phénomène ne [[v:se limite]] pas au paysage. Lorsque la glace [[v:fond]], [[r:elle]] [[v:libère]] une eau froide qui [[v:modifie]] le débit des rivières en été.",
      "[[c:Ainsi]], des villages qui [[v:comptaient]] autrefois sur une fonte lente [[v:se retrouvent]] avec trop d'eau au printemps et trop peu en août. [[c:Pourtant]], la même eau [[v:sert]] à l'irrigation, aux barrages et à la consommation. [[r:Ce déséquilibre]] [[v:oblige]] les communes à revoir le calendrier agricole.",
      "Les chercheurs [[v:soulignent]] qu'un glacier n'[[v:est]] pas seulement une réserve d'eau. [[r:Il]] [[v:abrite]] aussi des micro-organismes anciens et [[v:stabilise]] les pentes. [[c:Si]] la glace [[v:disparaît]] trop vite, les éboulements [[v:deviennent]] plus fréquents. [[c:En revanche]], certaines espèces végétales [[v:gagnent]] du terrain sur les moraines libérées.",
      "La difficulté [[v:vient]] du décalage entre l'observation et la décision. Les mesures [[v:montrent]] déjà le recul, [[c:mais]] les infrastructures [[v:ont]] été conçues pour un climat plus stable. [[c:Donc]], adapter les barrages [[v:prend]] plus de temps que la fonte elle-même.",
    ],
    summaryTr: "Alp buzulları eridikçe yazın nehir akışı bozuluyor. Sulama ve barajlar bu düzensiz suya göre kurulmadığı için belediyeler tarım takvimini değiştirmek zorunda. Buzul yalnızca su deposu değil; yamaçları da tutuyor.",
    questions: [
      {
        kind: "Ana fikir",
        prompt: "Parçanın asıl anlattığı nedir?",
        options: [
          "Buzulların erimesi yalnızca manzarayı değiştirir.",
          "Buzulların çekilmesi su düzenini ve yerleşim kararlarını etkiler.",
          "Barajlar erimeyi tamamen durdurabilir.",
          "Yeni bitkiler erimeyi önler.",
        ],
        answer: 1,
        why: "Parça manzaradan çok su takvimi, tarım ve altyapı gecikmesi üzerinde durur.",
      },
      {
        kind: "Detay",
        prompt: "Yaz sonunda köylerin karşılaştığı sorun hangisidir?",
        options: [
          "İlkbaharda suyun tamamen kesilmesi",
          "Ağustosta suyun azalması",
          "Barajların kapanması",
          "Mikroorganizmaların çoğalması",
        ],
        answer: 1,
        why: "Metin ilkbaharda fazla, ağustosta az su olduğunu söyler.",
      },
      {
        kind: "Kelime",
        prompt: "« se retrouvent » burada en yakın hangi anlama gelir?",
        options: ["geri dönerler", "karşı karşıya kalırlar", "yeniden buluşurlar", "kaybolurlar"],
        answer: 1,
        why: "Köyler yavaş erimeye güvenirken yeni bir su düzeniyle karşı karşıya kalır.",
      },
      {
        kind: "Çıkarım",
        prompt: "Parçadan hangi sonuç çıkar?",
        options: [
          "Ölçümler henüz erimeyi göstermiyor.",
          "Altyapı, iklim değişiminden daha yavaş uyarlanıyor.",
          "Tarım takviminin değişmesine gerek yoktur.",
          "Eboulement riski azalmaktadır.",
        ],
        answer: 1,
        why: "Son paragraf kararın gözlemden geri kaldığını açıklar. Bu şık metinde birebir cümle değildir.",
      },
    ],
  },
  {
    id: "sommeil",
    topic: "Sağlık",
    title: "Le sommeil qui trie la mémoire",
    minutes: 4,
    sourceNote: "YDS biçiminde özgün parça",
    paragraphs: [
      "Une nuit courte ne [[v:fatigue]] pas seulement le corps. [[r:Elle]] [[v:change]] aussi la façon dont le cerveau [[v:range]] ce qui [[v:a été appris]] dans la journée. Pendant le sommeil profond, certaines connexions [[v:se renforcent]], [[c:tandis que]] d'autres [[v:s'affaiblissent]].",
      "[[c:Ainsi]], un étudiant qui [[v:revoit]] un vocabulaire le soir ne [[v:garde]] pas automatiquement chaque mot. Le cerveau [[v:semble]] privilégier les éléments reliés à une émotion ou à une répétition. [[c:Cependant]], cette sélection [[v:échoue]] lorsque le sommeil [[v:est]] coupé plusieurs fois.",
      "Les laboratoires [[v:observent]] que la mémoire des faits et la mémoire des gestes ne [[v:suivent]] pas le même horaire. [[r:La première]] [[v:profite]] surtout du début de la nuit. [[r:La seconde]] [[v:s'appuie]] davantage sur les phases plus tardives. [[c:Donc]], se coucher très tard [[v:peut]] protéger une tâche manuelle tout en affaiblissant une liste de dates.",
      "[[c:Pourtant]], allonger le sommeil sans régularité ne [[v:suffit]] pas. Les chercheurs [[v:insistent]] sur l'heure stable. [[r:Celle-ci]] [[v:permet]] au tri de se produire au même moment chaque nuit, [[c:alors que]] des horaires variables [[v:brouillent]] le signal.",
    ],
    summaryTr: "Derin uyku, gün içinde öğrenileni eler. Duyguya veya tekrara bağlı olanlar kalır. Olgu belleği gecenin başından, hareket belleği sonundan yararlanır. Süre kadar düzenli saat de önemlidir.",
    questions: [
      {
        kind: "Ana fikir",
        prompt: "Parça en çok neyi savunur?",
        options: [
          "Kısa uyku yalnızca kasları yorar.",
          "Uyku, öğrenileni seçerek yerleştirir.",
          "Her kelime uyku sırasında eşit güçlenir.",
          "Geç yatmak tarih ezberini güçlendirir.",
        ],
        answer: 1,
        why: "Ana eksen, uykunun bağlantıları güçlendirip zayıflatarak elemesidir.",
      },
      {
        kind: "Detay",
        prompt: "Olgu belleği en çok gecenin hangi bölümünden yararlanır?",
        options: ["Sonundan", "Başından", "Yalnızca sabah uyanınca", "Öğle uykusundan"],
        answer: 1,
        why: "Metin la première için gecenin başını belirtir.",
      },
      {
        kind: "Kelime",
        prompt: "« brouillent » burada ne yapar?",
        options: ["sinyali netleştirir", "sinyali karıştırır", "uykuyu uzatır", "tekrarı artırır"],
        answer: 1,
        why: "Değişken saatler tri sinyalini karıştırır.",
      },
      {
        kind: "Çıkarım",
        prompt: "Parçaya göre hangi çıkarım daha sağlamdır?",
        options: [
          "Düzensiz ama uzun uyku, seçmeyi tek başına düzeltir.",
          "Aynı saatte uyumak, süreyi uzatmaktan ayrı bir katkı sağlar.",
          "Hareket belleği gecenin başında kurulur.",
          "Kesilen uyku seçmeyi hızlandırır.",
        ],
        answer: 1,
        why: "Son paragraf süre yetmez, sabit saat gerekir der. Şık bunu sonuç olarak söyler.",
      },
    ],
  },
  {
    id: "imprimerie",
    topic: "Tarih",
    title: "Quand le livre quitte l'atelier",
    minutes: 4,
    sourceNote: "YDS biçiminde özgün parça",
    paragraphs: [
      "Avant les presses à caractères mobiles, copier un ouvrage [[v:demandait]] des mois. [[c:Aussi]] le livre [[v:restait]]-il rare, cher et souvent enfermé dans une bibliothèque religieuse. L'imprimerie du XVe siècle ne [[v:crée]] pas la lecture, [[c:mais]] [[r:elle]] [[v:change]] son échelle.",
      "Un texte [[v:pouvait]] désormais circuler dans plusieurs villes avant que les erreurs de la première édition [[v:soient]] corrigées. [[c:Par conséquent]], les débats savants [[v:s'accélèrent]]. [[c:Néanmoins]], cette vitesse [[v:apporte]] aussi des textes inexacts, car tout atelier ne [[v:disposait]] pas d'un correcteur compétent.",
      "L'effet social [[v:est]] inégal. Dans les ports et les universités, les lecteurs [[v:multiplient]] les échanges. Dans les campagnes, le prix du papier [[v:reste]] un obstacle plus longtemps. [[r:Là]], savoir lire ne [[v:suffisait]] pas si le livre n'[[v:arrivait]] pas.",
      "Les historiens [[v:évitent]] donc une formule trop simple. L'imprimerie n'[[v:a]] pas rendu toute l'Europe lettrée d'un coup. [[r:Elle]] [[v:a]] rendu possible une circulation plus large, [[c:tandis que]] l'école, le prix et la langue [[v:décidaient]] encore qui [[v:pouvait]] en profiter.",
    ],
    summaryTr: "Matbaa okumayı icat etmedi, ölçeğini değiştirdi. Metinler hızlandı ama hatalar da yayıldı. Kırsalda kâğıt fiyatı engel kaldı. Okuryazarlığı asıl belirleyen baskı kadar okul, fiyat ve dildi.",
    questions: [
      {
        kind: "Ana fikir",
        prompt: "Yazarın uyarıdığı basit formül hangisidir?",
        options: [
          "Matbaa Avrupa'yı bir anda okuryazar yaptı.",
          "Kitaplar baskıdan sonra daha pahalı oldu.",
          "Kırsalda hiç kimse okumuyordu.",
          "Düzeltmenler hataları tamamen önledi.",
        ],
        answer: 0,
        why: "Son paragraf bu formülün yanlış olduğunu söyler.",
      },
      {
        kind: "Detay",
        prompt: "Kırsalda okumayı geciktiren engel olarak ne anılır?",
        options: ["Üniversite yasakları", "Kâğıt fiyatı", "Liman vergisi", "Dini kütüphanelerin kapanması"],
        answer: 1,
        why: "Kampanyalarda prix du papier engel olarak verilir.",
      },
      {
        kind: "Kelime",
        prompt: "« s'accélèrent » tartışmalar için ne der?",
        options: ["durur", "yavaşlar", "hızlanır", "gizlenir"],
        answer: 2,
        why: "Metinlerin dolaşımı bilimsel tartışmayı hızlandırır.",
      },
      {
        kind: "Çıkarım",
        prompt: "Parçadan hangi sonuç çıkar?",
        options: [
          "Teknik yenilik, herkesin aynı anda yararlandığı bir sonuç doğurur.",
          "Bir aracın yayılması, ona erişen kurumlara bağlı kalabilir.",
          "Hatalı baskı bilimsel tartışmayı durdurmuştur.",
          "Manastır kütüphaneleri matbaadan sonra çoğalmıştır.",
        ],
        answer: 1,
        why: "Okul, fiyat ve dil hâlâ kimin yararlanacağını belirliyordu.",
      },
    ],
  },
  {
    id: "travail",
    topic: "Ekonomi",
    title: "Le travail à distance ne vaut pas une heure de plus",
    minutes: 4,
    sourceNote: "YDS biçiminde özgün parça",
    paragraphs: [
      "Lorsque des entreprises [[v:ont autorisé]] le travail à distance, beaucoup [[v:ont cru]] que les employés [[v:produiraient]] davantage. Le trajet [[v:disparaissait]], [[c:donc]] la journée [[v:semblait]] plus longue. Les mesures [[v:racontent]] une histoire moins simple.",
      "Les tâches qui [[v:exigent]] une concentration individuelle [[v:progressent]] souvent. [[c:En revanche]], les décisions qui [[v:demandent]] un désaccord rapide [[v:ralentissent]]. Un message [[v:attend]] une réponse, [[c:alors qu']]une réunion courte [[v:aurait]] tranché le même point.",
      "[[c:Toutefois]], l'avantage [[v:dépend]] du métier. Un analyste [[v:peut]] protéger deux heures sans interruption. Une équipe de conception [[v:perd]] ces heures si [[r:elle]] [[v:doit]] reconstruire le contexte à chaque échange. [[r:Ce coût]] invisible n'[[v:apparaît]] pas dans le seul nombre de messages envoyés.",
      "Les économistes [[v:concluent]] qu'il [[v:faut]] compter la qualité de la coordination, pas seulement les minutes gagnées sur le transport. [[c:Sinon]], une entreprise [[v:confond]] la présence en ligne avec le travail achevé.",
    ],
    summaryTr: "Uzaktan çalışmada yol süresi kalkınca gün uzamış gibi görünür. Bireysel iş hızlanabilir, hızlı anlaşmazlık ise yavaşlar. Kazanç mesleğe bağlıdır. Ekonomistler yalnızca mesaj sayısına değil, eşgüdümün niteliğine bakılmasını söyler.",
    questions: [
      {
        kind: "Ana fikir",
        prompt: "Parçanın temel uyarısı nedir?",
        options: [
          "Uzaktan çalışma her meslekte üretimi artırır.",
          "Kazanılan yol süresi, biten iş ile aynı şey değildir.",
          "Toplantılar her zaman mesajdan yavaştır.",
          "Analistler uzaktan çalışamaz.",
        ],
        answer: 1,
        why: "Son cümle çevrimiçi varlığı tamamlanmış işle karıştırmamak gerektiğini söyler.",
      },
      {
        kind: "Detay",
        prompt: "Hangi iş türü çoğu zaman ilerler?",
        options: [
          "Hızlı anlaşmazlık gerektiren kararlar",
          "Bireysel yoğunlaşma isteyen görevler",
          "Sürekli bağlam kuran tasarım toplantıları",
          "Yolculuk planları",
        ],
        answer: 1,
        why: "Concentration individuelle ilerler denir.",
      },
      {
        kind: "Kelime",
        prompt: "« tranché » burada hangi anlama en yakındır?",
        options: ["kesmiş", "erteledi", "karara bağlamış", "yazmış"],
        answer: 2,
        why: "Kısa toplantı aynı noktayı karara bağlardı.",
      },
      {
        kind: "Çıkarım",
        prompt: "Hangi çıkarım metne uyar?",
        options: [
          "Gönderilen mesaj sayısı eşgüdüm maliyetini gösterir.",
          "Görünmeyen maliyet, mesaj sayısına bakınca kaçabilir.",
          "Tasarım ekipleri iki saatlik sessizlikten her zaman kazanır.",
          "Yol süresi kalkınca kararlar hızlanır.",
        ],
        answer: 1,
        why: "Ce coût invisible mesaj sayısında görünmez.",
      },
    ],
  },
  {
    id: "lecture",
    topic: "Eğitim",
    title: "Lire sans tout traduire",
    minutes: 4,
    sourceNote: "YDS biçiminde özgün parça",
    paragraphs: [
      "Beaucoup d'apprenants [[v:traduisent]] chaque phrase avant de comprendre le paragraphe. [[r:Cette habitude]] [[v:rassure]], [[c:mais]] [[r:elle]] [[v:ralentit]] la lecture et [[v:cache]] les liens entre les idées. Un texte d'examen [[v:demande]] d'abord une carte grossière, pas un dictionnaire complet.",
      "[[c:D'abord]], le lecteur [[v:repère]] qui [[v:fait]] quoi. Ensuite, il [[v:cherche]] les tournants : [[c:cependant]], [[c:donc]], [[c:en revanche]]. [[r:Ces mots]] [[v:annoncent]] souvent la phrase qui [[v:porte]] la question. [[c:Enfin]], il [[v:revient]] au mot inconnu seulement si [[r:celui-ci]] [[v:bloque]] le sens.",
      "Les études sur la compréhension [[v:montrent]] qu'un résumé produit après la lecture [[v:fixe]] mieux le propos qu'une traduction écrite en parallèle. [[c:Néanmoins]], le résumé [[v:doit]] rester court. S'il [[v:recopie]] le texte, il ne [[v:prouve]] pas qu'une sélection [[v:a eu]] lieu.",
      "[[c:Ainsi]], cinq textes courts et réguliers [[v:valent]] mieux qu'un long article abandonné. L'objectif n'[[v:est]] pas de connaître chaque verbe, [[c:mais]] de suivre l'argument jusqu'à sa limite.",
    ],
    summaryTr: "Cümleyi baştan çevirmek okumayı yavaşlatır. Önce kim ne yapıyor, sonra bağlaçlardaki dönüş, en son anlamı tıkayan kelime. Okuma sonrası kısa özet, paralel çeviriden daha iyi yerleştirir. Düzenli kısa metin, yarım bırakılan uzun makaleden iyidir.",
    questions: [
      {
        kind: "Ana fikir",
        prompt: "Parça okuyucudan ne ister?",
        options: [
          "Her cümleyi yazarak çevirmek",
          "Önce akışı görmek, kelimeyi sonra çözmek",
          "Uzun makaleyi sözlükle bitirmek",
          "Tüm fiilleri ezberlemek",
        ],
        answer: 1,
        why: "Sıra repérer, tournants, sonra anlamı tıkayan kelimedir.",
      },
      {
        kind: "Detay",
        prompt: "Özet ne zaman işe yarar?",
        options: [
          "Metni olduğu gibi kopyalarsa",
          "Okumadan önce yazılırsa",
          "Kısa kalır ve seçim yapıldığını gösterirse",
          "Her fiili içerirse",
        ],
        answer: 2,
        why: "Özet kısa olmalı, kopya seçim yapıldığını kanıtlamaz.",
      },
      {
        kind: "Kelime",
        prompt: "« tournants » burada neyi işaret eder?",
        options: ["sayfa numaralarını", "anlamın döndüğü bağlaçları", "bilinmeyen fiilleri", "paragraf başlıklarını"],
        answer: 1,
        why: "Cependant, donc, en revanche örnekleri bu dönüşlerdir.",
      },
      {
        kind: "Çıkarım",
        prompt: "Parçaya göre hangi çalışma daha tutarlıdır?",
        options: [
          "Her gün kısa metin, argümanı sonuna kadar izlemek",
          "Haftada bir uzun makaleyi yarım bırakmak",
          "Çeviri bitmeden soruya geçmemek",
          "Yalnızca fiil listesi çıkarmak",
        ],
        answer: 0,
        why: "Son paragraf beş kısa metni, bırakılan uzun makaleye üstün tutar.",
      },
    ],
  },
];

export function getReading(id: string) {
  return READINGS.find((item) => item.id === id) ?? null;
}
