export interface EventDataType {
  id: string;
  title: string;
  image: string;
  date: string;
  time: string;
  location: string;
  address: string;
  price: string;
  category?: string;
  description: string;
  eventType: string;
  lineup: string[];
  ticketTypes: {
    name: string;
    price: number;
    available: boolean;
  }[];
  isFeatured?: boolean;
}

export const eventsData: EventDataType[] = [
  {
    id: "1",
    title: "Три дня дождя",
    image: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1200&q=80",
    date: "17 ноября 2025",
    time: "19:00",
    location: "Дворец спорта",
    address: "пр-т. Победителей 4, Минск, Минская область 220004",
    price: "От 50 BYN",
    category: "Концерт",
    description: `Большой концерт Три дня дождя, на котором вы сможете снова прожить все музыкальные эры вместе с артистом и пережить падения и взлеты!`,
    eventType: "Концерт",
    lineup: ["Три дня дождя"],
    ticketTypes: [
      { name: "Стандарт", price: 50, available: true },
      { name: "VIP", price: 100, available: true }
    ],
    isFeatured: true,
  },
  {
    id: "2",
    title: "Markul",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80",
    date: "10 октября 2025",
    time: "18:00",
    location: "Стадион Динамо",
    address: "ул. Кирова 8, Минск, Минская область",
    price: "От 50 BYN",
    category: "Концерт",
    description: `MDGA альбом`,
    eventType: "Концерт",
    lineup: ["Markul"],
    ticketTypes: [
      { name: "Стандарт", price: 50, available: true },
      { name: "VIP", price: 100, available: true }
    ],
    isFeatured: true,
  },
  {
    id: "3",
    title: "Pharaoh",
    image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=1200&q=80",
    date: "12 сентября 2025",
    time: "19:00",
    location: "Стадион Динамо",
    address: "ул. Кирова 8, Минск, Минская область",
    price: "От 50 BYN",
    category: "Концерт",
    description: `10:13`,
    eventType: "Концерт",
    lineup: ["Pharaoh", "Dead Dynasty"],
    ticketTypes: [
      { name: "Стандарт", price: 50, available: true },
      { name: "VIP", price: 100, available: true }
    ],
    isFeatured: true,
  },
  {
    id: "4",
    title: "ЛСП",
    image: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=1200&q=80",
    date: "25 июня 2025",
    time: "19:00",
    location: "Prime Hall",
    address: "пр-т. Победителей 65, Минск, Минская область",
    price: "От 50 BYN",
    category: "Концерт",
    description: ``,
    eventType: "Концерт",
    lineup: ["ЛСП", "Специальный гость"],
    ticketTypes: [
      { name: "Стандарт", price: 50, available: true },
      { name: "VIP", price: 100, available: true }
    ],
    isFeatured: true,
  },
  {
    id: "5",
    title: "Miyagi & Andy Panda",
    image: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
    date: "15 августа 2025",
    time: "20:00",
    location: "Minsk-Arena",
    address: "пр-т. Победителей 111, Минск",
    price: "От 50 BYN",
    category: "Концерт",
    description: `YAMAKASI TOUR`,
    eventType: "Концерт",
    lineup: ["Miyagi", "Andy Panda"],
    ticketTypes: [
      { name: "Стандарт", price: 50, available: true },
      { name: "VIP", price: 100, available: true }
    ],
  },
  {
    id: "6",
    title: "Би-2",
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80",
    date: "5 июля 2025",
    time: "19:30",
    location: "Дворец Республики",
    address: "Октябрьская площадь 1, Минск",
    price: "От 50 BYN",
    category: "Концерт",
    description: `Юбилейный тур`,
    eventType: "Концерт",
    lineup: ["Би-2"],
    ticketTypes: [
      { name: "Стандарт", price: 50, available: true },
      { name: "VIP", price: 100, available: true }
    ],
  },
  {
    id: "7",
    title: "Kai Angel & 9mice",
    image: "https://images.unsplash.com/photo-1598387846159-ed4004000b01?auto=format&fit=crop&w=1200&q=80",
    date: "22 января 2026",
    time: "20:00",
    location: "Prime Hall",
    address: "пр-т. Победителей 65, Минск",
    price: "От 50 BYN",
    category: "Концерт",
    description: `Легендарная пара Kai Angel & 9mice со своим дебютным альбомом "Heavy Metal 2". Разрывает перепонки в Prime Hall'e. Приходите RR!`,
    eventType: "Концерт",
    lineup: ["Kai Angel", "9mice"],
    ticketTypes: [
      { name: "Стандарт", price: 50, available: true },
      { name: "VIP", price: 100, available: true }
    ],
  },
  {
    id: "8",
    title: "Noize MC",
    image: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=800&q=80",
    date: "30 сентября 2025",
    time: "19:00",
    location: "КЗ 'Минск'",
    address: "ул. Октябрьская 16, Минск",
    price: "От 50 BYN",
    category: "Концерт",
    description: `Акустический концерт`,
    eventType: "Концерт",
    lineup: ["Noize MC"],
    ticketTypes: [
      { name: "Стандарт", price: 50, available: true },
      { name: "VIP", price: 100, available: true }
    ],
  },
];

export const getEventById = (id: string): EventDataType | undefined => {
  return eventsData.find(event => event.id === id);
};
