import EventCard from "@/components/EventCard";
import { DEFAULT_EVENT_IMAGE, resolveMediaUrl } from "@/lib/resolveMediaUrl";
import { cn } from "@/lib/utils";

/** Ширина одной ячейки сетки на /concerts (xl: 4 колонки в контейнере ~1680px). */
export const CATALOG_EVENT_CARD_WIDTH_CLASS = "w-full max-w-[21.5rem]";

type Props = {
  title: string;
  image?: string | null;
  date: string;
  time: string;
  location: string;
  category: string;
  genre?: string;
  priceLabel: string;
  description?: string;
  className?: string;
};

const EventCatalogCardPreview = ({
  title,
  image,
  date,
  time,
  location,
  category,
  genre,
  priceLabel,
  description,
  className,
}: Props) => {
  const img = image ? resolveMediaUrl(image) : DEFAULT_EVENT_IMAGE;
  const price = priceLabel.trim() || "от 50";

  return (
    <div className={cn("space-y-3", className)}>
      <p className="text-[10px] uppercase tracking-[0.2em] text-white/35">
        Предпросмотр карточки в каталоге — как на странице «Концерты»
      </p>
      <div className={cn(CATALOG_EVENT_CARD_WIDTH_CLASS, "pointer-events-none")}>
        <EventCard
          preview
          id="preview"
          title={title.trim() || "Название мероприятия"}
          image={img}
          date={date}
          time={time || "19:00"}
          location={location || "Площадка"}
          category={category || "Концерт"}
          genre={genre}
          price={price}
          description={description}
          className="h-full"
        />
      </div>
    </div>
  );
};

export default EventCatalogCardPreview;
