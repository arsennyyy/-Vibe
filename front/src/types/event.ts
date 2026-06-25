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