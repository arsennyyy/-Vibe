/** Подсказки площадок и улиц Минска */
export const MINSK_VENUE_NAMES = [
  "Минск-Арена",
  "Дворец Республики",
  "Белэкспо",
  "Club NEXT",
  "RE:Public",
  "Площадь 1991",
  "Верхний город",
  "Loft Hall",
  "Pride Event Hall",
  "Гостиный двор",
  "Октябрьский",
  "Победа",
  "Мир",
  "Арт. Плейс",
  "Studio 42",
  "Underdog",
  "Gatsby",
  "Korova",
  "Trinity Hall",
  "Prime Hall",
  "Вега",
  "Джаз Клуб",
  "Палац спорту",
];

/** Адреса по названию площадки (подставляются при выборе из списка) */
export const MINSK_VENUE_ADDRESSES: Record<string, string> = {
  "Минск-Арена": "г. Минск, пр-т Независимости, 111",
  "Дворец Республики": "г. Минск, ул. Кирова, 1",
  "Белэкспо": "г. Минск, пр-т Победителей, 14",
  "Club NEXT": "г. Минск, пр-т Независимости, 58",
  "RE:Public": "г. Минск, ул. Немига, 6",
  "Площадь 1991": "г. Минск, ул. Немига, 12",
  "Loft Hall": "г. Минск, ул. Октябрьская, 16",
  "Pride Event Hall": "г. Минск, ул. Кальварийская, 25",
  "Гостиный двор": "г. Минск, ул. Революционная, 26",
  "Октябрьский": "г. Минск, пр-т Независимости, 97",
  "Победа": "г. Минск, пр-т Независимости, 91",
  "Мир": "г. Минск, пр-т Независимости, 110",
  "Prime Hall": "г. Минск, пр-т Победителей, 65",
  "Вега": "г. Минск, пр-т Независимости, 106",
  "Джаз Клуб": "г. Минск, ул. Революционная, 12",
};

export function resolveVenueAddress(
  venueName: string,
  extraMap?: Record<string, string>
): string | undefined {
  const name = venueName.trim();
  if (!name) return undefined;
  const merged = { ...MINSK_VENUE_ADDRESSES, ...extraMap };
  if (merged[name]) return merged[name];
  const key = Object.keys(merged).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? merged[key] : undefined;
}

export const MINSK_STREETS = [
  "пр-т Независимости",
  "пр-т Победителей",
  "пр-т Дзержинского",
  "пр-т Машерова",
  "пр-т Газеты Правда",
  "пр-т Монтажников",
  "пр-т Рокоссовского",
  "ул. Немига",
  "ул. Октябрьская",
  "ул. Козлова",
  "ул. Сурганова",
  "ул. Якуба Коласа",
  "ул. Тимирязева",
  "ул. Кульман",
  "ул. Притыцкого",
  "ул. Фрунзе",
  "ул. Ленина",
  "ул. Красноармейская",
  "ул. Бобруйская",
  "ул. Гико",
  "ул. Революционная",
  "ул. Зыбицкая",
  "ул. Раковская",
  "ул. Кальварийская",
  "ул. Володарского",
  "ул. Каховская",
  "ул. Максима Горького",
  "ул. Интернациональная",
  "ул. Киселёва",
  "ул. Кропоткина",
  "ул. Богдановича",
  "ул. Пионерская",
  "ул. Комсомольская",
  "ул. Куйбышева",
  "ул. Свердлова",
  "ул. Кальварийская",
  "ул. Шафарнянская",
  "ул. Сухаревская",
  "ул. Железнодорожная",
  "ул. Авакяна",
  "ул. Маяковского",
  "ул. Грушевская",
  "ул. Толстого",
  "ул. Чехова",
  "ул. Киселёва",
  "ул. Захарова",
  "ул. Берсона",
  "ул. Сторожовская",
  "ул. Восточная",
  "ул. Семашко",
  "ул. Беды",
  "ул. Слободская",
  "ул. Воронянского",
  "ул. Каховская",
  "ул. Логойский тракт",
  "ул. Могилёвская",
  "ул. Семёнова",
  "ул. Филимонова",
  "ул. Харьковская",
  "ул. Цнянская",
  "ул. Щорса",
  "ул. Янки Купалы",
  "ул. Энгельса",
  "пер. Розы Люксембург",
  "пер. Калинина",
  "пер. Козлова",
  "б-р Мулявина",
  "б-р Тростенецкий",
];

function matchQuery(pool: string[], query: string, limit: number): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  return pool.filter((item) => item.toLowerCase().includes(q)).slice(0, limit);
}

export function filterMinskVenueNameSuggestions(query: string, limit = 8): string[] {
  return matchQuery(MINSK_VENUE_NAMES, query, limit);
}

export function filterMinskAddressSuggestions(query: string, limit = 10): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 1) return [];
  const streets = MINSK_STREETS.map((s) => `г. Минск, ${s}`);
  const withNumber = MINSK_STREETS.map((s) => `г. Минск, ${s}, `);
  const pool = [...streets, ...withNumber];
  return pool.filter((item) => item.toLowerCase().includes(q)).slice(0, limit);
}

/** @deprecated используйте filterMinskVenueNameSuggestions / filterMinskAddressSuggestions */
export function filterMinskSuggestions(query: string, limit = 8): string[] {
  return [...filterMinskVenueNameSuggestions(query, limit), ...filterMinskAddressSuggestions(query, limit)].slice(
    0,
    limit
  );
}
