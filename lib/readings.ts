export type MarkKind = "v" | "c" | "r";

export type ReadingQuestion = {
  kind: "Idée principale" | "Détail" | "Vocabulaire" | "Inférence";
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
  sourceUrl?: string;
  sourceTitle?: string;
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
    sourceNote: "Özgün parça, gazeteden çekilmedi",
    paragraphs: [
      "Dans plusieurs vallées alpines, les glaciers [[v:perdent]] chaque année une couche de glace visible à l'œil nu. [[c:Cependant]], le phénomène ne [[v:se limite]] pas au paysage. Lorsque la glace [[v:fond]], [[r:elle]] [[v:libère]] une eau froide qui [[v:modifie]] le débit des rivières en été.",
      "[[c:Ainsi]], des villages qui [[v:comptaient]] autrefois sur une fonte lente [[v:se retrouvent]] avec trop d'eau au printemps et trop peu en août. [[c:Pourtant]], la même eau [[v:sert]] à l'irrigation, aux barrages et à la consommation. [[r:Ce déséquilibre]] [[v:oblige]] les communes à revoir le calendrier agricole.",
      "Les chercheurs [[v:soulignent]] qu'un glacier n'[[v:est]] pas seulement une réserve d'eau. [[r:Il]] [[v:abrite]] aussi des micro-organismes anciens et [[v:stabilise]] les pentes. [[c:Si]] la glace [[v:disparaît]] trop vite, les éboulements [[v:deviennent]] plus fréquents. [[c:En revanche]], certaines espèces végétales [[v:gagnent]] du terrain sur les moraines libérées.",
      "La difficulté [[v:vient]] du décalage entre l'observation et la décision. Les mesures [[v:montrent]] déjà le recul, [[c:mais]] les infrastructures [[v:ont]] été conçues pour un climat plus stable. [[c:Donc]], adapter les barrages [[v:prend]] plus de temps que la fonte elle-même.",
    ],
    summaryTr: "Alp buzulları eridikçe yazın nehir akışı bozuluyor. Sulama ve barajlar bu düzensiz suya göre kurulmadığı için belediyeler tarım takvimini değiştirmek zorunda. Buzul yalnızca su deposu değil; yamaçları da tutuyor.",
    questions: [
      {
        kind: "Idée principale",
        prompt: "Quelle est l'idée principale du texte ?",
        options: [
          "La fonte des glaciers ne change que le paysage.",
          "Le recul des glaciers modifie le régime de l'eau et les décisions locales.",
          "Les barrages peuvent arrêter complètement la fonte.",
          "Les nouvelles plantes empêchent la fonte.",
        ],
        answer: 1,
        why: "Le texte insiste sur le calendrier de l'eau, l'agriculture et le retard des infrastructures.",
      },
      {
        kind: "Détail",
        prompt: "Selon le texte, quel problème les villages rencontrent-ils à la fin de l'été ?",
        options: [
          "L'eau disparaît complètement au printemps.",
          "L'eau devient insuffisante en août.",
          "Les barrages ferment.",
          "Les micro-organismes se multiplient.",
        ],
        answer: 1,
        why: "Le texte oppose trop d'eau au printemps et trop peu en août.",
      },
      {
        kind: "Vocabulaire",
        prompt: "Dans le texte, « se retrouvent » signifie le plus près :",
        options: ["ils reviennent", "ils sont confrontés à", "ils se rencontrent de nouveau", "ils disparaissent"],
        answer: 1,
        why: "Les villages font face à un nouveau régime de l'eau.",
      },
      {
        kind: "Inférence",
        prompt: "Que peut-on déduire du texte ?",
        options: [
          "Les mesures ne montrent pas encore le recul.",
          "Les infrastructures s'adaptent plus lentement que le climat.",
          "Le calendrier agricole n'a pas besoin de changer.",
          "Le risque d'éboulement diminue.",
        ],
        answer: 1,
        why: "Le dernier paragraphe oppose l'observation déjà faite au temps nécessaire pour décider.",
      },
    ],
  },
  {
    id: "sommeil",
    topic: "Sağlık",
    title: "Le sommeil qui trie la mémoire",
    minutes: 4,
    sourceNote: "Özgün parça, gazeteden çekilmedi",
    paragraphs: [
      "Une nuit courte ne [[v:fatigue]] pas seulement le corps. [[r:Elle]] [[v:change]] aussi la façon dont le cerveau [[v:range]] ce qui [[v:a été appris]] dans la journée. Pendant le sommeil profond, certaines connexions [[v:se renforcent]], [[c:tandis que]] d'autres [[v:s'affaiblissent]].",
      "[[c:Ainsi]], un étudiant qui [[v:revoit]] un vocabulaire le soir ne [[v:garde]] pas automatiquement chaque mot. Le cerveau [[v:semble]] privilégier les éléments reliés à une émotion ou à une répétition. [[c:Cependant]], cette sélection [[v:échoue]] lorsque le sommeil [[v:est]] coupé plusieurs fois.",
      "Les laboratoires [[v:observent]] que la mémoire des faits et la mémoire des gestes ne [[v:suivent]] pas le même horaire. [[r:La première]] [[v:profite]] surtout du début de la nuit. [[r:La seconde]] [[v:s'appuie]] davantage sur les phases plus tardives. [[c:Donc]], se coucher très tard [[v:peut]] protéger une tâche manuelle tout en affaiblissant une liste de dates.",
      "[[c:Pourtant]], allonger le sommeil sans régularité ne [[v:suffit]] pas. Les chercheurs [[v:insistent]] sur l'heure stable. [[r:Celle-ci]] [[v:permet]] au tri de se produire au même moment chaque nuit, [[c:alors que]] des horaires variables [[v:brouillent]] le signal.",
    ],
    summaryTr: "Derin uyku, gün içinde öğrenileni eler. Duyguya veya tekrara bağlı olanlar kalır. Olgu belleği gecenin başından, hareket belleği sonundan yararlanır. Süre kadar düzenli saat de önemlidir.",
    questions: [
      {
        kind: "Idée principale",
        prompt: "Quelle idée le texte défend-il surtout ?",
        options: [
          "Un sommeil court fatigue seulement les muscles.",
          "Le sommeil range ce qui a été appris en le sélectionnant.",
          "Chaque mot se renforce autant pendant le sommeil.",
          "Se coucher tard aide à mémoriser les dates.",
        ],
        answer: 1,
        why: "L'axe du texte est le tri des connexions pendant le sommeil.",
      },
      {
        kind: "Détail",
        prompt: "Selon le texte, la mémoire des faits profite surtout de quelle partie de la nuit ?",
        options: ["De la fin", "Du début", "Du seul réveil", "De la sieste"],
        answer: 1,
        why: "Le texte dit que la première profite du début de la nuit.",
      },
      {
        kind: "Vocabulaire",
        prompt: "Dans ce passage, « brouillent » veut dire que les horaires :",
        options: ["clarifient le signal", "mêlent le signal", "rallongent le sommeil", "augmentent la répétition"],
        answer: 1,
        why: "Des horaires variables brouillent le signal du tri.",
      },
      {
        kind: "Inférence",
        prompt: "Quelle déduction est la plus solide ?",
        options: [
          "Un long sommeil irrégulier suffit à corriger le tri.",
          "Une heure stable apporte un gain distinct de la seule durée.",
          "La mémoire des gestes se forme au début de la nuit.",
          "Un sommeil coupé accélère la sélection.",
        ],
        answer: 1,
        why: "Le dernier paragraphe sépare la durée de la régularité.",
      },
    ],
  },
  {
    id: "imprimerie",
    topic: "Tarih",
    title: "Quand le livre quitte l'atelier",
    minutes: 4,
    sourceNote: "Özgün parça, gazeteden çekilmedi",
    paragraphs: [
      "Avant les presses à caractères mobiles, copier un ouvrage [[v:demandait]] des mois. [[c:Aussi]] le livre [[v:restait]]-il rare, cher et souvent enfermé dans une bibliothèque religieuse. L'imprimerie du XVe siècle ne [[v:crée]] pas la lecture, [[c:mais]] [[r:elle]] [[v:change]] son échelle.",
      "Un texte [[v:pouvait]] désormais circuler dans plusieurs villes avant que les erreurs de la première édition [[v:soient]] corrigées. [[c:Par conséquent]], les débats savants [[v:s'accélèrent]]. [[c:Néanmoins]], cette vitesse [[v:apporte]] aussi des textes inexacts, car tout atelier ne [[v:disposait]] pas d'un correcteur compétent.",
      "L'effet social [[v:est]] inégal. Dans les ports et les universités, les lecteurs [[v:multiplient]] les échanges. Dans les campagnes, le prix du papier [[v:reste]] un obstacle plus longtemps. [[r:Là]], savoir lire ne [[v:suffisait]] pas si le livre n'[[v:arrivait]] pas.",
      "Les historiens [[v:évitent]] donc une formule trop simple. L'imprimerie n'[[v:a]] pas rendu toute l'Europe lettrée d'un coup. [[r:Elle]] [[v:a]] rendu possible une circulation plus large, [[c:tandis que]] l'école, le prix et la langue [[v:décidaient]] encore qui [[v:pouvait]] en profiter.",
    ],
    summaryTr: "Matbaa okumayı icat etmedi, ölçeğini değiştirdi. Metinler hızlandı ama hatalar da yayıldı. Kırsalda kâğıt fiyatı engel kaldı. Okuryazarlığı asıl belirleyen baskı kadar okul, fiyat ve dildi.",
    questions: [
      {
        kind: "Idée principale",
        prompt: "Quelle formule trop simple l'auteur refuse-t-il ?",
        options: [
          "L'imprimerie a rendu toute l'Europe lettrée d'un coup.",
          "Les livres sont devenus plus chers après l'imprimerie.",
          "Personne ne lisait dans les campagnes.",
          "Les correcteurs ont empêché toute erreur.",
        ],
        answer: 0,
        why: "Le dernier paragraphe rejette cette formule.",
      },
      {
        kind: "Détail",
        prompt: "Quel obstacle retarde la lecture dans les campagnes ?",
        options: ["Les interdits universitaires", "Le prix du papier", "La taxe des ports", "La fermeture des bibliothèques"],
        answer: 1,
        why: "Le texte cite le prix du papier comme obstacle.",
      },
      {
        kind: "Vocabulaire",
        prompt: "À propos des débats, « s'accélèrent » indique qu'ils :",
        options: ["s'arrêtent", "ralentissent", "vont plus vite", "se cachent"],
        answer: 2,
        why: "La circulation des textes accélère les débats savants.",
      },
      {
        kind: "Inférence",
        prompt: "Que peut-on déduire du texte ?",
        options: [
          "Une technique profite à tous en même temps.",
          "La diffusion d'un outil dépend encore de qui y a accès.",
          "Les erreurs d'impression ont arrêté les débats.",
          "Les bibliothèques religieuses se sont multipliées.",
        ],
        answer: 1,
        why: "L'école, le prix et la langue décidaient encore qui pouvait en profiter.",
      },
    ],
  },
  {
    id: "travail",
    topic: "Ekonomi",
    title: "Le travail à distance ne vaut pas une heure de plus",
    minutes: 4,
    sourceNote: "Özgün parça, gazeteden çekilmedi",
    paragraphs: [
      "Lorsque des entreprises [[v:ont autorisé]] le travail à distance, beaucoup [[v:ont cru]] que les employés [[v:produiraient]] davantage. Le trajet [[v:disparaissait]], [[c:donc]] la journée [[v:semblait]] plus longue. Les mesures [[v:racontent]] une histoire moins simple.",
      "Les tâches qui [[v:exigent]] une concentration individuelle [[v:progressent]] souvent. [[c:En revanche]], les décisions qui [[v:demandent]] un désaccord rapide [[v:ralentissent]]. Un message [[v:attend]] une réponse, [[c:alors qu']]une réunion courte [[v:aurait]] tranché le même point.",
      "[[c:Toutefois]], l'avantage [[v:dépend]] du métier. Un analyste [[v:peut]] protéger deux heures sans interruption. Une équipe de conception [[v:perd]] ces heures si [[r:elle]] [[v:doit]] reconstruire le contexte à chaque échange. [[r:Ce coût]] invisible n'[[v:apparaît]] pas dans le seul nombre de messages envoyés.",
      "Les économistes [[v:concluent]] qu'il [[v:faut]] compter la qualité de la coordination, pas seulement les minutes gagnées sur le transport. [[c:Sinon]], une entreprise [[v:confond]] la présence en ligne avec le travail achevé.",
    ],
    summaryTr: "Uzaktan çalışmada yol süresi kalkınca gün uzamış gibi görünür. Bireysel iş hızlanabilir, hızlı anlaşmazlık ise yavaşlar. Kazanç mesleğe bağlıdır. Ekonomistler yalnızca mesaj sayısına değil, eşgüdümün niteliğine bakılmasını söyler.",
    questions: [
      {
        kind: "Idée principale",
        prompt: "Quel est l'avertissement principal du texte ?",
        options: [
          "Le travail à distance augmente la production dans tous les métiers.",
          "Le temps de trajet gagné n'est pas le travail achevé.",
          "Les réunions sont toujours plus lentes qu'un message.",
          "Les analystes ne peuvent pas travailler à distance.",
        ],
        answer: 1,
        why: "La fin du texte refuse de confondre présence en ligne et travail achevé.",
      },
      {
        kind: "Détail",
        prompt: "Selon le texte, quel type de tâche progresse souvent ?",
        options: [
          "Les décisions qui exigent un désaccord rapide",
          "Les tâches qui demandent une concentration individuelle",
          "Les réunions de conception qui reconstruisent le contexte",
          "La planification des trajets",
        ],
        answer: 1,
        why: "Le texte dit que la concentration individuelle progresse souvent.",
      },
      {
        kind: "Vocabulaire",
        prompt: "Ici, « tranché » se rapproche le plus de :",
        options: ["coupé", "reporté", "réglé", "écrit"],
        answer: 2,
        why: "Une réunion courte aurait tranché, donc réglé, le même point.",
      },
      {
        kind: "Inférence",
        prompt: "Quelle inférence correspond au texte ?",
        options: [
          "Le nombre de messages mesure le coût de coordination.",
          "Un coût invisible peut échapper au seul nombre de messages.",
          "Les équipes de conception gagnent toujours à deux heures de silence.",
          "Sans trajet, les décisions vont plus vite.",
        ],
        answer: 1,
        why: "Le coût invisible n'apparaît pas dans le nombre de messages.",
      },
    ],
  },
  {
    id: "lecture",
    topic: "Eğitim",
    title: "Lire sans tout traduire",
    minutes: 4,
    sourceNote: "Özgün parça, gazeteden çekilmedi",
    paragraphs: [
      "Beaucoup d'apprenants [[v:traduisent]] chaque phrase avant de comprendre le paragraphe. [[r:Cette habitude]] [[v:rassure]], [[c:mais]] [[r:elle]] [[v:ralentit]] la lecture et [[v:cache]] les liens entre les idées. Un texte d'examen [[v:demande]] d'abord une carte grossière, pas un dictionnaire complet.",
      "[[c:D'abord]], le lecteur [[v:repère]] qui [[v:fait]] quoi. Ensuite, il [[v:cherche]] les tournants : [[c:cependant]], [[c:donc]], [[c:en revanche]]. [[r:Ces mots]] [[v:annoncent]] souvent la phrase qui [[v:porte]] la question. [[c:Enfin]], il [[v:revient]] au mot inconnu seulement si [[r:celui-ci]] [[v:bloque]] le sens.",
      "Les études sur la compréhension [[v:montrent]] qu'un résumé produit après la lecture [[v:fixe]] mieux le propos qu'une traduction écrite en parallèle. [[c:Néanmoins]], le résumé [[v:doit]] rester court. S'il [[v:recopie]] le texte, il ne [[v:prouve]] pas qu'une sélection [[v:a eu]] lieu.",
      "[[c:Ainsi]], cinq textes courts et réguliers [[v:valent]] mieux qu'un long article abandonné. L'objectif n'[[v:est]] pas de connaître chaque verbe, [[c:mais]] de suivre l'argument jusqu'à sa limite.",
    ],
    summaryTr: "Cümleyi baştan çevirmek okumayı yavaşlatır. Önce kim ne yapıyor, sonra bağlaçlardaki dönüş, en son anlamı tıkayan kelime. Okuma sonrası kısa özet, paralel çeviriden daha iyi yerleştirir. Düzenli kısa metin, yarım bırakılan uzun makaleden iyidir.",
    questions: [
      {
        kind: "Idée principale",
        prompt: "Que demande le texte au lecteur ?",
        options: [
          "Traduire chaque phrase avant de continuer",
          "Suivre d'abord le mouvement, puis le mot bloquant",
          "Finir un long article avec le dictionnaire",
          "Mémoriser tous les verbes",
        ],
        answer: 1,
        why: "L'ordre donné est la carte du texte, puis les tournants, puis le mot bloquant.",
      },
      {
        kind: "Détail",
        prompt: "Quand le résumé est-il utile ?",
        options: [
          "Quand il recopie le texte",
          "Quand il est écrit avant la lecture",
          "Quand il reste court et montre qu'une sélection a eu lieu",
          "Quand il contient chaque verbe",
        ],
        answer: 2,
        why: "Un résumé qui recopie le texte ne prouve pas une sélection.",
      },
      {
        kind: "Vocabulaire",
        prompt: "Dans le texte, « tournants » désigne :",
        options: ["les numéros de page", "les connecteurs qui font tourner le sens", "les verbes inconnus", "les titres de paragraphe"],
        answer: 1,
        why: "Cependant, donc et en revanche sont les exemples donnés.",
      },
      {
        kind: "Inférence",
        prompt: "Quelle pratique le texte juge-t-il plus cohérente ?",
        options: [
          "Lire souvent un texte court jusqu'à la limite de l'argument",
          "Abandonner un long article une fois par semaine",
          "Ne pas questionner avant la fin de la traduction",
          "Relever seulement les verbes",
        ],
        answer: 0,
        why: "Cinq textes courts et réguliers valent mieux qu'un long article abandonné.",
      },
    ],
  },
];

export function getReading(id: string) {
  return READINGS.find((item) => item.id === id) ?? null;
}
