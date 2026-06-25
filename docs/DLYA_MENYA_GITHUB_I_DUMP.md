# Инструкция для тебя: GitHub + дамп PostgreSQL для друга

Заливаем **весь проект как есть** (включая `appsettings.json` и загрузки). Репозиторий **приватный**, друг заходит **только по твоей ссылке-приглашению**.

---

## Часть 1. Залить проект на GitHub

### 1.1. Установить Git (если нет)

Скачать: https://git-scm.com/download/win  
Установить с настройками по умолчанию.

Опционально GitHub CLI: https://cli.github.com/

### 1.2. Создать репозиторий на сайте

1. Открой https://github.com/new  
2. **Repository name:** `vibe-diploma` (или любое)  
3. **Private** — включить  
4. **НЕ** ставить галочки «Add README», «Add .gitignore»  
5. **Create repository**  
6. Скопируй URL вида `https://github.com/ТВОЙ_ЛОГИН/vibe-diploma.git`

### 1.3. Команды в PowerShell (из корня проекта)

```powershell
cd D:\+Vibe_site

git init
git branch -M main

# Если раньше не коммитил — добавляем ВСЁ (секреты тоже, репо приватный)
git add -A
git status

git commit -m "Initial commit: +Vibe diploma project"
```

Привязать удалённый репозиторий и отправить:

```powershell
git remote add origin https://github.com/ТВОЙ_ЛОГИН/vibe-diploma.git
git push -u origin main
```

Если Git спросит логин — используй **Personal Access Token** вместо пароля:  
GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Generate new token (classic)** → права `repo`.

### 1.4. Дать другу доступ по ссылке

1. Открой свой репозиторий на GitHub  
2. **Settings** (вкладка репозитория)  
3. Слева **Collaborators** → **Add people**  
4. Введи **GitHub-логин или email друга**  
5. Роль: **Read** (только скачать) или **Write** (если будет править)  
6. **Add to repository**  
7. Друг получит письмо — должен **Accept invitation**  
8. Скинь ему ссылку: `https://github.com/ТВОЙ_ЛОГИН/vibe-diploma`

### 1.5. Обновлять проект позже

```powershell
cd D:\+Vibe_site
git add -A
git commit -m "Описание изменений"
git push
```

---

## Часть 2. Сделать дамп PostgreSQL и отправить другу

**Твои данные БД (другу тоже понадобятся при восстановлении):**

| Параметр | Значение |
|----------|----------|
| Хост | `localhost` |
| Порт | `5432` |
| База | `postgres` |
| Пользователь | `postgres` |
| Пароль | `asdfasdf` |

### 2.1. Через pgAdmin (по кнопкам)

1. Запусти **pgAdmin 4** (установился с PostgreSQL)  
2. Слева: **Servers** → **PostgreSQL 17** (или 16)  
3. Введи мастер-пароль pgAdmin (если спросит)  
4. Раскрой сервер → введи пароль `postgres`: **`asdfasdf`**  
5. Правый клик по базе **`postgres`** → **Backup…**  
6. Вкладка **General:**  
   - **Filename:** `D:\+Vibe_site\vibe_db_backup.dump`  
   - **Format:** **Custom**  
7. Вкладка **Data Options:** оставь по умолчанию (все галочки на данных)  
8. **Backup** → дождись «Successfully completed»  
9. Файл `vibe_db_backup.dump` отправь другу: Telegram, Google Drive, флешка

### 2.2. Через PowerShell (альтернатива)

Останови бэкенд (`Ctrl+C` в терминале с `dotnet run`), затем:

```powershell
$env:PGPASSWORD = "asdfasdf"
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" `
  -h localhost -U postgres -d postgres `
  -F c -f "D:\+Vibe_site\vibe_db_backup.dump"
```

Если PostgreSQL 16 — путь `...\PostgreSQL\16\bin\pg_dump.exe`.

### 2.3. (Опционально) Очистить БД перед дампом

Оставит только админа `bykovarsenij8@gmail.com`:

```powershell
$env:PGPASSWORD = "asdfasdf"
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" `
  -h localhost -U postgres -d postgres `
  -f "D:\+Vibe_site\CLEAR_DATABASE_KEEP_ADMIN.sql"
```

Потом снова сделай Backup (п. 2.1).

### 2.4. Что отправить другу

| Что | Куда |
|-----|------|
| Ссылка на GitHub (после Accept invitation) | сообщение |
| Файл `vibe_db_backup.dump` | облако / флешка |
| Файл `docs/DLYA_DRUGA.md` | можно просто сказать «читай в репо» |
| Файл `docs/DLYA_DRUGA_VOSSTANOVLENIE_BAZY.md` | там все пароли и pgAdmin пошагово |

---

## Часть 3. Быстрый чеклист

- [ ] `git push` на GitHub (приватный репо)  
- [ ] Друг добавлен в **Collaborators**, принял приглашение  
- [ ] Сделан `vibe_db_backup.dump`  
- [ ] Дамп отправлен другу отдельно от GitHub  
- [ ] Другу скинул ссылку на репозиторий  
