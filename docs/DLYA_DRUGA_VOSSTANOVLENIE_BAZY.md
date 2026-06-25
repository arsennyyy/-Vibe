# Восстановление базы данных PostgreSQL (для друга)

Пошагово: куда нажимать в **pgAdmin** и какие **логины/пароли** вводить.

---

## Данные для подключения (от Арсения)

Используй **те же значения** при установке PostgreSQL и в `backend/appsettings.json`:

| Параметр | Значение |
|----------|----------|
| **Хост** | `localhost` |
| **Порт** | `5432` |
| **Имя базы** | `postgres` |
| **Пользователь** | `postgres` |
| **Пароль postgres** | `asdfasdf` |

**Админ сайта после восстановления дампа:**

| | |
|--|--|
| Email | `bykovarsenij8@gmail.com` |
| Вход | OTP-код на почту (если SMTP работает) или как настроено у Арсения |

**JWT и прочее** уже лежат в `backend/appsettings.json` в репозитории — **не меняй**, если Арсений не сказал иначе.

---

## Шаг 1. Установить PostgreSQL

1. Скачай: https://www.postgresql.org/download/windows/  
2. Запусти установщик **EDB PostgreSQL**  
3. **Installation Directory** — по умолчанию  
4. Компоненты: отметь **PostgreSQL Server**, **pgAdmin 4**, **Command Line Tools**  
5. **Data Directory** — по умолчанию  
6. **Password** для суперпользователя `postgres` → введи: **`asdfasdf`** (как в таблице выше)  
7. **Port:** `5432`  
8. **Locale** — Default  
9. Дождись окончания, **Finish**

Проверка: в меню Пуск появились **pgAdmin 4** и **SQL Shell (psql)**.

---

## Шаг 2. Положить файл дампа

Скопируй файл от Арсения, например:

`C:\Projects\vibe_db_backup.dump`

(имя может быть любым, запомни путь)

---

## Шаг 3. Восстановить дамп через pgAdmin

### 3.1. Подключиться к серверу

1. Открой **pgAdmin 4**  
2. При первом запуске задай **Master Password** для pgAdmin (любой, это только для pgAdmin)  
3. Слева в дереве: **Servers**  
4. Если сервера нет: правый клик **Servers** → **Register** → **Server…**  
   - **General → Name:** `Local PostgreSQL`  
   - **Connection → Host:** `localhost`  
   - **Port:** `5432`  
   - **Maintenance database:** `postgres`  
   - **Username:** `postgres`  
   - **Password:** `asdfasdf`  
   - Включи **Save password** → **Save**  
5. Если сервер уже есть (PostgreSQL 17): кликни по нему → введи пароль **`asdfasdf`**

### 3.2. Restore (восстановление)

1. Раскрой сервер → **Databases**  
2. Правый клик по базе **`postgres`** → **Restore…**  
3. Вкладка **General:**  
   - **Format:** `Custom or tar`  
   - **Filename:** кнопка **…** → выбери `vibe_db_backup.dump`  
   - **Role name:** `postgres`  
4. Вкладка **Data Options:**  
   - **Sections:** всё включено  
   - **Type of objects:** по умолчанию  
5. Вкладка **Query Options:**  
   - Можно включить **Clean before restore** (если база не пустая и были ошибки)  
6. Нажми **Restore**  
7. Внизу в **Processes** дождись зелёной галочки **Successfully completed**

### 3.3. Если были жёлтые предупреждения

Сообщения вида `already exists` часто **не критичны**. Проверь:

1. В pgAdmin: **postgres** → **Schemas** → **public** → **Tables**  
2. Должны быть таблицы: `users`, `events`, `seats`, `orders` и др.  
3. Правый клик **users** → **View/Edit Data** → **All Rows** — должна быть строка с `bykovarsenij8@gmail.com`

---

## Шаг 4. Восстановление через PowerShell (если pgAdmin не сработал)

```powershell
$env:PGPASSWORD = "asdfasdf"
& "C:\Program Files\PostgreSQL\17\bin\pg_restore.exe" `
  -h localhost -U postgres -d postgres `
  --clean --if-exists `
  "C:\Projects\vibe_db_backup.dump"
```

Путь к `pg_restore.exe` замени на свой (16 или 17). Путь к `.dump` — где лежит файл.

---

## Шаг 5. Проверить `appsettings.json`

Открой `backend/appsettings.json` в проекте. Строка подключения должна быть:

```json
"DefaultConnection": "Host=localhost;Port=5432;Database=postgres;Username=postgres;Password=asdfasdf"
```

Если у тебя другой пароль postgres при установке — поменяй только `Password=...` здесь.

---

## Шаг 6. Запустить бэкенд и проверить

```powershell
cd C:\Projects\vibe-diploma\backend
dotnet run
```

В логах должно быть: `Успешное подключение к PostgreSQL!`

Сайт: http://localhost:5173 (фронт запускается отдельно — см. `docs/DLYA_DRUGA.md`).

---

## Частые ошибки

| Ошибка | Что делать |
|--------|------------|
| `password authentication failed` | Пароль postgres не `asdfasdf` — исправь в appsettings или переустанови |
| `connection refused` | Служба PostgreSQL не запущена: **Win+R** → `services.msc` → **postgresql-x64-17** → **Запустить** |
| Пустой каталог событий | Дамп был после очистки — перезапусти бэкенд, подтянутся demo-seed события |
| pg_restore: errors | Попробуй Restore в pgAdmin с **Clean before restore** |
