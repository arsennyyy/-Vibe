# Описание структуры базы данных VibeSiteDB
## Для создания концептуальной, логической и физической схем

---

# 1. КОНЦЕПТУАЛЬНАЯ СХЕМА БД (Conceptual Schema)

## Описание
Концептуальная схема представляет высокоуровневое представление предметной области без деталей реализации. Показывает основные сущности и их взаимосвязи.

## Сущности и их атрибуты

### 1. ПОЛЬЗОВАТЕЛЬ (User)
**Описание:** Зарегистрированный пользователь системы
**Атрибуты:**
- Идентификатор пользователя
- Имя
- Email (уникальный)
- Хеш пароля
- Статус верификации email
- Токен верификации
- Дата истечения токена
- Дата регистрации
- Дата последнего обновления

### 2. СОБЫТИЕ (Event)
**Описание:** Мероприятие/концерт, на которое продаются билеты
**Атрибуты:**
- Идентификатор события
- Название
- Изображение
- Дата проведения
- Время начала
- Место проведения
- Адрес
- Цена (диапазон)
- Категория
- Описание
- Тип события
- Состав исполнителей (JSON)
- Признак избранного события

### 3. ТИП БИЛЕТА (TicketType)
**Описание:** Различные категории билетов для события (VIP, Стандарт, Партер)
**Атрибуты:**
- Идентификатор типа
- Название типа
- Цена
- Доступность
- Связь с событием

### 4. МЕСТО (Seat)
**Описание:** Конкретное место в зале для события
**Атрибуты:**
- Идентификатор места
- Связь с событием
- Ряд
- Номер места
- Статус (доступно, зарезервировано, продано)
- Тип места (стандарт, VIP, для инвалидов)
- Цена места
- Пользователь, зарезервировавший место (опционально)
- Время истечения резервации (опционально)

### 5. БИЛЕТ ПОЛЬЗОВАТЕЛЯ (UserTicket)
**Описание:** Купленный билет пользователя
**Атрибуты:**
- Идентификатор билета
- Пользователь-владелец
- Событие
- Место
- Тип билета
- Цена покупки
- Дата покупки
- Дата события
- QR-код билета
- Статус использования

### 6. ЗАКАЗ (Order)
**Описание:** Группа билетов, объединенных в один заказ
**Атрибуты:**
- Идентификатор заказа
- Пользователь
- Уникальный номер заказа
- Общая сумма заказа
- Статус заказа (ожидает оплаты, оплачен, отменен, возвращен)
- Дата создания
- Дата завершения (опционально)

### 7. ПЛАТЕЖ (Payment)
**Описание:** Информация о платеже по заказу
**Атрибуты:**
- Идентификатор платежа
- Заказ
- Пользователь
- Сумма платежа
- Способ оплаты (карта, банковский перевод, электронный кошелек)
- Статус платежа (ожидает, завершен, неудачен, возвращен)
- ID транзакции от платежной системы (опционально)
- Дополнительная информация о платеже (опционально)
- Дата создания
- Дата завершения (опционально)

### 8. ОТЗЫВ (Review)
**Описание:** Отзыв пользователя о событии
**Атрибуты:**
- Идентификатор отзыва
- Пользователь-автор
- Событие
- Оценка (1-5)
- Комментарий (опционально)
- Дата создания
- Дата обновления (опционально)
- Статус модерации

### 9. УВЕДОМЛЕНИЕ (Notification)
**Описание:** Уведомление для пользователя
**Атрибуты:**
- Идентификатор уведомления
- Пользователь-получатель
- Заголовок
- Текст сообщения
- Тип уведомления (информация, предупреждение, успех, ошибка, напоминание)
- Статус прочтения
- Дата создания
- Дата прочтения (опционально)
- Связанное событие (опционально)
- Связанный билет (опционально)

### 10. СООБЩЕНИЕ КОНТАКТА (ContactMessage)
**Описание:** Сообщение из формы обратной связи
**Атрибуты:**
- Идентификатор сообщения
- Имя отправителя
- Email отправителя
- Текст сообщения
- Статус обработки (новое, в работе, решено, архивировано)
- Дата получения
- Дата решения (опционально)
- Ответ администратора (опционально)
- Администратор, ответивший (опционально)

## Связи между сущностями (Концептуальный уровень)

1. **ПОЛЬЗОВАТЕЛЬ → ЗАКАЗЫ** (1:N)
   - Один пользователь может иметь множество заказов
   - Тип связи: Один ко многим

2. **ПОЛЬЗОВАТЕЛЬ → БИЛЕТЫ** (1:N)
   - Один пользователь может купить множество билетов
   - Тип связи: Один ко многим

3. **ПОЛЬЗОВАТЕЛЬ → ПЛАТЕЖИ** (1:N)
   - Один пользователь может совершить множество платежей
   - Тип связи: Один ко многим

4. **ПОЛЬЗОВАТЕЛЬ → ОТЗЫВЫ** (1:N)
   - Один пользователь может оставить множество отзывов
   - Тип связи: Один ко многим
   - Ограничение: Один пользователь может оставить только один отзыв на одно событие

5. **ПОЛЬЗОВАТЕЛЬ → УВЕДОМЛЕНИЯ** (1:N)
   - Один пользователь может получить множество уведомлений
   - Тип связи: Один ко многим

6. **ПОЛЬЗОВАТЕЛЬ → РЕЗЕРВАЦИИ МЕСТ** (1:N)
   - Один пользователь может зарезервировать множество мест
   - Тип связи: Один ко многим (опциональная связь)

7. **СОБЫТИЕ → ТИПЫ БИЛЕТОВ** (1:N)
   - Одно событие может иметь множество типов билетов
   - Тип связи: Один ко многим

8. **СОБЫТИЕ → МЕСТА** (1:N)
   - Одно событие может иметь множество мест
   - Тип связи: Один ко многим

9. **СОБЫТИЕ → БИЛЕТЫ** (1:N)
   - Одно событие может иметь множество проданных билетов
   - Тип связи: Один ко многим

10. **СОБЫТИЕ → ОТЗЫВЫ** (1:N)
    - Одно событие может иметь множество отзывов
    - Тип связи: Один ко многим

11. **СОБЫТИЕ → УВЕДОМЛЕНИЯ** (1:N, опционально)
    - Одно событие может быть связано с множеством уведомлений
    - Тип связи: Один ко многим (опциональная связь)

12. **ЗАКАЗ → ПЛАТЕЖИ** (1:N)
    - Один заказ может иметь множество платежей (например, частичная оплата)
    - Тип связи: Один ко многим

13. **МЕСТО → БИЛЕТ** (1:1)
    - Одно место может быть связано с одним билетом
    - Тип связи: Один к одному

14. **БИЛЕТ → УВЕДОМЛЕНИЯ** (1:N, опционально)
    - Один билет может быть связан с множеством уведомлений
    - Тип связи: Один ко многим (опциональная связь)

---

# 2. ЛОГИЧЕСКАЯ СХЕМА БД (Logical Schema)

## Описание
Логическая схема представляет детальную структуру данных с указанием таблиц, полей, типов данных, ограничений и связей, но без физических деталей реализации.

## Таблицы и их структура

### Таблица: Users
**Назначение:** Хранение информации о пользователях системы

| Поле | Тип данных | Ограничения | Описание |
|------|-----------|-------------|----------|
| Id | INT | PRIMARY KEY, IDENTITY(1,1) | Уникальный идентификатор |
| Name | NVARCHAR(100) | NOT NULL | Имя пользователя |
| Email | NVARCHAR(100) | NOT NULL, UNIQUE | Email адрес (уникальный) |
| PasswordHash | NVARCHAR(100) | NOT NULL | Хеш пароля |
| EmailVerified | BIT | NOT NULL, DEFAULT 0 | Статус верификации email |
| VerificationToken | NVARCHAR(500) | NULL | Токен для верификации |
| TokenExpiresAt | DATETIME2 | NULL | Дата истечения токена |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Дата регистрации |
| UpdatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Дата последнего обновления |

**Индексы:**
- UNIQUE INDEX на Email

### Таблица: Events
**Назначение:** Хранение информации о событиях/мероприятиях

| Поле | Тип данных | Ограничения | Описание |
|------|-----------|-------------|----------|
| Id | INT | PRIMARY KEY, IDENTITY(1,1) | Уникальный идентификатор |
| Title | NVARCHAR(500) | NOT NULL | Название события |
| Image | NVARCHAR(1000) | NOT NULL | Путь к изображению |
| Date | DATETIME2 | NOT NULL | Дата проведения |
| Time | NVARCHAR(50) | NOT NULL | Время начала |
| Location | NVARCHAR(500) | NOT NULL | Место проведения |
| Address | NVARCHAR(1000) | NOT NULL | Адрес |
| Price | NVARCHAR(100) | NOT NULL | Цена (может быть диапазон) |
| Category | NVARCHAR(100) | NULL | Категория события |
| Description | NVARCHAR(MAX) | NOT NULL | Описание |
| EventType | NVARCHAR(100) | NOT NULL | Тип события |
| Lineup | NVARCHAR(MAX) | NOT NULL | Состав исполнителей (JSON) |
| IsFeatured | BIT | NOT NULL, DEFAULT 0 | Признак избранного |

**Индексы:**
- INDEX на Date
- INDEX на IsFeatured

### Таблица: TicketTypes
**Назначение:** Типы билетов для событий

| Поле | Тип данных | Ограничения | Описание |
|------|-----------|-------------|----------|
| Id | INT | PRIMARY KEY, IDENTITY(1,1) | Уникальный идентификатор |
| Name | NVARCHAR(200) | NOT NULL | Название типа |
| Price | DECIMAL(18,2) | NOT NULL | Цена билета |
| Available | BIT | NOT NULL, DEFAULT 1 | Доступность |
| EventId | INT | NOT NULL, FOREIGN KEY → Events.Id | Связь с событием |

**Связи:**
- FOREIGN KEY (EventId) REFERENCES Events(Id) ON DELETE CASCADE

**Индексы:**
- INDEX на EventId

### Таблица: Seats
**Назначение:** Места в зале для событий

| Поле | Тип данных | Ограничения | Описание |
|------|-----------|-------------|----------|
| Id | INT | PRIMARY KEY, IDENTITY(1,1) | Уникальный идентификатор |
| EventId | INT | NOT NULL, FOREIGN KEY → Events.Id | Связь с событием |
| Row | NVARCHAR(50) | NOT NULL | Ряд |
| Number | INT | NOT NULL | Номер места |
| Status | NVARCHAR(50) | NOT NULL, DEFAULT 'available' | Статус (available, reserved, sold) |
| Type | NVARCHAR(50) | NOT NULL, DEFAULT 'standard' | Тип (standard, vip, disabled) |
| Price | DECIMAL(18,2) | NOT NULL | Цена места |
| ReservedByUserId | INT | NULL, FOREIGN KEY → Users.Id | Пользователь, зарезервировавший |
| ReservationExpiresAt | DATETIME2 | NULL | Время истечения резервации |

**Связи:**
- FOREIGN KEY (EventId) REFERENCES Events(Id) ON DELETE CASCADE
- FOREIGN KEY (ReservedByUserId) REFERENCES Users(Id) ON DELETE SET NULL

**Индексы:**
- INDEX на EventId
- INDEX на ReservedByUserId
- INDEX на Status

### Таблица: UserTickets
**Назначение:** Купленные билеты пользователей

| Поле | Тип данных | Ограничения | Описание |
|------|-----------|-------------|----------|
| Id | INT | PRIMARY KEY, IDENTITY(1,1) | Уникальный идентификатор |
| UserId | INT | NOT NULL, FOREIGN KEY → Users.Id | Пользователь-владелец |
| EventId | INT | NOT NULL, FOREIGN KEY → Events.Id | Событие |
| SeatId | INT | NOT NULL, FOREIGN KEY → Seats.Id | Место |
| TicketType | NVARCHAR(200) | NOT NULL | Тип билета |
| Price | DECIMAL(18,2) | NOT NULL | Цена покупки |
| PurchaseDate | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Дата покупки |
| EventDate | DATETIME2 | NOT NULL | Дата события |
| QrCode | NVARCHAR(1000) | NOT NULL | QR-код билета |
| IsUsed | BIT | NOT NULL, DEFAULT 0 | Статус использования |

**Связи:**
- FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
- FOREIGN KEY (EventId) REFERENCES Events(Id) ON DELETE CASCADE
- FOREIGN KEY (SeatId) REFERENCES Seats(Id) ON DELETE CASCADE

**Индексы:**
- INDEX на UserId
- INDEX на EventId
- INDEX на SeatId

### Таблица: Orders
**Назначение:** Заказы пользователей

| Поле | Тип данных | Ограничения | Описание |
|------|-----------|-------------|----------|
| Id | INT | PRIMARY KEY, IDENTITY(1,1) | Уникальный идентификатор |
| UserId | INT | NOT NULL, FOREIGN KEY → Users.Id | Пользователь |
| OrderNumber | NVARCHAR(100) | NOT NULL, UNIQUE | Уникальный номер заказа |
| TotalAmount | DECIMAL(18,2) | NOT NULL | Общая сумма заказа |
| Status | NVARCHAR(50) | NOT NULL, DEFAULT 'pending' | Статус (pending, paid, cancelled, refunded) |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Дата создания |
| CompletedAt | DATETIME2 | NULL | Дата завершения |

**Связи:**
- FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE

**Индексы:**
- UNIQUE INDEX на OrderNumber
- INDEX на UserId
- INDEX на Status

### Таблица: Payments
**Назначение:** Платежи по заказам

| Поле | Тип данных | Ограничения | Описание |
|------|-----------|-------------|----------|
| Id | INT | PRIMARY KEY, IDENTITY(1,1) | Уникальный идентификатор |
| OrderId | INT | NOT NULL, FOREIGN KEY → Orders.Id | Заказ |
| UserId | INT | NOT NULL, FOREIGN KEY → Users.Id | Пользователь |
| Amount | DECIMAL(18,2) | NOT NULL | Сумма платежа |
| PaymentMethod | NVARCHAR(100) | NOT NULL | Способ оплаты (card, bank_transfer, e_wallet) |
| Status | NVARCHAR(50) | NOT NULL, DEFAULT 'pending' | Статус (pending, completed, failed, refunded) |
| TransactionId | NVARCHAR(500) | NULL | ID транзакции от платежной системы |
| PaymentDetails | NVARCHAR(MAX) | NULL | Дополнительная информация (JSON) |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Дата создания |
| CompletedAt | DATETIME2 | NULL | Дата завершения |

**Связи:**
- FOREIGN KEY (OrderId) REFERENCES Orders(Id) ON DELETE CASCADE
- FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE

**Индексы:**
- INDEX на OrderId
- INDEX на UserId
- INDEX на Status
- INDEX на TransactionId

### Таблица: Reviews
**Назначение:** Отзывы пользователей о событиях

| Поле | Тип данных | Ограничения | Описание |
|------|-----------|-------------|----------|
| Id | INT | PRIMARY KEY, IDENTITY(1,1) | Уникальный идентификатор |
| UserId | INT | NOT NULL, FOREIGN KEY → Users.Id | Пользователь-автор |
| EventId | INT | NOT NULL, FOREIGN KEY → Events.Id | Событие |
| Rating | INT | NOT NULL, CHECK (1-5) | Оценка от 1 до 5 |
| Comment | NVARCHAR(MAX) | NULL | Текстовый отзыв |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Дата создания |
| UpdatedAt | DATETIME2 | NULL | Дата обновления |
| IsApproved | BIT | NOT NULL, DEFAULT 0 | Статус модерации |

**Связи:**
- FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
- FOREIGN KEY (EventId) REFERENCES Events(Id) ON DELETE CASCADE

**Ограничения:**
- UNIQUE (UserId, EventId) - один пользователь может оставить только один отзыв на событие
- CHECK (Rating >= 1 AND Rating <= 5)

**Индексы:**
- UNIQUE INDEX на (UserId, EventId)
- INDEX на UserId
- INDEX на EventId
- INDEX на IsApproved

### Таблица: Notifications
**Назначение:** Уведомления для пользователей

| Поле | Тип данных | Ограничения | Описание |
|------|-----------|-------------|----------|
| Id | INT | PRIMARY KEY, IDENTITY(1,1) | Уникальный идентификатор |
| UserId | INT | NOT NULL, FOREIGN KEY → Users.Id | Пользователь-получатель |
| Title | NVARCHAR(500) | NOT NULL | Заголовок |
| Message | NVARCHAR(MAX) | NOT NULL | Текст сообщения |
| Type | NVARCHAR(50) | NOT NULL, DEFAULT 'info' | Тип (info, warning, success, error, reminder) |
| IsRead | BIT | NOT NULL, DEFAULT 0 | Статус прочтения |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Дата создания |
| ReadAt | DATETIME2 | NULL | Дата прочтения |
| RelatedEventId | INT | NULL, FOREIGN KEY → Events.Id | Связанное событие |
| RelatedTicketId | INT | NULL, FOREIGN KEY → UserTickets.Id | Связанный билет |

**Связи:**
- FOREIGN KEY (UserId) REFERENCES Users(Id) ON DELETE CASCADE
- FOREIGN KEY (RelatedEventId) REFERENCES Events(Id) ON DELETE SET NULL
- FOREIGN KEY (RelatedTicketId) REFERENCES UserTickets(Id) ON DELETE SET NULL

**Индексы:**
- INDEX на UserId
- INDEX на IsRead
- INDEX на CreatedAt

### Таблица: ContactMessages
**Назначение:** Сообщения из формы обратной связи

| Поле | Тип данных | Ограничения | Описание |
|------|-----------|-------------|----------|
| Id | INT | PRIMARY KEY, IDENTITY(1,1) | Уникальный идентификатор |
| Name | NVARCHAR(100) | NOT NULL | Имя отправителя |
| Email | NVARCHAR(100) | NOT NULL | Email отправителя |
| Message | NVARCHAR(MAX) | NOT NULL | Текст сообщения |
| Status | NVARCHAR(50) | NOT NULL, DEFAULT 'new' | Статус (new, in_progress, resolved, archived) |
| CreatedAt | DATETIME2 | NOT NULL, DEFAULT GETUTCDATE() | Дата получения |
| ResolvedAt | DATETIME2 | NULL | Дата решения |
| Response | NVARCHAR(MAX) | NULL | Ответ администратора |
| RespondedByUserId | INT | NULL | ID администратора, ответившего |

**Индексы:**
- INDEX на Status
- INDEX на CreatedAt
- INDEX на Email

## Логические связи между таблицами

1. **Users → Orders** (1:N)
   - Связь: UserId в Orders → Id в Users
   - Каскадное удаление: CASCADE

2. **Users → UserTickets** (1:N)
   - Связь: UserId в UserTickets → Id в Users
   - Каскадное удаление: CASCADE

3. **Users → Payments** (1:N)
   - Связь: UserId в Payments → Id в Users
   - Каскадное удаление: CASCADE

4. **Users → Reviews** (1:N)
   - Связь: UserId в Reviews → Id in Users
   - Каскадное удаление: CASCADE

5. **Users → Notifications** (1:N)
   - Связь: UserId в Notifications → Id в Users
   - Каскадное удаление: CASCADE

6. **Users → Seats** (1:N, опционально)
   - Связь: ReservedByUserId в Seats → Id в Users
   - Каскадное удаление: SET NULL

7. **Events → TicketTypes** (1:N)
   - Связь: EventId в TicketTypes → Id в Events
   - Каскадное удаление: CASCADE

8. **Events → Seats** (1:N)
   - Связь: EventId в Seats → Id в Events
   - Каскадное удаление: CASCADE

9. **Events → UserTickets** (1:N)
   - Связь: EventId в UserTickets → Id в Events
   - Каскадное удаление: CASCADE

10. **Events → Reviews** (1:N)
    - Связь: EventId в Reviews → Id в Events
    - Каскадное удаление: CASCADE

11. **Events → Notifications** (1:N, опционально)
    - Связь: RelatedEventId в Notifications → Id в Events
    - Каскадное удаление: SET NULL

12. **Orders → Payments** (1:N)
    - Связь: OrderId в Payments → Id в Orders
    - Каскадное удаление: CASCADE

13. **Seats → UserTickets** (1:1)
    - Связь: SeatId в UserTickets → Id в Seats
    - Каскадное удаление: CASCADE

14. **UserTickets → Notifications** (1:N, опционально)
    - Связь: RelatedTicketId в Notifications → Id в UserTickets
    - Каскадное удаление: SET NULL

---

# 3. ФИЗИЧЕСКАЯ СХЕМА БД (Physical Schema)

## Описание
Физическая схема представляет полную реализацию базы данных в SQL Server с указанием всех физических деталей: типы данных, индексы, ограничения, триггеры, статистика и оптимизация.

## СУБД: Microsoft SQL Server
## Версия: SQL Server 2019 и выше
## Кодировка: UTF-8 (NVARCHAR для текстовых полей)

## Детальная структура таблиц

### Таблица: Users
**Схема:** dbo
**Файловая группа:** PRIMARY

```sql
CREATE TABLE [dbo].[Users] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED,
    [Name] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(100) NOT NULL,
    [PasswordHash] NVARCHAR(100) NOT NULL,
    [EmailVerified] BIT NOT NULL DEFAULT 0,
    [VerificationToken] NVARCHAR(500) NULL,
    [TokenExpiresAt] DATETIME2 NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    CONSTRAINT [UQ_Users_Email] UNIQUE NONCLUSTERED ([Email])
);

CREATE NONCLUSTERED INDEX [IX_Users_Email] ON [dbo].[Users]([Email]);
```

**Физические характеристики:**
- PRIMARY KEY: Clustered Index на Id
- UNIQUE CONSTRAINT: Nonclustered Index на Email
- DEFAULT: GETUTCDATE() для CreatedAt и UpdatedAt
- Размер строки: ~400 байт (приблизительно)

### Таблица: Events
**Схема:** dbo
**Файловая группа:** PRIMARY

```sql
CREATE TABLE [dbo].[Events] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED,
    [Title] NVARCHAR(500) NOT NULL,
    [Image] NVARCHAR(1000) NOT NULL,
    [Date] DATETIME2 NOT NULL,
    [Time] NVARCHAR(50) NOT NULL,
    [Location] NVARCHAR(500) NOT NULL,
    [Address] NVARCHAR(1000) NOT NULL,
    [Price] NVARCHAR(100) NOT NULL,
    [Category] NVARCHAR(100) NULL,
    [Description] NVARCHAR(MAX) NOT NULL,
    [EventType] NVARCHAR(100) NOT NULL,
    [Lineup] NVARCHAR(MAX) NOT NULL,
    [IsFeatured] BIT NOT NULL DEFAULT 0
);

CREATE NONCLUSTERED INDEX [IX_Events_Date] ON [dbo].[Events]([Date]);
CREATE NONCLUSTERED INDEX [IX_Events_IsFeatured] ON [dbo].[Events]([IsFeatured]) 
    INCLUDE ([Title], [Date], [Location]);
```

**Физические характеристики:**
- PRIMARY KEY: Clustered Index на Id
- Covering Index на IsFeatured для быстрого поиска избранных событий
- NVARCHAR(MAX) для Description и Lineup (хранится вне строки при >8000 байт)

### Таблица: TicketTypes
**Схема:** dbo
**Файловая группа:** PRIMARY

```sql
CREATE TABLE [dbo].[TicketTypes] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED,
    [Name] NVARCHAR(200) NOT NULL,
    [Price] DECIMAL(18,2) NOT NULL,
    [Available] BIT NOT NULL DEFAULT 1,
    [EventId] INT NOT NULL,
    CONSTRAINT [FK_TicketTypes_Events] FOREIGN KEY ([EventId]) 
        REFERENCES [dbo].[Events]([Id]) ON DELETE CASCADE
);

CREATE NONCLUSTERED INDEX [IX_TicketTypes_EventId] ON [dbo].[TicketTypes]([EventId]) 
    INCLUDE ([Name], [Price], [Available]);
```

**Физические характеристики:**
- FOREIGN KEY с CASCADE DELETE
- Covering Index для быстрого получения типов билетов по событию

### Таблица: Seats
**Схема:** dbo
**Файловая группа:** PRIMARY

```sql
CREATE TABLE [dbo].[Seats] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED,
    [EventId] INT NOT NULL,
    [Row] NVARCHAR(50) NOT NULL,
    [Number] INT NOT NULL,
    [Status] NVARCHAR(50) NOT NULL DEFAULT 'available',
    [Type] NVARCHAR(50) NOT NULL DEFAULT 'standard',
    [Price] DECIMAL(18,2) NOT NULL,
    [ReservedByUserId] INT NULL,
    [ReservationExpiresAt] DATETIME2 NULL,
    CONSTRAINT [FK_Seats_Events] FOREIGN KEY ([EventId]) 
        REFERENCES [dbo].[Events]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Seats_Users] FOREIGN KEY ([ReservedByUserId]) 
        REFERENCES [dbo].[Users]([Id]) ON DELETE SET NULL
);

CREATE NONCLUSTERED INDEX [IX_Seats_EventId] ON [dbo].[Seats]([EventId]) 
    INCLUDE ([Row], [Number], [Status], [Type], [Price]);
CREATE NONCLUSTERED INDEX [IX_Seats_ReservedByUserId] ON [dbo].[Seats]([ReservedByUserId]) 
    WHERE [ReservedByUserId] IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_Seats_Status] ON [dbo].[Seats]([Status]) 
    WHERE [Status] = 'available';
```

**Физические характеристики:**
- Filtered Index на Status для быстрого поиска доступных мест
- Filtered Index на ReservedByUserId для оптимизации запросов по резервациям
- Composite Index на EventId с включенными колонками

### Таблица: UserTickets
**Схема:** dbo
**Файловая группа:** PRIMARY

```sql
CREATE TABLE [dbo].[UserTickets] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED,
    [UserId] INT NOT NULL,
    [EventId] INT NOT NULL,
    [SeatId] INT NOT NULL,
    [TicketType] NVARCHAR(200) NOT NULL,
    [Price] DECIMAL(18,2) NOT NULL,
    [PurchaseDate] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [EventDate] DATETIME2 NOT NULL,
    [QrCode] NVARCHAR(1000) NOT NULL,
    [IsUsed] BIT NOT NULL DEFAULT 0,
    CONSTRAINT [FK_UserTickets_Users] FOREIGN KEY ([UserId]) 
        REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserTickets_Events] FOREIGN KEY ([EventId]) 
        REFERENCES [dbo].[Events]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_UserTickets_Seats] FOREIGN KEY ([SeatId]) 
        REFERENCES [dbo].[Seats]([Id]) ON DELETE CASCADE
);

CREATE NONCLUSTERED INDEX [IX_UserTickets_UserId] ON [dbo].[UserTickets]([UserId]) 
    INCLUDE ([EventId], [EventDate], [IsUsed]);
CREATE NONCLUSTERED INDEX [IX_UserTickets_EventId] ON [dbo].[UserTickets]([EventId]);
CREATE NONCLUSTERED INDEX [IX_UserTickets_SeatId] ON [dbo].[UserTickets]([SeatId]) 
    WHERE [SeatId] IS NOT NULL;
CREATE NONCLUSTERED INDEX [IX_UserTickets_PurchaseDate] ON [dbo].[UserTickets]([PurchaseDate] DESC);
```

**Физические характеристики:**
- Множественные FOREIGN KEY с CASCADE DELETE
- Covering Index на UserId для быстрого получения билетов пользователя
- Descending Index на PurchaseDate для сортировки по дате покупки

### Таблица: Orders
**Схема:** dbo
**Файловая группа:** PRIMARY

```sql
CREATE TABLE [dbo].[Orders] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED,
    [UserId] INT NOT NULL,
    [OrderNumber] NVARCHAR(100) NOT NULL,
    [TotalAmount] DECIMAL(18,2) NOT NULL,
    [Status] NVARCHAR(50) NOT NULL DEFAULT 'pending',
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [CompletedAt] DATETIME2 NULL,
    CONSTRAINT [FK_Orders_Users] FOREIGN KEY ([UserId]) 
        REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
    CONSTRAINT [UQ_Orders_OrderNumber] UNIQUE NONCLUSTERED ([OrderNumber])
);

CREATE NONCLUSTERED INDEX [IX_Orders_UserId] ON [dbo].[Orders]([UserId]) 
    INCLUDE ([Status], [CreatedAt], [TotalAmount]);
CREATE NONCLUSTERED INDEX [IX_Orders_Status] ON [dbo].[Orders]([Status]) 
    WHERE [Status] IN ('pending', 'paid');
CREATE NONCLUSTERED INDEX [IX_Orders_CreatedAt] ON [dbo].[Orders]([CreatedAt] DESC);
```

**Физические характеристики:**
- UNIQUE CONSTRAINT на OrderNumber
- Filtered Index на Status для быстрого поиска активных заказов
- Covering Index на UserId

### Таблица: Payments
**Схема:** dbo
**Файловая группа:** PRIMARY

```sql
CREATE TABLE [dbo].[Payments] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED,
    [OrderId] INT NOT NULL,
    [UserId] INT NOT NULL,
    [Amount] DECIMAL(18,2) NOT NULL,
    [PaymentMethod] NVARCHAR(100) NOT NULL,
    [Status] NVARCHAR(50) NOT NULL DEFAULT 'pending',
    [TransactionId] NVARCHAR(500) NULL,
    [PaymentDetails] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [CompletedAt] DATETIME2 NULL,
    CONSTRAINT [FK_Payments_Orders] FOREIGN KEY ([OrderId]) 
        REFERENCES [dbo].[Orders]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Payments_Users] FOREIGN KEY ([UserId]) 
        REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE
);

CREATE NONCLUSTERED INDEX [IX_Payments_OrderId] ON [dbo].[Payments]([OrderId]);
CREATE NONCLUSTERED INDEX [IX_Payments_UserId] ON [dbo].[Payments]([UserId]) 
    INCLUDE ([Status], [Amount], [CreatedAt]);
CREATE NONCLUSTERED INDEX [IX_Payments_Status] ON [dbo].[Payments]([Status]) 
    WHERE [Status] = 'pending';
CREATE UNIQUE NONCLUSTERED INDEX [IX_Payments_TransactionId] ON [dbo].[Payments]([TransactionId]) 
    WHERE [TransactionId] IS NOT NULL;
```

**Физические характеристики:**
- UNIQUE Filtered Index на TransactionId для предотвращения дубликатов транзакций
- Filtered Index на Status для быстрого поиска незавершенных платежей

### Таблица: Reviews
**Схема:** dbo
**Файловая группа:** PRIMARY

```sql
CREATE TABLE [dbo].[Reviews] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED,
    [UserId] INT NOT NULL,
    [EventId] INT NOT NULL,
    [Rating] INT NOT NULL,
    [Comment] NVARCHAR(MAX) NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NULL,
    [IsApproved] BIT NOT NULL DEFAULT 0,
    CONSTRAINT [FK_Reviews_Users] FOREIGN KEY ([UserId]) 
        REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Reviews_Events] FOREIGN KEY ([EventId]) 
        REFERENCES [dbo].[Events]([Id]) ON DELETE CASCADE,
    CONSTRAINT [UQ_Reviews_User_Event] UNIQUE NONCLUSTERED ([UserId], [EventId]),
    CONSTRAINT [CK_Reviews_Rating] CHECK ([Rating] >= 1 AND [Rating] <= 5)
);

CREATE NONCLUSTERED INDEX [IX_Reviews_UserId] ON [dbo].[Reviews]([UserId]);
CREATE NONCLUSTERED INDEX [IX_Reviews_EventId] ON [dbo].[Reviews]([EventId]) 
    INCLUDE ([Rating], [IsApproved]);
CREATE NONCLUSTERED INDEX [IX_Reviews_IsApproved] ON [dbo].[Reviews]([IsApproved]) 
    WHERE [IsApproved] = 1;
```

**Физические характеристики:**
- UNIQUE CONSTRAINT на (UserId, EventId) - один отзыв на событие от пользователя
- CHECK CONSTRAINT на Rating (1-5)
- Filtered Index на IsApproved для быстрого получения одобренных отзывов

### Таблица: Notifications
**Схема:** dbo
**Файловая группа:** PRIMARY

```sql
CREATE TABLE [dbo].[Notifications] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED,
    [UserId] INT NOT NULL,
    [Title] NVARCHAR(500) NOT NULL,
    [Message] NVARCHAR(MAX) NOT NULL,
    [Type] NVARCHAR(50) NOT NULL DEFAULT 'info',
    [IsRead] BIT NOT NULL DEFAULT 0,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [ReadAt] DATETIME2 NULL,
    [RelatedEventId] INT NULL,
    [RelatedTicketId] INT NULL,
    CONSTRAINT [FK_Notifications_Users] FOREIGN KEY ([UserId]) 
        REFERENCES [dbo].[Users]([Id]) ON DELETE CASCADE,
    CONSTRAINT [FK_Notifications_Events] FOREIGN KEY ([RelatedEventId]) 
        REFERENCES [dbo].[Events]([Id]) ON DELETE SET NULL,
    CONSTRAINT [FK_Notifications_UserTickets] FOREIGN KEY ([RelatedTicketId]) 
        REFERENCES [dbo].[UserTickets]([Id]) ON DELETE SET NULL
);

CREATE NONCLUSTERED INDEX [IX_Notifications_UserId] ON [dbo].[Notifications]([UserId]) 
    INCLUDE ([IsRead], [CreatedAt], [Type]);
CREATE NONCLUSTERED INDEX [IX_Notifications_IsRead] ON [dbo].[Notifications]([IsRead]) 
    WHERE [IsRead] = 0;
CREATE NONCLUSTERED INDEX [IX_Notifications_CreatedAt] ON [dbo].[Notifications]([CreatedAt] DESC);
```

**Физические характеристики:**
- Filtered Index на IsRead для быстрого получения непрочитанных уведомлений
- Опциональные FOREIGN KEY с SET NULL для RelatedEventId и RelatedTicketId

### Таблица: ContactMessages
**Схема:** dbo
**Файловая группа:** PRIMARY

```sql
CREATE TABLE [dbo].[ContactMessages] (
    [Id] INT IDENTITY(1,1) NOT NULL PRIMARY KEY CLUSTERED,
    [Name] NVARCHAR(100) NOT NULL,
    [Email] NVARCHAR(100) NOT NULL,
    [Message] NVARCHAR(MAX) NOT NULL,
    [Status] NVARCHAR(50) NOT NULL DEFAULT 'new',
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [ResolvedAt] DATETIME2 NULL,
    [Response] NVARCHAR(MAX) NULL,
    [RespondedByUserId] INT NULL
);

CREATE NONCLUSTERED INDEX [IX_ContactMessages_Status] ON [dbo].[ContactMessages]([Status]) 
    WHERE [Status] = 'new';
CREATE NONCLUSTERED INDEX [IX_ContactMessages_CreatedAt] ON [dbo].[ContactMessages]([CreatedAt] DESC);
CREATE NONCLUSTERED INDEX [IX_ContactMessages_Email] ON [dbo].[ContactMessages]([Email]);
```

**Физические характеристики:**
- Filtered Index на Status для быстрого поиска новых сообщений
- Нет FOREIGN KEY на RespondedByUserId (опциональная связь с Users)

## Физические связи (Foreign Keys)

Все связи реализованы через FOREIGN KEY constraints с соответствующими действиями при удалении:

1. **CASCADE DELETE** (каскадное удаление):
   - Events → TicketTypes
   - Events → Seats
   - Events → UserTickets
   - Events → Reviews
   - Users → Orders
   - Users → UserTickets
   - Users → Payments
   - Users → Reviews
   - Users → Notifications
   - Orders → Payments
   - Seats → UserTickets

2. **SET NULL** (установка NULL):
   - Users → Seats (ReservedByUserId)
   - Events → Notifications (RelatedEventId)
   - UserTickets → Notifications (RelatedTicketId)

## Дополнительные физические характеристики

### Статистика и оптимизация
- Автоматическое обновление статистики включено
- AUTO_CREATE_STATISTICS = ON
- AUTO_UPDATE_STATISTICS = ON

### Параметры базы данных
- Recovery Model: FULL (для продакшена) или SIMPLE (для разработки)
- Collation: SQL_Latin1_General_CP1_CI_AS или Cyrillic_General_CI_AS (для поддержки кириллицы)

### Рекомендации по производительности
1. Регулярное обновление статистики: `UPDATE STATISTICS`
2. Перестроение индексов: `ALTER INDEX ... REBUILD`
3. Мониторинг фрагментации индексов
4. Использование Columnstore Index для аналитических запросов (если необходимо)

### Триггеры (опционально)
- Триггер для автоматического обновления UpdatedAt в таблице Users
- Триггер для логирования изменений в критических таблицах

---

## ИТОГОВАЯ СТРУКТУРА

**Всего таблиц:** 10
**Всего индексов:** ~35 (включая PRIMARY KEY и UNIQUE constraints)
**Всего связей (Foreign Keys):** 14

**Основные сущности:**
- Users (Пользователи)
- Events (События)
- Orders (Заказы)
- Payments (Платежи)

**Вспомогательные сущности:**
- TicketTypes (Типы билетов)
- Seats (Места)
- UserTickets (Билеты)
- Reviews (Отзывы)
- Notifications (Уведомления)
- ContactMessages (Сообщения)

---

**Примечание:** Это описание можно использовать для создания диаграмм в любом инструменте моделирования БД (ERWin, PowerDesigner, dbdiagram.io, Draw.io, Lucidchart и т.д.) или для генерации схем через AI.

