import { Link } from "react-router-dom";
import StaticPageLayout from "@/components/StaticPageLayout";
import { LegalSectionsList, type LegalSection } from "@/components/LegalSections";
import LegalRevisionFooter from "@/components/LegalRevisionFooter";

const updated = "20 мая 2026 г.";

const sections: LegalSection[] = [
  {
    title: "1. Что такое cookie",
    paragraphs: [
      "Cookie — небольшие файлы, которые сайт сохраняет в браузере. Они помогают запомнить вход, настройки и понять, как пользователи пользуются сервисом.",
    ],
  },
  {
    title: "2. Какие cookie мы используем",
    paragraphs: [
      "Необходимые — сессия и токен авторизации: без них нельзя войти в профиль и оформить заказ.",
      "Функциональные — запоминают тему и предпочтения интерфейса.",
      "Аналитические — обезличенная статистика посещений для улучшения сайта; их можно отключить в браузере.",
    ],
  },
  {
    title: "3. Управление cookie",
    paragraphs: [
      "В настройках браузера можно удалить или заблокировать cookie. Отключение необходимых файлов приведёт к невозможности авторизации и покупки билетов.",
      "Режим «инкогнито» не сохраняет cookie после закрытия окна.",
    ],
  },
  {
    title: "4. Сторонние сервисы",
    paragraphs: [
      "Виджеты карт (Яндекс) и платёжные iframe могут устанавливать собственные cookie по правилам этих сервисов. Рекомендуем ознакомиться с их политиками отдельно.",
    ],
  },
  {
    title: "5. Обновления",
    paragraphs: [
      "Мы можем обновлять эту политику. Актуальная версия всегда опубликована на данной странице.",
    ],
  },
];

const CookiesPage = () => (
  <StaticPageLayout
    eyebrow="Правовая информация"
    title="Политика Cookie"
    subtitle="Какие файлы cookie использует +Vibe и как ими управлять."
    narrow
  >
    <LegalSectionsList sections={sections} />
    <LegalRevisionFooter updated={updated}>
      <Link to="/privacy" className="text-[#8B5CF6] hover:underline">
        Политика конфиденциальности
      </Link>
    </LegalRevisionFooter>
  </StaticPageLayout>
);

export default CookiesPage;
