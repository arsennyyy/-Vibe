import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, Shield, Sparkles, Users, MapPin, ArrowRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import StaticPageLayout, { pageBody, pageCard } from "@/components/StaticPageLayout";

const stats = [
  { value: "50+", label: "площадок в каталоге" },
  { value: "24/7", label: "онлайн-покупка билетов" },
  { value: "100%", label: "защищённые платежи" },
];

const features = [
  {
    icon: Ticket,
    title: "Покупка за минуту",
    text: "Выберите концерт, места на интерактивной схеме зала и оплатите билет без очередей и лишних шагов.",
  },
  {
    icon: Shield,
    title: "Безопасность",
    text: "Данные карт не хранятся на нашей стороне. Каждая транзакция проходит через сертифицированный платёжный шлюз.",
  },
  {
    icon: Sparkles,
    title: "Для организаторов",
    text: "Создавайте события, загружайте обложки, настраивайте цены и отправляйте мероприятие на модерацию — всё в одном кабинете.",
  },
  {
    icon: Users,
    title: "Модерация качества",
    text: "Перед публикацией каждое событие проверяется командой +Vibe, чтобы в каталоге были только актуальные и достоверные анонсы.",
  },
  {
    icon: MapPin,
    title: "Площадки и карты",
    text: "Адрес, схема зала и карта Яндекс — гости сразу понимают, куда идти и какие места доступны.",
  },
  {
    icon: Bell,
    title: "Уведомления на почту",
    text: "Подтверждение регистрации, ответы поддержки и статусы модерации для организаторов — всё приходит на email.",
  },
];

const AboutPage = () => (
  <StaticPageLayout
    eyebrow="+Vibe"
    title="О нас"
    subtitle="Премиальный сервис билетов на концерты и живые мероприятия в Беларуси. Мы соединяем зрителей и организаторов в одной понятной экосистеме."
  >
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
      {stats.map((s, i) => (
        <motion.div
          key={s.label}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08 }}
          className={`${pageCard} text-center`}
        >
          <p className="text-3xl md:text-4xl font-display font-black text-foreground">{s.value}</p>
          <p className="text-sm text-muted-foreground mt-2">{s.label}</p>
        </motion.div>
      ))}
    </div>

    <div className={`${pageCard} mb-10`}>
      <h2 className="text-xl font-display font-bold text-foreground mb-4">Наша миссия</h2>
      <p className={pageBody}>
        +Vibe появился как ответ на хаос при покупке билетов: непонятные схемы, устаревшие цены и отсутствие
        прозрачности. Мы делаем живые события доступнее — для зрителя это быстрый и честный путь к билету, для
        организатора — инструмент, который не мешает творчеству, а помогает продавать.
      </p>
      <p className={`${pageBody} mt-4`}>
        Платформа разработана как дипломный и продуктовый проект с упором на реальный UX: тёмный интерфейс,
        интерактивная рассадка, статусы модерации и единый стиль от главной до страницы события.
      </p>
    </div>

    <h2 className="text-sm font-display font-bold uppercase tracking-widest text-muted-foreground mb-6">
      Что вы получаете
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-12">
      {features.map((f, i) => (
        <motion.div
          key={f.title}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.05 }}
          className={`${pageCard} flex gap-4`}
        >
          <div className="shrink-0 h-11 w-11 rounded-xl bg-[#8B5CF6]/15 border border-[#8B5CF6]/25 flex items-center justify-center">
            <f.icon className="h-5 w-5 text-[#8B5CF6]" />
          </div>
          <div>
            <h3 className="font-display font-bold text-foreground mb-2">{f.title}</h3>
            <p className={pageBody}>{f.text}</p>
          </div>
        </motion.div>
      ))}
    </div>

    <div className={`${pageCard} flex flex-col md:flex-row md:items-center md:justify-between gap-6`}>
      <div>
        <h2 className="text-xl font-display font-bold text-foreground mb-2">Готовы на концерт?</h2>
        <p className={pageBody}>Откройте каталог и выберите ближайшее мероприятие.</p>
      </div>
      <Button asChild className="h-11 px-8 bg-[#8B5CF6] text-white hover:bg-[#7c3aed] shrink-0">
        <Link to="/concerts">
          Смотреть концерты
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </Button>
    </div>
  </StaticPageLayout>
);

export default AboutPage;
