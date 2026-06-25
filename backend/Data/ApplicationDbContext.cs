using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Models;

namespace MyMvcBackend.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
            : base(options)
        {
        }
        
        public DbSet<User> Users { get; set; }
        public DbSet<Event> Events { get; set; }
        public DbSet<TicketType> TicketTypes { get; set; }
        public DbSet<Seat> Seats { get; set; }
        public DbSet<UserTicket> UserTickets { get; set; }
        public DbSet<Order> Orders { get; set; }
        public DbSet<Payment> Payments { get; set; }
        public DbSet<Review> Reviews { get; set; }
        public DbSet<Notification> Notifications { get; set; }
        public DbSet<ContactMessage> ContactMessages { get; set; }
        public DbSet<Venue> Venues { get; set; }
        public DbSet<Hall> Halls { get; set; }
        public DbSet<HallLayout> HallLayouts { get; set; }
        public DbSet<HallLayoutSeat> HallLayoutSeats { get; set; }
        public DbSet<CatalogFilter> CatalogFilters { get; set; }
        public DbSet<FaqCategory> FaqCategories { get; set; }
        public DbSet<FaqItem> FaqItems { get; set; }
        public DbSet<SupportThread> SupportThreads { get; set; }
        public DbSet<SupportMessage> SupportMessages { get; set; }
        public DbSet<EventRescheduleRequest> EventRescheduleRequests { get; set; }
        public DbSet<EventCancellationRequest> EventCancellationRequests { get; set; }
        public DbSet<CookieConsent> CookieConsents { get; set; }
        public DbSet<TicketRefundRequest> TicketRefundRequests { get; set; }
        public DbSet<TicketTransfer> TicketTransfers { get; set; }
        public DbSet<AuthOtpChallenge> AuthOtpChallenges { get; set; }
        
        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // =============================================
            // ЯВНО УКАЗЫВАЕМ ИМЕНА ТАБЛИЦ И КОЛОНОК (нижний регистр)
            // =============================================
            
            // USERS
            modelBuilder.Entity<User>(entity =>
            {
                entity.ToTable("users");
                
                entity.HasKey(u => u.Id);
                entity.Property(u => u.Id)
                    .HasColumnName("id")
                    .UseIdentityColumn();
                
                entity.Property(u => u.Name)
                    .HasColumnName("name")
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(u => u.Email)
                    .HasColumnName("email")
                    .IsRequired()
                    .HasMaxLength(100);
                entity.HasIndex(u => u.Email).IsUnique().HasDatabaseName("ix_users_email");
                    
                entity.Property(u => u.PasswordHash)
                    .HasColumnName("passwordhash")
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(u => u.VerificationToken)
                    .HasColumnName("verificationtoken")
                    .HasMaxLength(500);
                    
                entity.Property(u => u.TokenExpiresAt)
                    .HasColumnName("tokenexpiresat");
                    
                entity.Property(u => u.EmailVerified)
                    .HasColumnName("emailverified")
                    .HasDefaultValue(false);
                    
                entity.Property(u => u.IsAdmin)
                    .HasColumnName("isadmin")
                    .HasDefaultValue(false);

                entity.Property(u => u.IsOrganizer)
                    .HasColumnName("isorganizer")
                    .HasDefaultValue(false);
                    
                entity.Property(u => u.CreatedAt)
                    .HasColumnName("createdat")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");
                    
                entity.Property(u => u.UpdatedAt)
                    .HasColumnName("updatedat")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.Property(u => u.AvatarUrl)
                    .HasColumnName("avatarurl")
                    .HasMaxLength(500);

                entity.Property(u => u.QrSessionStartedAt)
                    .HasColumnName("qrsessionstartedat");

                entity.Property(u => u.NotifyOrderEmail)
                    .HasColumnName("notifyorderemail")
                    .HasDefaultValue(true);

                entity.Property(u => u.NotifyOrganizerEvents)
                    .HasColumnName("notifyorganizerevents")
                    .HasDefaultValue(true);

                entity.Property(u => u.NotifySite)
                    .HasColumnName("notifysite")
                    .HasDefaultValue(true);

                entity.Property(u => u.GoogleSubjectId)
                    .HasColumnName("googlesubjectid")
                    .HasMaxLength(64);

                entity.Property(u => u.OrganizerGuideSentAt)
                    .HasColumnName("organizerguidesentat");

                entity.Property(u => u.AdminGuideSentAt)
                    .HasColumnName("adminguidesentat");
            });

            // EVENTS
            modelBuilder.Entity<Event>(entity =>
            {
                entity.ToTable("events");
                
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Id)
                    .HasColumnName("id")
                    .UseIdentityColumn();
                
                entity.Property(e => e.Title)
                    .HasColumnName("title")
                    .IsRequired()
                    .HasMaxLength(500);
                    
                entity.Property(e => e.Image)
                    .HasColumnName("image")
                    .IsRequired()
                    .HasMaxLength(1000);
                    
                entity.Property(e => e.Date)
                    .HasColumnName("date")
                    .IsRequired();
                    
                entity.Property(e => e.Time)
                    .HasColumnName("time")
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(e => e.Location)
                    .HasColumnName("location")
                    .IsRequired()
                    .HasMaxLength(500);
                    
                entity.Property(e => e.Address)
                    .HasColumnName("address")
                    .IsRequired()
                    .HasMaxLength(1000);
                    
                entity.Property(e => e.Price)
                    .HasColumnName("price")
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.Category)
                    .HasColumnName("category")
                    .HasMaxLength(100);

                entity.Property(e => e.Genre)
                    .HasColumnName("genre")
                    .HasMaxLength(100);
                    
                entity.Property(e => e.Description)
                    .HasColumnName("description");
                    
                entity.Property(e => e.EventType)
                    .HasColumnName("eventtype")
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(e => e.Lineup)
                    .HasColumnName("lineup");
                    
                entity.Property(e => e.IsFeatured)
                    .HasColumnName("isfeatured")
                    .HasDefaultValue(false);

                entity.Property(e => e.Status)
                    .HasColumnName("status")
                    .HasConversion<string>()
                    .HasMaxLength(50)
                    .HasDefaultValue(EventStatus.Draft);

                entity.Property(e => e.OrganizerId).HasColumnName("organizerid");
                entity.Property(e => e.ReviewedByAdminId).HasColumnName("reviewedbyadminid");
                entity.Property(e => e.ReviewComment).HasColumnName("reviewcomment");
                entity.Property(e => e.SubmittedAt).HasColumnName("submittedat");
                entity.Property(e => e.ReviewedAt).HasColumnName("reviewedat");
                entity.Property(e => e.ScheduledPublishAt).HasColumnName("scheduledpublishat");
                entity.Property(e => e.PublishedAt).HasColumnName("publishedat");
                entity.Property(e => e.ScheduledUnpublishAt).HasColumnName("scheduledunpublishat");
                entity.Property(e => e.VenueId).HasColumnName("venueid");
                entity.Property(e => e.HallId).HasColumnName("hallid");
                entity.Property(e => e.HallLayoutId).HasColumnName("halllayoutid");
                entity.Property(e => e.HallThemeJson).HasColumnName("hallthemejson");
                entity.Property(e => e.CreatedByAdmin).HasColumnName("createdbyadmin").HasDefaultValue(false);
                entity.Property(e => e.AdminOrganizerAccess).HasColumnName("adminorganizeraccess").HasMaxLength(20);
                entity.Property(e => e.CreatedByAdminUserId).HasColumnName("createdbyadminuserid");
                entity.Property(e => e.AllowTicketTransfer).HasColumnName("allowtickettransfer").HasDefaultValue(false);
                entity.Property(e => e.CreatedAt).HasColumnName("createdat").HasDefaultValueSql("CURRENT_TIMESTAMP");
                entity.Property(e => e.UpdatedAt).HasColumnName("updatedat").HasDefaultValueSql("CURRENT_TIMESTAMP");

                entity.HasOne(e => e.Organizer)
                    .WithMany()
                    .HasForeignKey(e => e.OrganizerId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Venue)
                    .WithMany()
                    .HasForeignKey(e => e.VenueId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.Hall)
                    .WithMany()
                    .HasForeignKey(e => e.HallId)
                    .OnDelete(DeleteBehavior.SetNull);

                entity.HasOne(e => e.HallLayout)
                    .WithMany()
                    .HasForeignKey(e => e.HallLayoutId)
                    .OnDelete(DeleteBehavior.SetNull);
                    
                // Индексы
                entity.HasIndex(e => e.Date).HasDatabaseName("ix_events_date");
                entity.HasIndex(e => e.IsFeatured).HasDatabaseName("ix_events_isfeatured");
                entity.HasIndex(e => e.Status).HasDatabaseName("ix_events_status");
            });

            modelBuilder.Entity<CatalogFilter>(entity =>
            {
                entity.ToTable("catalogfilters");
                entity.HasKey(f => f.Id);
                entity.Property(f => f.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(f => f.Kind).HasColumnName("kind").IsRequired().HasMaxLength(20);
                entity.Property(f => f.Label).HasColumnName("label").IsRequired().HasMaxLength(100);
                entity.Property(f => f.SortOrder).HasColumnName("sortorder").HasDefaultValue(0);
                entity.Property(f => f.IsActive).HasColumnName("isactive").HasDefaultValue(true);
                entity.HasIndex(f => new { f.Kind, f.Label }).IsUnique().HasDatabaseName("ix_catalogfilters_kind_label");
            });

            modelBuilder.Entity<Venue>(entity =>
            {
                entity.ToTable("venues");
                entity.HasKey(v => v.Id);
                entity.Property(v => v.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(v => v.Name).HasColumnName("name").IsRequired().HasMaxLength(300);
                entity.Property(v => v.City).HasColumnName("city").IsRequired().HasMaxLength(120);
                entity.Property(v => v.Address).HasColumnName("address").IsRequired().HasMaxLength(500);
            });

            modelBuilder.Entity<Hall>(entity =>
            {
                entity.ToTable("halls");
                entity.HasKey(h => h.Id);
                entity.Property(h => h.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(h => h.Name).HasColumnName("name").IsRequired().HasMaxLength(250);
                entity.Property(h => h.VenueId).HasColumnName("venueid");
                entity.Property(h => h.Capacity).HasColumnName("capacity").HasDefaultValue(0);
                entity.HasOne(h => h.Venue).WithMany(v => v.Halls).HasForeignKey(h => h.VenueId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<HallLayout>(entity =>
            {
                entity.ToTable("halllayouts");
                entity.HasKey(l => l.Id);
                entity.Property(l => l.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(l => l.Name).HasColumnName("name").IsRequired().HasMaxLength(250);
                entity.Property(l => l.HallId).HasColumnName("hallid");
                entity.Property(l => l.IsActive).HasColumnName("isactive").HasDefaultValue(true);
                entity.HasOne(l => l.Hall).WithMany(h => h.Layouts).HasForeignKey(l => l.HallId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<HallLayoutSeat>(entity =>
            {
                entity.ToTable("halllayoutseats");
                entity.HasKey(s => s.Id);
                entity.Property(s => s.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(s => s.HallLayoutId).HasColumnName("halllayoutid");
                entity.Property(s => s.Row).HasColumnName("row").IsRequired().HasMaxLength(50);
                entity.Property(s => s.Number).HasColumnName("number");
                entity.Property(s => s.Type).HasColumnName("type").IsRequired().HasMaxLength(50);
                entity.Property(s => s.Price).HasColumnName("price").HasPrecision(18, 2);
                entity.Property(s => s.Sector).HasColumnName("sector").HasMaxLength(50);
                entity.Property(s => s.PosX).HasColumnName("posx").HasPrecision(8, 2);
                entity.Property(s => s.PosY).HasColumnName("posy").HasPrecision(8, 2);
                entity.Property(s => s.PriceTier).HasColumnName("pricetier").HasMaxLength(30);
                entity.Property(s => s.IsGa).HasColumnName("isga").HasDefaultValue(false);
                entity.HasOne(s => s.HallLayout).WithMany(l => l.Seats).HasForeignKey(s => s.HallLayoutId).OnDelete(DeleteBehavior.Cascade);
                entity.HasIndex(s => new { s.HallLayoutId, s.Sector, s.Row, s.Number }).IsUnique();
            });

            // TICKET TYPES
            modelBuilder.Entity<TicketType>(entity =>
            {
                entity.ToTable("tickettypes");
                
                entity.HasKey(t => t.Id);
                entity.Property(t => t.Id)
                    .HasColumnName("id")
                    .UseIdentityColumn();
                
                entity.Property(t => t.Name)
                    .HasColumnName("name")
                    .IsRequired()
                    .HasMaxLength(200);
                    
                entity.Property(t => t.Price)
                    .HasColumnName("price")
                    .IsRequired()
                    .HasPrecision(18, 2);
                    
                entity.Property(t => t.Available)
                    .HasColumnName("available")
                    .HasDefaultValue(true);
                    
                entity.Property(t => t.EventId)
                    .HasColumnName("eventid");
                    
                entity.HasOne(t => t.Event)
                    .WithMany(e => e.TicketTypes)
                    .HasForeignKey(t => t.EventId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasIndex(t => t.EventId).HasDatabaseName("ix_tickettypes_eventid");
            });

            // SEATS
            modelBuilder.Entity<Seat>(entity =>
            {
                entity.ToTable("seats");
                
                entity.HasKey(s => s.Id);
                entity.Property(s => s.Id)
                    .HasColumnName("id")
                    .UseIdentityColumn();
                
                entity.Property(s => s.EventId)
                    .HasColumnName("eventid");
                    
                entity.Property(s => s.Row)
                    .HasColumnName("row")
                    .IsRequired()
                    .HasMaxLength(50);
                    
                entity.Property(s => s.Number)
                    .HasColumnName("number");
                    
                entity.Property(s => s.Status)
                    .HasColumnName("status")
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasDefaultValue("available");
                    
                entity.Property(s => s.Type)
                    .HasColumnName("type")
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasDefaultValue("standard");
                    
                entity.Property(s => s.Price)
                    .HasColumnName("price")
                    .IsRequired()
                    .HasPrecision(18, 2);

                entity.Property(s => s.Sector)
                    .HasColumnName("sector")
                    .HasMaxLength(50);

                entity.Property(s => s.PosX)
                    .HasColumnName("posx")
                    .HasPrecision(8, 2);

                entity.Property(s => s.PosY)
                    .HasColumnName("posy")
                    .HasPrecision(8, 2);

                entity.Property(s => s.PriceTier)
                    .HasColumnName("pricetier")
                    .HasMaxLength(30);

                entity.Property(s => s.IsGa)
                    .HasColumnName("isga")
                    .HasDefaultValue(false);
                    
                entity.Property(s => s.ReservedByUserId)
                    .HasColumnName("reservedbyuserid");
                    
                entity.Property(s => s.ReservationExpiresAt)
                    .HasColumnName("reservationexpiresat");
                    
                entity.HasOne(s => s.Event)
                    .WithMany(e => e.Seats)
                    .HasForeignKey(s => s.EventId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(s => s.ReservedByUser)
                    .WithMany()
                    .HasForeignKey(s => s.ReservedByUserId)
                    .OnDelete(DeleteBehavior.SetNull);
                    
                entity.HasIndex(s => s.EventId).HasDatabaseName("ix_seats_eventid");
                entity.HasIndex(s => s.ReservedByUserId).HasDatabaseName("ix_seats_reservedbyuserid");
                entity.HasIndex(s => s.Status).HasDatabaseName("ix_seats_status");
            });

            // USER TICKETS
            modelBuilder.Entity<UserTicket>(entity =>
            {
                entity.ToTable("usertickets");
                
                entity.HasKey(t => t.Id);
                entity.Property(t => t.Id)
                    .HasColumnName("id")
                    .UseIdentityColumn();
                
                entity.Property(t => t.UserId)
                    .HasColumnName("userid");
                    
                entity.Property(t => t.EventId)
                    .HasColumnName("eventid");
                    
                entity.Property(t => t.SeatId)
                    .HasColumnName("seatid");
                    
                entity.Property(t => t.TicketType)
                    .HasColumnName("tickettype")
                    .IsRequired()
                    .HasMaxLength(200);
                    
                entity.Property(t => t.Price)
                    .HasColumnName("price")
                    .IsRequired()
                    .HasPrecision(18, 2);
                    
                entity.Property(t => t.PurchaseDate)
                    .HasColumnName("purchasedate")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");
                    
                entity.Property(t => t.EventDate)
                    .HasColumnName("eventdate");
                    
                entity.Property(t => t.QrCode)
                    .HasColumnName("qrcode")
                    .IsRequired()
                    .HasMaxLength(1000);

                entity.Property(t => t.QrRotationStartedAt)
                    .HasColumnName("qrrotationstartedat");
                    
                entity.Property(t => t.IsUsed)
                    .HasColumnName("isused")
                    .HasDefaultValue(false);

                entity.Property(t => t.IsRefunded)
                    .HasColumnName("isrefunded")
                    .HasDefaultValue(false);

                entity.Property(t => t.RefundedAt)
                    .HasColumnName("refundedat");
                    
                entity.HasOne(t => t.User)
                    .WithMany()
                    .HasForeignKey(t => t.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(t => t.Event)
                    .WithMany()
                    .HasForeignKey(t => t.EventId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(t => t.Seat)
                    .WithMany()
                    .HasForeignKey(t => t.SeatId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // ORDERS
            modelBuilder.Entity<Order>(entity =>
            {
                entity.ToTable("orders");
                
                entity.HasKey(o => o.Id);
                entity.Property(o => o.Id)
                    .HasColumnName("id")
                    .UseIdentityColumn();
                
                entity.Property(o => o.UserId)
                    .HasColumnName("userid");
                    
                entity.Property(o => o.OrderNumber)
                    .HasColumnName("ordernumber")
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(o => o.TotalAmount)
                    .HasColumnName("totalamount")
                    .IsRequired()
                    .HasPrecision(18, 2);
                    
                entity.Property(o => o.Status)
                    .HasColumnName("status")
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasDefaultValue("pending");
                    
                entity.Property(o => o.CreatedAt)
                    .HasColumnName("createdat")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");
                    
                entity.Property(o => o.CompletedAt)
                    .HasColumnName("completedat");

                entity.Property(o => o.EventId)
                    .HasColumnName("eventid");

                entity.Property(o => o.EventTitle)
                    .HasColumnName("eventtitle")
                    .HasMaxLength(300);

                entity.Property(o => o.SeatLabel)
                    .HasColumnName("seatlabel")
                    .HasMaxLength(100);
                    
                entity.HasOne(o => o.User)
                    .WithMany()
                    .HasForeignKey(o => o.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasIndex(o => o.OrderNumber)
                    .IsUnique()
                    .HasDatabaseName("ix_orders_ordernumber");
                    
                entity.HasIndex(o => o.Status).HasDatabaseName("ix_orders_status");
                entity.HasIndex(o => o.UserId).HasDatabaseName("ix_orders_userid");
            });

            // PAYMENTS
            modelBuilder.Entity<Payment>(entity =>
            {
                entity.ToTable("payments");
                
                entity.HasKey(p => p.Id);
                entity.Property(p => p.Id)
                    .HasColumnName("id")
                    .UseIdentityColumn();
                
                entity.Property(p => p.OrderId)
                    .HasColumnName("orderid");
                    
                entity.Property(p => p.UserId)
                    .HasColumnName("userid");
                    
                entity.Property(p => p.Amount)
                    .HasColumnName("amount")
                    .IsRequired()
                    .HasPrecision(18, 2);
                    
                entity.Property(p => p.PaymentMethod)
                    .HasColumnName("paymentmethod")
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(p => p.Status)
                    .HasColumnName("status")
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasDefaultValue("pending");
                    
                entity.Property(p => p.TransactionId)
                    .HasColumnName("transactionid")
                    .HasMaxLength(500);
                    
                entity.Property(p => p.PaymentDetails)
                    .HasColumnName("paymentdetails");
                    
                entity.Property(p => p.CreatedAt)
                    .HasColumnName("createdat")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");
                    
                entity.Property(p => p.CompletedAt)
                    .HasColumnName("completedat");

                entity.Property(p => p.EventId).HasColumnName("eventid");
                entity.Property(p => p.OrganizerId).HasColumnName("organizerid");
                entity.Property(p => p.GrossAmount).HasColumnName("grossamount").HasPrecision(18, 2);
                entity.Property(p => p.PlatformFee).HasColumnName("platformfee").HasPrecision(18, 2);
                entity.Property(p => p.OrganizerPayout).HasColumnName("organizerpayout").HasPrecision(18, 2);
                entity.Property(p => p.CommissionPercent).HasColumnName("commissionpercent").HasPrecision(5, 2);
                    
                entity.HasOne(p => p.Order)
                    .WithMany()
                    .HasForeignKey(p => p.OrderId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(p => p.User)
                    .WithMany()
                    .HasForeignKey(p => p.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // REVIEWS
            modelBuilder.Entity<Review>(entity =>
            {
                entity.ToTable("reviews");
                
                entity.HasKey(r => r.Id);
                entity.Property(r => r.Id)
                    .HasColumnName("id")
                    .UseIdentityColumn();
                
                entity.Property(r => r.UserId)
                    .HasColumnName("userid");
                    
                entity.Property(r => r.EventId)
                    .HasColumnName("eventid");
                    
                entity.Property(r => r.Rating)
                    .HasColumnName("rating");
                    
                entity.Property(r => r.Comment)
                    .HasColumnName("comment");
                    
                entity.Property(r => r.CreatedAt)
                    .HasColumnName("createdat")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");
                    
                entity.Property(r => r.UpdatedAt)
                    .HasColumnName("updatedat");
                    
                entity.Property(r => r.IsApproved)
                    .HasColumnName("isapproved")
                    .HasDefaultValue(false);
                    
                entity.HasOne(r => r.User)
                    .WithMany()
                    .HasForeignKey(r => r.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(r => r.Event)
                    .WithMany()
                    .HasForeignKey(r => r.EventId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                // Уникальность: один пользователь - один отзыв на событие
                entity.HasIndex(r => new { r.UserId, r.EventId })
                    .IsUnique()
                    .HasDatabaseName("ix_reviews_userid_eventid");
                    
                entity.HasIndex(r => r.EventId).HasDatabaseName("ix_reviews_eventid");
                entity.HasIndex(r => r.UserId).HasDatabaseName("ix_reviews_userid");
                entity.HasIndex(r => r.IsApproved).HasDatabaseName("ix_reviews_isapproved");
            });

            // NOTIFICATIONS
            modelBuilder.Entity<Notification>(entity =>
            {
                entity.ToTable("notifications");
                
                entity.HasKey(n => n.Id);
                entity.Property(n => n.Id)
                    .HasColumnName("id")
                    .UseIdentityColumn();
                
                entity.Property(n => n.UserId)
                    .HasColumnName("userid");
                    
                entity.Property(n => n.Title)
                    .HasColumnName("title")
                    .IsRequired()
                    .HasMaxLength(500);
                    
                entity.Property(n => n.Message)
                    .HasColumnName("message");
                    
                entity.Property(n => n.Type)
                    .HasColumnName("type")
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasDefaultValue("info");
                    
                entity.Property(n => n.IsRead)
                    .HasColumnName("isread")
                    .HasDefaultValue(false);
                    
                entity.Property(n => n.CreatedAt)
                    .HasColumnName("createdat")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");
                    
                entity.Property(n => n.ReadAt)
                    .HasColumnName("readat");
                    
                entity.Property(n => n.RelatedEventId)
                    .HasColumnName("relatedeventid");
                    
                entity.Property(n => n.RelatedTicketId)
                    .HasColumnName("relatedticketid");
                    
                entity.HasOne(n => n.User)
                    .WithMany()
                    .HasForeignKey(n => n.UserId)
                    .OnDelete(DeleteBehavior.Cascade);
                    
                entity.HasOne(n => n.RelatedEvent)
                    .WithMany()
                    .HasForeignKey(n => n.RelatedEventId)
                    .OnDelete(DeleteBehavior.SetNull);
                    
                entity.HasOne(n => n.RelatedTicket)
                    .WithMany()
                    .HasForeignKey(n => n.RelatedTicketId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // CONTACT MESSAGES
            modelBuilder.Entity<ContactMessage>(entity =>
            {
                entity.ToTable("contactmessages");
                
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Id)
                    .HasColumnName("id")
                    .UseIdentityColumn();
                
                entity.Property(c => c.Name)
                    .HasColumnName("name")
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(c => c.Email)
                    .HasColumnName("email")
                    .IsRequired()
                    .HasMaxLength(100);
                    
                entity.Property(c => c.Message)
                    .HasColumnName("message");
                    
                entity.Property(c => c.Status)
                    .HasColumnName("status")
                    .IsRequired()
                    .HasMaxLength(50)
                    .HasDefaultValue("new");
                    
                entity.Property(c => c.CreatedAt)
                    .HasColumnName("createdat")
                    .HasDefaultValueSql("CURRENT_TIMESTAMP");
                    
                entity.Property(c => c.ResolvedAt)
                    .HasColumnName("resolvedat");
                    
                entity.Property(c => c.Response)
                    .HasColumnName("response");
                    
                entity.Property(c => c.RespondedByUserId)
                    .HasColumnName("respondedbyuserid");
                    
                entity.HasIndex(c => c.CreatedAt).HasDatabaseName("ix_contactmessages_createdat");
                entity.HasIndex(c => c.Email).HasDatabaseName("ix_contactmessages_email");
                entity.HasIndex(c => c.Status).HasDatabaseName("ix_contactmessages_status");
            });

            modelBuilder.Entity<FaqCategory>(entity =>
            {
                entity.ToTable("faqcategories");
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Id).HasColumnName("id").HasMaxLength(32);
                entity.Property(c => c.Title).HasColumnName("title").HasMaxLength(200);
                entity.Property(c => c.Description).HasColumnName("description").HasMaxLength(500);
                entity.Property(c => c.SortOrder).HasColumnName("sortorder");
            });

            modelBuilder.Entity<FaqItem>(entity =>
            {
                entity.ToTable("faqitems");
                entity.HasKey(i => i.Id);
                entity.Property(i => i.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(i => i.CategoryId).HasColumnName("categoryid").HasMaxLength(32);
                entity.Property(i => i.Question).HasColumnName("question");
                entity.Property(i => i.Answer).HasColumnName("answer");
                entity.Property(i => i.SortOrder).HasColumnName("sortorder");
                entity.HasOne(i => i.Category).WithMany().HasForeignKey(i => i.CategoryId);
            });

            modelBuilder.Entity<SupportThread>(entity =>
            {
                entity.ToTable("supportthreads");
                entity.HasKey(t => t.Id);
                entity.Property(t => t.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(t => t.UserId).HasColumnName("userid");
                entity.Property(t => t.UserRole).HasColumnName("userrole").HasMaxLength(20);
                entity.Property(t => t.Status).HasColumnName("status").HasMaxLength(30);
                entity.Property(t => t.CreatedAt).HasColumnName("createdat");
                entity.Property(t => t.UpdatedAt).HasColumnName("updatedat");
                entity.HasOne(t => t.User).WithMany().HasForeignKey(t => t.UserId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<SupportMessage>(entity =>
            {
                entity.ToTable("supportmessages");
                entity.HasKey(m => m.Id);
                entity.Property(m => m.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(m => m.ThreadId).HasColumnName("threadid");
                entity.Property(m => m.SenderRole).HasColumnName("senderrole").HasMaxLength(20);
                entity.Property(m => m.Content).HasColumnName("content");
                entity.Property(m => m.CreatedAt).HasColumnName("createdat");
                entity.HasOne(m => m.Thread).WithMany(t => t.Messages).HasForeignKey(m => m.ThreadId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<AuthOtpChallenge>(entity =>
            {
                entity.ToTable("authotpchallenges");
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(c => c.Email).HasColumnName("email").HasMaxLength(120);
                entity.Property(c => c.Purpose).HasColumnName("purpose").HasMaxLength(20);
                entity.Property(c => c.CodeHash).HasColumnName("codehash").HasMaxLength(200);
                entity.Property(c => c.PayloadJson).HasColumnName("payloadjson");
                entity.Property(c => c.UserId).HasColumnName("userid");
                entity.Property(c => c.ExpiresAt).HasColumnName("expiresat");
                entity.Property(c => c.CreatedAt).HasColumnName("createdat");
                entity.Property(c => c.LastSentAt).HasColumnName("lastsentat");
                entity.Property(c => c.ResendCountToday).HasColumnName("resendcounttoday");
                entity.Property(c => c.ResendDate).HasColumnName("resenddate");
            });

            modelBuilder.Entity<EventRescheduleRequest>(entity =>
            {
                entity.ToTable("eventreschedulerequests");
                entity.HasKey(r => r.Id);
                entity.Property(r => r.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(r => r.EventId).HasColumnName("eventid");
                entity.Property(r => r.OrganizerId).HasColumnName("organizerid");
                entity.Property(r => r.OriginalDate).HasColumnName("originaldate");
                entity.Property(r => r.OriginalTime).HasColumnName("originaltime").HasMaxLength(10);
                entity.Property(r => r.ProposedDate).HasColumnName("proposeddate");
                entity.Property(r => r.ProposedTime).HasColumnName("proposedtime").HasMaxLength(10);
                entity.Property(r => r.Reason).HasColumnName("reason");
                entity.Property(r => r.Status).HasColumnName("status").HasMaxLength(20);
                entity.Property(r => r.CreatedAt).HasColumnName("createdat");
                entity.Property(r => r.ReviewedAt).HasColumnName("reviewedat");
                entity.Property(r => r.ReviewedByAdminId).HasColumnName("reviewedbyadminid");
                entity.Property(r => r.ReviewComment).HasColumnName("reviewcomment");
                entity.HasOne(r => r.Event).WithMany().HasForeignKey(r => r.EventId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<EventCancellationRequest>(entity =>
            {
                entity.ToTable("eventcancellationrequests");
                entity.HasKey(r => r.Id);
                entity.Property(r => r.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(r => r.EventId).HasColumnName("eventid");
                entity.Property(r => r.OrganizerId).HasColumnName("organizerid");
                entity.Property(r => r.Reason).HasColumnName("reason");
                entity.Property(r => r.Status).HasColumnName("status").HasMaxLength(20);
                entity.Property(r => r.CreatedAt).HasColumnName("createdat");
                entity.Property(r => r.ReviewedAt).HasColumnName("reviewedat");
                entity.Property(r => r.ReviewedByAdminId).HasColumnName("reviewedbyadminid");
                entity.Property(r => r.ReviewComment).HasColumnName("reviewcomment");
                entity.HasOne(r => r.Event).WithMany().HasForeignKey(r => r.EventId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(r => r.Organizer).WithMany().HasForeignKey(r => r.OrganizerId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<CookieConsent>(entity =>
            {
                entity.ToTable("cookieconsents");
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(c => c.VisitorId).HasColumnName("visitorid").HasMaxLength(64).IsRequired();
                entity.Property(c => c.UserId).HasColumnName("userid");
                entity.Property(c => c.Essential).HasColumnName("essential").HasDefaultValue(true);
                entity.Property(c => c.Analytics).HasColumnName("analytics").HasDefaultValue(false);
                entity.Property(c => c.Marketing).HasColumnName("marketing").HasDefaultValue(false);
                entity.Property(c => c.UserAgent).HasColumnName("useragent").HasMaxLength(512);
                entity.Property(c => c.IpHash).HasColumnName("iphash").HasMaxLength(64);
                entity.Property(c => c.CreatedAt).HasColumnName("createdat");
                entity.Property(c => c.UpdatedAt).HasColumnName("updatedat");
                entity.HasIndex(c => c.VisitorId).IsUnique().HasDatabaseName("idx_cookieconsents_visitorid");
                entity.HasOne(c => c.User).WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.SetNull);
            });

            modelBuilder.Entity<TicketRefundRequest>(entity =>
            {
                entity.ToTable("ticketrefundrequests");
                entity.HasKey(r => r.Id);
                entity.Property(r => r.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(r => r.UserTicketId).HasColumnName("userticketid");
                entity.Property(r => r.UserId).HasColumnName("userid");
                entity.Property(r => r.EventId).HasColumnName("eventid");
                entity.Property(r => r.Reason).HasColumnName("reason");
                entity.Property(r => r.Status).HasColumnName("status").HasMaxLength(20);
                entity.Property(r => r.CreatedAt).HasColumnName("createdat");
                entity.Property(r => r.ReviewedAt).HasColumnName("reviewedat");
                entity.Property(r => r.ReviewedByAdminId).HasColumnName("reviewedbyadminid");
                entity.Property(r => r.ReviewComment).HasColumnName("reviewcomment");
                entity.HasOne(r => r.UserTicket).WithMany().HasForeignKey(r => r.UserTicketId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(r => r.User).WithMany().HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(r => r.Event).WithMany().HasForeignKey(r => r.EventId).OnDelete(DeleteBehavior.Cascade);
            });

            modelBuilder.Entity<TicketTransfer>(entity =>
            {
                entity.ToTable("tickettransfers");
                entity.HasKey(t => t.Id);
                entity.Property(t => t.Id).HasColumnName("id").UseIdentityColumn();
                entity.Property(t => t.UserTicketId).HasColumnName("userticketid");
                entity.Property(t => t.SenderUserId).HasColumnName("senderuserid");
                entity.Property(t => t.RecipientUserId).HasColumnName("recipientuserid");
                entity.Property(t => t.RecipientEmail).HasColumnName("recipientemail").HasMaxLength(120);
                entity.Property(t => t.Price).HasColumnName("price").HasPrecision(18, 2);
                entity.Property(t => t.Status).HasColumnName("status").HasMaxLength(20);
                entity.Property(t => t.ExpiresAt).HasColumnName("expiresat");
                entity.Property(t => t.CreatedAt).HasColumnName("createdat");
                entity.Property(t => t.RespondedAt).HasColumnName("respondedat");
                entity.Property(t => t.CompletedAt).HasColumnName("completedat");
                entity.HasOne(t => t.UserTicket).WithMany().HasForeignKey(t => t.UserTicketId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(t => t.Sender).WithMany().HasForeignKey(t => t.SenderUserId).OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(t => t.Recipient).WithMany().HasForeignKey(t => t.RecipientUserId).OnDelete(DeleteBehavior.Cascade);
            });
        }
    }
}