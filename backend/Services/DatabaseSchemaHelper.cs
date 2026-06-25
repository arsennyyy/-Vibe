using Microsoft.EntityFrameworkCore;
using MyMvcBackend.Data;

namespace MyMvcBackend.Services;

public static class DatabaseSchemaHelper
{
    public static async Task EnsureRescheduleTableAsync(ApplicationDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS eventreschedulerequests (
                id SERIAL PRIMARY KEY
            );
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS eventid INTEGER;
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS organizerid INTEGER;
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS originaldate TIMESTAMP NOT NULL DEFAULT NOW();
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS originaltime VARCHAR(10) NOT NULL DEFAULT '00:00';
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS proposeddate TIMESTAMP NOT NULL DEFAULT NOW();
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS proposedtime VARCHAR(10) NOT NULL DEFAULT '00:00';
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '';
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS createdat TIMESTAMP NOT NULL DEFAULT NOW();
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS reviewedat TIMESTAMP NULL;
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS reviewedbyadminid INTEGER NULL;
            ALTER TABLE eventreschedulerequests ADD COLUMN IF NOT EXISTS reviewcomment TEXT NULL;
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'eventreschedulerequests_eventid_fkey'
                ) THEN
                    ALTER TABLE eventreschedulerequests
                        ADD CONSTRAINT eventreschedulerequests_eventid_fkey
                        FOREIGN KEY (eventid) REFERENCES events(id) ON DELETE CASCADE;
                END IF;
            END $$;
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'eventreschedulerequests_organizerid_fkey'
                ) THEN
                    ALTER TABLE eventreschedulerequests
                        ADD CONSTRAINT eventreschedulerequests_organizerid_fkey
                        FOREIGN KEY (organizerid) REFERENCES users(id) ON DELETE CASCADE;
                END IF;
            END $$;
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE INDEX IF NOT EXISTS idx_reschedule_pending
                ON eventreschedulerequests(status) WHERE status = 'pending';
            CREATE INDEX IF NOT EXISTS idx_reschedule_eventid
                ON eventreschedulerequests(eventid);
        ");
    }

    public static async Task EnsureEventAdminColumnsAsync(ApplicationDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE events ADD COLUMN IF NOT EXISTS createdbyadmin BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE events ADD COLUMN IF NOT EXISTS adminorganizeraccess VARCHAR(20) NULL;
            ALTER TABLE events ADD COLUMN IF NOT EXISTS createdbyadminuserid INTEGER NULL;
        ");
    }

    public static async Task EnsureCancellationTableAsync(ApplicationDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS eventcancellationrequests (
                id SERIAL PRIMARY KEY
            );
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE eventcancellationrequests ADD COLUMN IF NOT EXISTS eventid INTEGER;
            ALTER TABLE eventcancellationrequests ADD COLUMN IF NOT EXISTS organizerid INTEGER;
            ALTER TABLE eventcancellationrequests ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '';
            ALTER TABLE eventcancellationrequests ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
            ALTER TABLE eventcancellationrequests ADD COLUMN IF NOT EXISTS createdat TIMESTAMP NOT NULL DEFAULT NOW();
            ALTER TABLE eventcancellationrequests ADD COLUMN IF NOT EXISTS reviewedat TIMESTAMP NULL;
            ALTER TABLE eventcancellationrequests ADD COLUMN IF NOT EXISTS reviewedbyadminid INTEGER NULL;
            ALTER TABLE eventcancellationrequests ADD COLUMN IF NOT EXISTS reviewcomment TEXT NULL;
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'eventcancellationrequests_eventid_fkey'
                ) THEN
                    ALTER TABLE eventcancellationrequests
                        ADD CONSTRAINT eventcancellationrequests_eventid_fkey
                        FOREIGN KEY (eventid) REFERENCES events(id) ON DELETE CASCADE;
                END IF;
            END $$;
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            DO $$ BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'eventcancellationrequests_organizerid_fkey'
                ) THEN
                    ALTER TABLE eventcancellationrequests
                        ADD CONSTRAINT eventcancellationrequests_organizerid_fkey
                        FOREIGN KEY (organizerid) REFERENCES users(id) ON DELETE CASCADE;
                END IF;
            END $$;
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE INDEX IF NOT EXISTS idx_cancellation_pending
                ON eventcancellationrequests(status) WHERE status = 'pending';
            CREATE INDEX IF NOT EXISTS idx_cancellation_eventid
                ON eventcancellationrequests(eventid);
        ");
    }

    public static async Task EnsureCookieConsentsTableAsync(ApplicationDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS cookieconsents (
                id SERIAL PRIMARY KEY
            );
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE cookieconsents ADD COLUMN IF NOT EXISTS visitorid VARCHAR(64) NOT NULL DEFAULT '';
            ALTER TABLE cookieconsents ADD COLUMN IF NOT EXISTS userid INTEGER NULL;
            ALTER TABLE cookieconsents ADD COLUMN IF NOT EXISTS essential BOOLEAN NOT NULL DEFAULT TRUE;
            ALTER TABLE cookieconsents ADD COLUMN IF NOT EXISTS analytics BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE cookieconsents ADD COLUMN IF NOT EXISTS marketing BOOLEAN NOT NULL DEFAULT FALSE;
            ALTER TABLE cookieconsents ADD COLUMN IF NOT EXISTS useragent VARCHAR(512) NULL;
            ALTER TABLE cookieconsents ADD COLUMN IF NOT EXISTS iphash VARCHAR(64) NULL;
            ALTER TABLE cookieconsents ADD COLUMN IF NOT EXISTS createdat TIMESTAMP NOT NULL DEFAULT NOW();
            ALTER TABLE cookieconsents ADD COLUMN IF NOT EXISTS updatedat TIMESTAMP NULL;
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE UNIQUE INDEX IF NOT EXISTS idx_cookieconsents_visitorid ON cookieconsents(visitorid);
            CREATE INDEX IF NOT EXISTS idx_cookieconsents_userid ON cookieconsents(userid);
            CREATE INDEX IF NOT EXISTS idx_cookieconsents_createdat ON cookieconsents(createdat DESC);
        ");
    }

    public static async Task EnsureTicketRefundRequestsTableAsync(ApplicationDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ticketrefundrequests (
                id SERIAL PRIMARY KEY
            );
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ticketrefundrequests ADD COLUMN IF NOT EXISTS userticketid INTEGER NOT NULL DEFAULT 0;
            ALTER TABLE ticketrefundrequests ADD COLUMN IF NOT EXISTS userid INTEGER NOT NULL DEFAULT 0;
            ALTER TABLE ticketrefundrequests ADD COLUMN IF NOT EXISTS eventid INTEGER NOT NULL DEFAULT 0;
            ALTER TABLE ticketrefundrequests ADD COLUMN IF NOT EXISTS reason TEXT NULL;
            ALTER TABLE ticketrefundrequests ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
            ALTER TABLE ticketrefundrequests ADD COLUMN IF NOT EXISTS createdat TIMESTAMP NOT NULL DEFAULT NOW();
            ALTER TABLE ticketrefundrequests ADD COLUMN IF NOT EXISTS reviewedat TIMESTAMP NULL;
            ALTER TABLE ticketrefundrequests ADD COLUMN IF NOT EXISTS reviewedbyadminid INTEGER NULL;
            ALTER TABLE ticketrefundrequests ADD COLUMN IF NOT EXISTS reviewcomment TEXT NULL;
        ");

        await db.Database.ExecuteSqlRawAsync(@"
            CREATE INDEX IF NOT EXISTS idx_ticketrefund_pending ON ticketrefundrequests(status) WHERE status = 'pending';
            CREATE INDEX IF NOT EXISTS idx_ticketrefund_eventid ON ticketrefundrequests(eventid);
        ");
    }

    public static async Task EnsureTicketTransferSchemaAsync(ApplicationDbContext db)
    {
        await db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE events ADD COLUMN IF NOT EXISTS allowtickettransfer BOOLEAN NOT NULL DEFAULT FALSE;
            CREATE TABLE IF NOT EXISTS tickettransfers (
                id SERIAL PRIMARY KEY,
                userticketid INTEGER NOT NULL,
                senderuserid INTEGER NOT NULL,
                recipientuserid INTEGER NOT NULL,
                recipientemail VARCHAR(120) NOT NULL,
                price NUMERIC(18,2) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                expiresat TIMESTAMPTZ NOT NULL,
                createdat TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                respondedat TIMESTAMPTZ NULL,
                completedat TIMESTAMPTZ NULL
            );
            CREATE INDEX IF NOT EXISTS ix_tickettransfers_recipient_pending
                ON tickettransfers(recipientuserid, status) WHERE status = 'pending';
            CREATE INDEX IF NOT EXISTS ix_tickettransfers_ticket_pending
                ON tickettransfers(userticketid, status) WHERE status = 'pending';
        ");
    }
}
