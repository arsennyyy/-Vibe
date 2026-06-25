using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;
using MyMvcBackend.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Http.Features;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

// Колонки date/createdat в БД — timestamp without time zone; без этого INSERT с DateTime.UtcNow падает (500).
AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

var builder = WebApplication.CreateBuilder(args);

// =============================================
// ПОДКЛЮЧЕНИЕ К POSTGRESQL
// =============================================

// Добавляем сервисы с PostgreSQL
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // React отправляет camelCase; без этой настройки required-поля Event не заполняются и десериализация падает (500).
        options.JsonSerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        // Event ↔ TicketTypes даёт цикл при ответе Ok(event); без этого клиент получает 500, хотя запись уже в БД (дубликаты при повторном «Сохранить»).
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter(JsonNamingPolicy.CamelCase, allowIntegerValues: true));
    });

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 5 * 1024 * 1024;
});

// Настройка CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var origins = new List<string> { "http://localhost:5173", "http://localhost:5174" };
        var siteUrl = builder.Configuration["SiteUrl"]?.Trim();
        if (!string.IsNullOrEmpty(siteUrl)) origins.Add(siteUrl.TrimEnd('/'));
        var extra = builder.Configuration["Cors:ExtraOrigins"];
        if (!string.IsNullOrWhiteSpace(extra))
            origins.AddRange(extra.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries));
        policy.WithOrigins(origins.Distinct().ToArray())
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

// Configure JWT Authentication
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrEmpty(jwtKey))
{
    throw new Exception("JWT Key is not configured in appsettings.json");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// Configure Email Service
builder.Services.AddTransient<IEmailService, EmailService>();
builder.Services.AddScoped<ImageOptimizationService>();
builder.Services.AddScoped<OtpService>();
builder.Services.AddSingleton<CaptchaService>();
builder.Services.AddScoped<RefundService>();
builder.Services.AddScoped<TicketTransferService>();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<GeniusProfileService>();
builder.Services.AddScoped<LineupAvatarRefreshService>();
builder.Services.AddSingleton<IAiChatService, AiChatService>();
builder.Services.AddSingleton<ITicketPdfGenerator, TicketPdfGenerator>();
builder.Services.AddSingleton<IPlatformGuidePdfGenerator, PlatformGuidePdfGenerator>();
builder.Services.AddScoped<IPlatformGuideService, PlatformGuideService>();
var smtpSection = builder.Configuration.GetSection("SmtpSettings");
var smtpUser = smtpSection["Username"]?.Trim();
var smtpPass = (smtpSection["Password"] ?? "").Replace(" ", "");
if (!smtpSection.GetValue("Enabled", true))
    Console.WriteLine("[SMTP] Отключён (Enabled=false)");
else if (string.IsNullOrEmpty(smtpUser) || string.IsNullOrEmpty(smtpPass))
    Console.WriteLine("[SMTP] ВНИМАНИЕ: не задан Username или Password — письма не будут уходить");
else
    Console.WriteLine($"[SMTP] Настроен: {smtpUser} → {smtpSection["Host"]}:{smtpSection.GetValue("Port", 587)}");

// Порт: Render/Railway задают PORT; локально — 5064
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
else
    builder.WebHost.UseUrls("http://localhost:5064");

var app = builder.Build();

// =============================================
// ПРОВЕРКА ПОДКЛЮЧЕНИЯ К БАЗЕ ДАННЫХ (без миграций)
// =============================================
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    
    try
    {
        // Проверяем, можем ли подключиться к БД
        var canConnect = await dbContext.Database.CanConnectAsync();
        
        if (canConnect)
        {
            logger.LogInformation("✅ Успешное подключение к PostgreSQL!");
            
            // ✅ ВАЖНО: Убеждаемся, что все таблицы существуют с правильной схемой
            // EnsureCreated создает таблицы на основе конфигурации в ApplicationDbContext
            await dbContext.Database.EnsureCreatedAsync();
            logger.LogInformation("✅ Схема базы данных синхронизирована!");

            await dbContext.Database.ExecuteSqlRawAsync(@"
                CREATE TABLE IF NOT EXISTS authotpchallenges (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(120) NOT NULL,
                    purpose VARCHAR(20) NOT NULL,
                    codehash VARCHAR(200) NOT NULL,
                    payloadjson TEXT NULL,
                    userid INTEGER NULL,
                    expiresat TIMESTAMPTZ NOT NULL,
                    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    lastsentat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    resendcounttoday INTEGER NOT NULL DEFAULT 0,
                    resenddate DATE NOT NULL DEFAULT CURRENT_DATE
                );
                ALTER TABLE users ADD COLUMN IF NOT EXISTS googlesubjectid VARCHAR(64) NULL;
                ALTER TABLE orders ADD COLUMN IF NOT EXISTS eventid INTEGER NULL;
                ALTER TABLE orders ADD COLUMN IF NOT EXISTS eventtitle VARCHAR(300) NULL;
                ALTER TABLE orders ADD COLUMN IF NOT EXISTS seatlabel VARCHAR(100) NULL;
                ALTER TABLE events ADD COLUMN IF NOT EXISTS scheduledpublishat TIMESTAMPTZ NULL;
                ALTER TABLE events ADD COLUMN IF NOT EXISTS publishedat TIMESTAMPTZ NULL;
                ALTER TABLE events ADD COLUMN IF NOT EXISTS scheduledunpublishat TIMESTAMPTZ NULL;
                ALTER TABLE payments ADD COLUMN IF NOT EXISTS eventid INTEGER NULL;
                ALTER TABLE payments ADD COLUMN IF NOT EXISTS organizerid INTEGER NULL;
                ALTER TABLE payments ADD COLUMN IF NOT EXISTS grossamount NUMERIC(18,2) NULL;
                ALTER TABLE payments ADD COLUMN IF NOT EXISTS platformfee NUMERIC(18,2) NULL;
                ALTER TABLE payments ADD COLUMN IF NOT EXISTS organizerpayout NUMERIC(18,2) NULL;
                ALTER TABLE payments ADD COLUMN IF NOT EXISTS commissionpercent NUMERIC(5,2) NULL;
                ALTER TABLE events ALTER COLUMN status SET DEFAULT 'Draft';
                ALTER TABLE events ADD COLUMN IF NOT EXISTS genre VARCHAR(100) NULL;
                ALTER TABLE events ADD COLUMN IF NOT EXISTS hallthemejson TEXT NULL;
                CREATE TABLE IF NOT EXISTS catalogfilters (
                    id SERIAL PRIMARY KEY,
                    kind VARCHAR(20) NOT NULL,
                    label VARCHAR(100) NOT NULL,
                    sortorder INTEGER NOT NULL DEFAULT 0,
                    isactive BOOLEAN NOT NULL DEFAULT TRUE
                );
                CREATE UNIQUE INDEX IF NOT EXISTS ix_catalogfilters_kind_label ON catalogfilters (kind, label);
                ALTER TABLE halllayoutseats ADD COLUMN IF NOT EXISTS sector VARCHAR(50);
                ALTER TABLE halllayoutseats ADD COLUMN IF NOT EXISTS posx DECIMAL(8,2);
                ALTER TABLE halllayoutseats ADD COLUMN IF NOT EXISTS posy DECIMAL(8,2);
                ALTER TABLE halllayoutseats ADD COLUMN IF NOT EXISTS pricetier VARCHAR(30);
                ALTER TABLE halllayoutseats ADD COLUMN IF NOT EXISTS isga BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE seats ADD COLUMN IF NOT EXISTS sector VARCHAR(50);
                ALTER TABLE seats ADD COLUMN IF NOT EXISTS posx DECIMAL(8,2);
                ALTER TABLE seats ADD COLUMN IF NOT EXISTS posy DECIMAL(8,2);
                ALTER TABLE seats ADD COLUMN IF NOT EXISTS pricetier VARCHAR(30);
                ALTER TABLE seats ADD COLUMN IF NOT EXISTS isga BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE halllayoutseats DROP CONSTRAINT IF EXISTS halllayoutseats_halllayoutid_row_number_key;
                CREATE UNIQUE INDEX IF NOT EXISTS ix_halllayoutseats_layout_sector_row_number
                    ON halllayoutseats (halllayoutid, sector, row, number);
            ");

            await CatalogFilterSeed.SeedAsync(dbContext);
            await HallLayoutSeed.SeedAsync(dbContext, logger);
            await FaqSeed.SeedAsync(dbContext);
            await DefenseDemoSeed.SeedAsync(dbContext, scope.ServiceProvider.GetRequiredService<IConfiguration>(), logger);
            await DatabaseSchemaHelper.EnsureTicketTransferSchemaAsync(dbContext);

            await dbContext.Database.ExecuteSqlRawAsync(@"
                ALTER TABLE users ADD COLUMN IF NOT EXISTS avatarurl VARCHAR(500);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS qrsessionstartedat TIMESTAMPTZ;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS notifyorderemail BOOLEAN NOT NULL DEFAULT TRUE;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS notifyorganizerevents BOOLEAN NOT NULL DEFAULT TRUE;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS notifysite BOOLEAN NOT NULL DEFAULT TRUE;
                ALTER TABLE usertickets ADD COLUMN IF NOT EXISTS qrrotationstartedat TIMESTAMPTZ;
                ALTER TABLE usertickets ADD COLUMN IF NOT EXISTS isrefunded BOOLEAN NOT NULL DEFAULT FALSE;
                ALTER TABLE usertickets ADD COLUMN IF NOT EXISTS refundedat TIMESTAMPTZ NULL;
                CREATE TABLE IF NOT EXISTS supportthreads (
                    id SERIAL PRIMARY KEY,
                    userid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    userrole VARCHAR(20) NOT NULL DEFAULT 'visitor',
                    status VARCHAR(30) NOT NULL DEFAULT 'ai',
                    createdat TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updatedat TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE TABLE IF NOT EXISTS supportmessages (
                    id SERIAL PRIMARY KEY,
                    threadid INTEGER NOT NULL REFERENCES supportthreads(id) ON DELETE CASCADE,
                    senderrole VARCHAR(20) NOT NULL DEFAULT 'user',
                    content TEXT NOT NULL,
                    createdat TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS ix_supportthreads_userid ON supportthreads(userid);
                CREATE INDEX IF NOT EXISTS ix_supportthreads_status ON supportthreads(status);
                CREATE INDEX IF NOT EXISTS ix_supportmessages_threadid ON supportmessages(threadid);
                CREATE TABLE IF NOT EXISTS eventreschedulerequests (
                    id SERIAL PRIMARY KEY,
                    eventid INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
                    organizerid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    originaldate TIMESTAMP NOT NULL,
                    originaltime VARCHAR(10) NOT NULL,
                    proposeddate TIMESTAMP NOT NULL,
                    proposedtime VARCHAR(10) NOT NULL,
                    reason TEXT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'pending',
                    createdat TIMESTAMP NOT NULL DEFAULT NOW(),
                    reviewedat TIMESTAMP NULL,
                    reviewedbyadminid INTEGER NULL,
                    reviewcomment TEXT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_reschedule_pending ON eventreschedulerequests(status) WHERE status = 'pending';
                CREATE TABLE IF NOT EXISTS authotpchallenges (
                    id SERIAL PRIMARY KEY,
                    email VARCHAR(120) NOT NULL,
                    purpose VARCHAR(20) NOT NULL,
                    codehash VARCHAR(200) NOT NULL,
                    payloadjson TEXT NULL,
                    userid INTEGER NULL,
                    expiresat TIMESTAMPTZ NOT NULL,
                    createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    lastsentat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    resendcounttoday INTEGER NOT NULL DEFAULT 0,
                    resenddate DATE NOT NULL DEFAULT CURRENT_DATE
                );
                ALTER TABLE users ADD COLUMN IF NOT EXISTS googlesubjectid VARCHAR(64) NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS organizerguidesentat TIMESTAMPTZ NULL;
                ALTER TABLE users ADD COLUMN IF NOT EXISTS adminguidesentat TIMESTAMPTZ NULL;
            ");
            
            // Проверяем количество записей в таблицах
            var usersCount = await dbContext.Users.CountAsync();
            var eventsCount = await dbContext.Events.CountAsync();
            var seatsCount = await dbContext.Seats.CountAsync();
            
            logger.LogInformation($"📊 Статистика БД:");
            logger.LogInformation($"   - Users: {usersCount} записей");
            logger.LogInformation($"   - Events: {eventsCount} записей");
            logger.LogInformation($"   - Seats: {seatsCount} записей");
        }
        else
        {
            logger.LogError("❌ Не удалось подключиться к PostgreSQL!");
            logger.LogError("   Проверьте строку подключения в appsettings.json");
        }
    }
    catch (Exception ex)
    {
        logger.LogError(ex, "❌ Ошибка при подключении к PostgreSQL");
        logger.LogError($"   Сообщение: {ex.Message}");
    }
}

// Конфигурация middleware
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

// Глобальная обработка ошибок
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        var logger = context.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "An unhandled exception occurred.");

        context.Response.StatusCode = 500;
        context.Response.ContentType = "application/json";
        await context.Response.WriteAsJsonAsync(new { message = "Internal server error" });
    }
});

app.UseCors("AllowFrontend");
if (app.Environment.IsDevelopment())
    app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

if (!app.Environment.IsDevelopment())
    app.MapFallbackToFile("index.html");

app.Lifetime.ApplicationStarted.Register(() =>
{
    _ = Task.Run(async () =>
    {
        await Task.Delay(2500);
        try
        {
            using var scope = app.Services.CreateScope();
            var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
            var dispatchGuides = config.GetValue("SmtpSettings:DispatchGuidesOnStartup", false);
            if (!dispatchGuides)
            {
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
                logger.LogInformation("Авто-рассылка PDF-руководств при старте отключена (SmtpSettings:DispatchGuidesOnStartup=false)");
                return;
            }

            var guide = scope.ServiceProvider.GetRequiredService<IPlatformGuideService>();
            var log = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
            log.LogInformation("Запуск рассылки PDF-руководств организаторам и администраторам…");
            await guide.DispatchPendingGuidesAsync();
        }
        catch (Exception ex)
        {
            var logger = app.Services.GetRequiredService<ILogger<Program>>();
            logger.LogError(ex, "Ошибка рассылки PDF-руководств");
        }
    });
});

app.Run();