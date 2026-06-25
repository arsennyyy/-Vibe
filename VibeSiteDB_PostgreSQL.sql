-- =============================================
-- PostgreSQL Database Schema for VibeSiteDB
-- Converted from SQL Server
-- =============================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS public;

-- Drop tables if they exist (in correct order due to foreign keys)
DROP TABLE IF EXISTS contactmessages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS usertickets CASCADE;
DROP TABLE IF EXISTS seats CASCADE;
DROP TABLE IF EXISTS tickettypes CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Table: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    passwordhash VARCHAR(100) NOT NULL,
    emailverified BOOLEAN NOT NULL DEFAULT FALSE,
    verificationtoken VARCHAR(500),
    tokenexpiresat TIMESTAMP,
    createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    isadmin BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX ix_users_email ON users(email);

-- 2. Table: events
CREATE TABLE events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    image VARCHAR(1000) NOT NULL,
    date TIMESTAMP NOT NULL,
    time VARCHAR(50) NOT NULL,
    location VARCHAR(500) NOT NULL,
    address VARCHAR(1000) NOT NULL,
    price VARCHAR(100) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    eventtype VARCHAR(100) NOT NULL,
    lineup TEXT,
    isfeatured BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX ix_events_date ON events(date);
CREATE INDEX ix_events_isfeatured ON events(isfeatured);

-- 3. Table: tickettypes
CREATE TABLE tickettypes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    price NUMERIC(18, 2) NOT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    eventid INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX ix_tickettypes_eventid ON tickettypes(eventid);

-- 4. Table: seats
CREATE TABLE seats (
    id SERIAL PRIMARY KEY,
    eventid INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    row VARCHAR(50) NOT NULL,
    number INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'available',
    type VARCHAR(50) NOT NULL DEFAULT 'standard',
    price NUMERIC(18, 2) NOT NULL,
    reservedbyuserid INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reservationexpiresat TIMESTAMP
);

CREATE INDEX ix_seats_eventid ON seats(eventid);
CREATE INDEX ix_seats_reservedbyuserid ON seats(reservedbyuserid);
CREATE INDEX ix_seats_status ON seats(status);

-- 5. Table: usertickets
CREATE TABLE usertickets (
    id SERIAL PRIMARY KEY,
    userid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    eventid INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    seatid INTEGER NOT NULL REFERENCES seats(id) ON DELETE CASCADE,
    tickettype VARCHAR(200) NOT NULL,
    price NUMERIC(18, 2) NOT NULL,
    purchasedate TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    eventdate TIMESTAMP NOT NULL,
    qrcode VARCHAR(1000) NOT NULL,
    isused BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX ix_usertickets_userid ON usertickets(userid);
CREATE INDEX ix_usertickets_eventid ON usertickets(eventid);
CREATE INDEX ix_usertickets_seatid ON usertickets(seatid);

-- 6. Table: orders
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    userid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ordernumber VARCHAR(100) NOT NULL UNIQUE,
    totalamount NUMERIC(18, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completedat TIMESTAMP
);

CREATE INDEX ix_orders_ordernumber ON orders(ordernumber);
CREATE INDEX ix_orders_status ON orders(status);

-- 7. Table: payments
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    orderid INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    userid INTEGER NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    amount NUMERIC(18, 2) NOT NULL,
    paymentmethod VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    transactionid VARCHAR(500),
    paymentdetails TEXT,
    createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completedat TIMESTAMP
);

CREATE INDEX ix_payments_orderid ON payments(orderid);
CREATE INDEX ix_payments_status ON payments(status);

-- 8. Table: reviews
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    userid INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    eventid INTEGER NOT NULL REFERENCES events(id) ON DELETE NO ACTION,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP,
    isapproved BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(userid, eventid)
);

CREATE INDEX ix_reviews_userid ON reviews(userid);
CREATE INDEX ix_reviews_eventid ON reviews(eventid);

-- 9. Table: notifications
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    userid INTEGER NOT NULL REFERENCES users(id) ON DELETE NO ACTION,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    isread BOOLEAN NOT NULL DEFAULT FALSE,
    createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    readat TIMESTAMP,
    relatedeventid INTEGER REFERENCES events(id) ON DELETE NO ACTION,
    relatedticketid INTEGER REFERENCES usertickets(id) ON DELETE NO ACTION
);

CREATE INDEX ix_notifications_userid ON notifications(userid);
CREATE INDEX ix_notifications_isread ON notifications(isread);

-- 10. Table: contactmessages
CREATE TABLE contactmessages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'new',
    createdat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolvedat TIMESTAMP,
    response TEXT,
    respondedbyuserid INTEGER
);

CREATE INDEX ix_contactmessages_status ON contactmessages(status);

PRINT 'All tables created successfully!';
