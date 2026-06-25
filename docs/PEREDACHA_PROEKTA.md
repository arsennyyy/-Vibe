# Передача проекта +Vibe другу (GitHub + БД + Ollama)

Инструкция в двух частях: **для вас** (отправитель) и **для друга** (получатель).

---

## Часть A. Для вас — залить на GitHub и передать БД

### A1. Подготовка репозитория (один раз)

1. Установите [Git](https://git-scm.com/) и [GitHub CLI](https://cli.github.com/) (`gh`).

2. **Не заливайте секреты.** Перед push проверьте `MyMvcBackend/appsettings.json`:
   - пароль PostgreSQL;
   - пароль Gmail (SMTP);
   - JWT Key.
   
   Для друга оставьте шаблон `MyMvcBackend/appsettings.Example.json`. Свои секреты можно хранить локально в `appsettings.Development.json` (он не обязан попадать в git).

3. В корне проекта:

```powershell
cd D:\+Vibe_site

git init
git add .
git status
```

Убедитесь, что **не** попадают: `node_modules/`, `bin/`, `obj/`, `MyMvcBackend/wwwroot/uploads/` (большие файлы).

4. Первый коммит:

```powershell
git commit -m "Initial commit: +Vibe diploma project"
```

### A2. Создать репозиторий на GitHub

**Вариант 1 — через сайт**

1. [github.com/new](https://github.com/new) → имя, например `vibe-tickets`.
2. Private или Public — как удобно.
3. **Не** добавляйте README (у вас уже есть код).

**Вариант 2 — через CLI**

```powershell
gh auth login
gh repo create vibe-tickets --private --source=. --remote=origin --push
```

Если репозиторий уже создан вручную:

```powershell
git remote add origin https://github.com/ВАШ_ЛОГИН/vibe-tickets.git
git branch -M main
git push -u origin main
```

### A3. Доступ другу «по ссылке»

**Приватный репозиторий (рекомендуется):**

1. GitHub → репозиторий → **Settings** → **Collaborators** → **Add people**.
2. Введите GitHub-логин или email друга → роль **Read** (только смотреть) или **Write** (если будет править).
3. Друг получит приглашение на почту и увидит репозиторий.

**Публичный репозиторий:**

- Достаточно ссылки: `https://github.com/ВАШ_ЛОГИН/vibe-tickets`

**Не делитесь** паролями в чате — передайте их отдельно (Telegram «секретный чат», лично).

### A4. Экспорт базы данных PostgreSQL

На **вашем** ПК (PostgreSQL должен быть запущен):

```powershell
$env:PGPASSWORD = "asdfasdf"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" `
  -h localhost -U postgres -d postgres `
  -F c -f "D:\+Vibe_site\vibe_db_backup.dump"
```

Файл `vibe_db_backup.dump` передайте другу:
- через Google Drive / Яндекс.Диск;
- или положите в репозиторий **не стоит** (тяжёлый + личные данные).

**После очистки БД** (скрипт `CLEAR_DATABASE_KEEP_ADMIN.sql`) дамп будет маленьким — только ваш админ-аккаунт и пустые таблицы. FAQ и фильтры подтянутся при первом запуске бэкенда.

### A5. Очистка БД перед передачей (опционально)

```powershell
# Остановите dotnet run, затем:
$env:PGPASSWORD = "asdfasdf"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
  -h localhost -U postgres -d postgres `
  -f "D:\+Vibe_site\CLEAR_DATABASE_KEEP_ADMIN.sql"
```

Останется только `bykovarsenij8@gmail.com` с правами админа.

### A6. Что ещё передать другу

| Что | Как |
|-----|-----|
| Ссылка на GitHub | `https://github.com/.../vibe-tickets` |
| Дамп БД | `vibe_db_backup.dump` |
| Пароль postgres | лично |
| Gmail SMTP (если нужна почта) | пароль приложения — опционально |
| Google OAuth ClientId | из Google Cloud Console — опционально |

---

## Часть B. Для друга — развернуть на ноутбуке

### B1. Что установить

| Программа | Версия | Ссылка |
|-----------|--------|--------|
| Git | любая | https://git-scm.com/ |
| Node.js | 18+ | https://nodejs.org/ |
| .NET SDK | 8.0 | https://dotnet.microsoft.com/download |
| PostgreSQL | 16/17 | https://www.postgresql.org/download/windows/ |
| Ollama | последняя | https://ollama.com/download |

При установке PostgreSQL запомните пароль пользователя `postgres`.

### B2. Скачать проект с GitHub

```powershell
cd C:\Projects
git clone https://github.com/ВАШ_ЛОГИН/vibe-tickets.git
cd vibe-tickets
```

Если репозиторий приватный — друг должен принять приглашение Collaborator и войти:

```powershell
gh auth login
git clone https://github.com/ВАШ_ЛОГИН/vibe-tickets.git
```

### B3. Настроить базу данных

1. Создайте БД (если используете отдельную, не `postgres`):

```sql
-- в psql или pgAdmin:
CREATE DATABASE vibe;
```

2. Восстановите дамп (путь к файлу, который вы прислали):

```powershell
$env:PGPASSWORD = "ПАРОЛЬ_POSTGRES"
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" `
  -h localhost -U postgres -d postgres `
  --clean --if-exists `
  "C:\путь\к\vibe_db_backup.dump"
```

Если ошибки «already exists» — часто можно игнорировать; проверьте вход на сайт.

3. Скопируйте настройки:

```powershell
copy MyMvcBackend\appsettings.Example.json MyMvcBackend\appsettings.json
```

Отредактируйте `appsettings.json`:
- `ConnectionStrings:DefaultConnection` — пароль postgres;
- `Jwt:Key` — любая длинная строка ≥32 символов;
- `SmtpSettings:Enabled` — `false`, если почта не нужна;
- `Ai` — оставьте как в примере (Ollama).

### B4. Ollama (чат поддержки с ИИ)

```powershell
ollama pull llama3.2
ollama serve
```

В другом терминале проверка:

```powershell
curl http://localhost:11434/api/tags
```

В `appsettings.json` должно быть:

```json
"Ai": {
  "Provider": "openai",
  "BaseUrl": "http://localhost:11434/v1",
  "ApiKey": "ollama",
  "Model": "llama3.2"
}
```

Ollama должна работать **пока открыт сайт**, иначе чат ответит ошибкой.

### B5. Запуск проекта

**Терминал 1 — бэкенд:**

```powershell
cd C:\Projects\vibe-tickets\MyMvcBackend
dotnet restore
dotnet run
```

Должно появиться: `Now listening on: http://localhost:5064`

**Терминал 2 — фронт:**

```powershell
cd C:\Projects\vibe-tickets\MyFront
npm install
npm run dev
```

Открыть: **http://localhost:5173**

### B6. Вход

- Если в дампе есть ваш админ: `bykovarsenij8@gmail.com` + ваш пароль.
- Или зарегистрироваться заново и в pgAdmin:

```sql
UPDATE users SET isadmin = true WHERE email = 'email_друга@gmail.com';
```

Админка: **http://localhost:5173/admin-signin**

### B7. Типичные проблемы

| Проблема | Решение |
|----------|---------|
| API 500 | Проверить, запущен ли PostgreSQL и верный ли пароль в appsettings |
| CORS | Фронт только с `localhost:5173` |
| Чат не отвечает | `ollama serve` + `ollama pull llama3.2` |
| Письма не уходят | `SmtpSettings:Enabled: false` или свой Gmail + пароль приложения |
| Нет картинок событий | Папка `MyMvcBackend/wwwroot/uploads` — после clone пустая; загрузите обложки заново |

---

## Краткий чеклист

**Вы:**
- [ ] Очистить БД (`CLEAR_DATABASE_KEEP_ADMIN.sql`) или оставить демо-данные
- [ ] `pg_dump` → файл `.dump`
- [ ] Убрать секреты из git / использовать Example
- [ ] `git push` на GitHub
- [ ] Пригласить друга Collaborator
- [ ] Передать `.dump` + пароли отдельно

**Друг:**
- [ ] Git clone
- [ ] PostgreSQL + `pg_restore`
- [ ] `appsettings.json` из Example
- [ ] Ollama + `llama3.2`
- [ ] `dotnet run` + `npm run dev`
- [ ] Открыть localhost:5173
