# Инструкция для друга: скачать +Vibe с GitHub и запустить

Арсений дал тебе **ссылку на приватный репозиторий** и файл **`vibe_db_backup.dump`**.  
Сначала прими приглашение на GitHub (письмо **Accept invitation**).

---

## Что установить (ссылки)

| Программа | Зачем | Скачать |
|-----------|-------|---------|
| **Git** | Клонировать проект | https://git-scm.com/download/win |
| **Node.js 20 LTS** | Фронтенд | https://nodejs.org/ |
| **.NET SDK 8** | Бэкенд | https://dotnet.microsoft.com/download/dotnet/8.0 |
| **PostgreSQL 17** | База данных | https://www.postgresql.org/download/windows/ |
| **Ollama** | ИИ-чат поддержки | https://ollama.com/download/windows |

При установке PostgreSQL пароль пользователя **`postgres`** задай: **`asdfasdf`** (как у Арсения).  
Порт: **`5432`**. Компонент **pgAdmin 4** — включить.

---

## 1. Скачать проект с GitHub

```powershell
cd C:\Projects
git clone https://github.com/ЛОГИН_АРСЕНИЯ/vibe-diploma.git
cd vibe-diploma
```

Если `git clone` просит логин — войди в GitHub (браузер или токен).

---

## 2. Восстановить базу данных

**Подробно с картинками кнопок pgAdmin:** см. файл  
👉 **`docs/DLYA_DRUGA_VOSSTANOVLENIE_BAZY.md`**

Кратко: pgAdmin → база `postgres` → Restore → файл `.dump` от Арсения.

Пароль postgres: **`asdfasdf`**

---

## 3. Ollama (чат с ИИ)

```powershell
ollama pull llama3.2
```

Ollama обычно стартует сам в трее Windows. Проверка:

```powershell
curl http://localhost:11434/api/tags
```

В `backend/appsettings.json` уже настроено:

```json
"Ai": {
  "Provider": "openai",
  "BaseUrl": "http://localhost:11434/v1",
  "ApiKey": "ollama",
  "Model": "llama3.2"
}
```

Пока Ollama запущена — чат на сайте отвечает. Иначе будет текст «ИИ временно недоступен».

---

## 4. Запуск проекта (два терминала)

**Терминал 1 — бэкенд:**

```powershell
cd C:\Projects\vibe-diploma\backend
dotnet restore
dotnet run
```

Ждёшь: `Now listening on: http://localhost:5064`

**Терминал 2 — фронт:**

```powershell
cd C:\Projects\vibe-diploma\front
npm install
npm run dev
```

Открыть в браузере: **http://localhost:5173**

---

## 5. Входы

| Роль | Как |
|------|-----|
| **Админ** | http://localhost:5173/admin-signin → `bykovarsenij8@gmail.com` + OTP на почту |
| **Обычный пользователь** | Регистрация на `/signup` |
| **Организатор** | Админ назначает в `/admin` → Пользователи |

---

## 6. Если что-то сломалось

| Проблема | Решение |
|----------|---------|
| API не отвечает | Бэкенд запущен? PostgreSQL запущен? |
| 500 на API | Пароль в `appsettings.json` = `asdfasdf` |
| Нет событий в каталоге | Перезапусти `dotnet run` — создадутся демо-события |
| Чат молчит | `ollama pull llama3.2`, перезапусти Ollama |
| CORS | Фронт только с `localhost:5173` |

Вопросы — Арсению. В репозитории полный код и настройки в `backend/appsettings.json`.
