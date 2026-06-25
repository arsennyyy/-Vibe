# Онлайн-демо +Vibe (бесплатный хостинг)

Одна ссылка для защиты: **фронт + API + БД** в облаке. Стек: **Render** (Docker) + **Neon** (PostgreSQL).

> ИИ-чат на хостинге: Ollama локально не работает. Варианты — бесплатный [Groq API](https://console.groq.com) (ключ в Render) или чат без ИИ (эскалация к админу).

---

## Шаг 1. База данных Neon (5 мин)

1. Зарегистрируйтесь на [neon.tech](https://neon.tech) (бесплатно).
2. **New Project** → регион ближе к EU (Frankfurt).
3. Скопируйте **Connection string** (PostgreSQL), формат:
   ```
   Host=ep-xxx.eu-central-1.aws.neon.tech;Database=neondb;Username=...;Password=...;SSL Mode=Require
   ```

4. (Опционально) Импорт вашей локальной БД:
   ```powershell
   $env:PGPASSWORD='asdfasdf'
   & "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" -h localhost -U postgres -d postgres -Fc -f vibe.dump

   # В Neon: Connection details → psql или:
   pg_restore -d "ВАША_NEON_CONNECTION_STRING" --no-owner --no-acl vibe.dump
   ```
   Если не импортируете — при первом запуске создадутся таблицы, FAQ, залы и **3 демо-концерта** автоматически.

---

## Шаг 2. GitHub (если ещё не залито)

```powershell
cd D:\+Vibe_site
git add .
git commit -m "Deploy: Docker + Render blueprint"
gh repo create vibe-diploma --private --source=. --push
```

Или создайте репозиторий на github.com и:

```powershell
git remote add origin https://github.com/ВАШ_ЛОГИН/vibe-diploma.git
git push -u origin main
```

**Не коммитьте** `backend/appsettings.json` с паролями — используйте `appsettings.Example.json`.

---

## Шаг 3. Render — деплой (10 мин)

1. [render.com](https://render.com) → Sign Up → **Connect GitHub**.
2. **New → Blueprint** → выберите репозиторий → Render прочитает `render.yaml`.
3. Заполните секреты при создании:
   | Переменная | Значение |
   |------------|----------|
   | `ConnectionStrings__DefaultConnection` | строка Neon |
   | `SiteUrl` | `https://vibe-site-xxxx.onrender.com` (подставите после деплоя) |
   | `Jwt__Key` | длинная случайная строка (32+ символа) |
   | `Ai__ApiKey` | ключ Groq (или оставьте пустым — чат скажет «ИИ недоступен») |

4. **Deploy** — первая сборка ~8–12 мин (Docker + npm + dotnet).

5. После деплоя откройте URL вида `https://vibe-site-xxxx.onrender.com` — это **единая ссылка** для комиссии.

### Важно про бесплатный тариф Render

- Сервис **засыпает** после ~15 мин без трафика.
- Первый запрос после сна — **30–60 сек** загрузки. **За 2–3 минуты до защиты откройте сайт в браузере.**
- Файлы в `uploads/` на диске **не переживают** пересборку — для демо используйте демо-события или внешние URL картинок.

---

## Шаг 4. Вход на демо

| Роль | Как войти |
|------|-----------|
| Админ | `bykovarsenij8@gmail.com` — OTP на почту (нужен SMTP) или заранее залогиньтесь локально и используйте тот же аккаунт в облачной БД |
| Посетитель | Регистрация на сайте |
| Организатор | Админ назначает роль в `/admin` |

Если SMTP на Render выключен (`SmtpSettings__Enabled=false`), для демо OTP не придёт — **импортируйте локальную БД** с уже верифицированным пользователем или включите Gmail в переменных Render:

```
SmtpSettings__Enabled=true
SmtpSettings__Username=ваш@gmail.com
SmtpSettings__Password=пароль_приложения
```

---

## Шаг 2 (альтернатива). Только Docker локально

Проверка перед облаком:

```powershell
cd D:\+Vibe_site
docker build -t vibe-site .
docker run -p 8080:10000 -e PORT=10000 `
  -e ConnectionStrings__DefaultConnection="Host=host.docker.internal;..." `
  -e SiteUrl=http://localhost:8080 `
  -e Jwt__Key=ваш_ключ_32_символа `
  vibe-site
```

Сайт: http://localhost:8080

---

## Чеклист в день защиты

- [ ] Открыть ссылку Render за 3 минуты до выступления
- [ ] Вкладки: `/`, `/concerts`, `/event/1`, `/profile`, `/admin`, `/verify`
- [ ] Текст речи: `docs/ZASHCHITA_GEK_7MIN.pdf`
- [ ] Локальный запасной план: `dotnet run` в `backend` + `npm run dev` в `front`

---

## Стоимость

| Сервис | Тариф |
|--------|-------|
| Neon PostgreSQL | Free (0.5 GB) |
| Render Web Service | Free (750 ч/мес, sleep) |
| Groq API | Free tier |
| **Итого** | **0 BYN/мес** для демонстрации |
