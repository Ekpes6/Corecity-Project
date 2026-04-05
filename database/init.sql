-- ─────────────────────────────────────────────────────────────────────────
-- corecity Nigeria - Database Initialization Script
-- ─────────────────────────────────────────────────────────────────────────

CREATE DATABASE IF NOT EXISTS corecity_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE corecity_db;

-- ─── Users ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) NOT NULL UNIQUE,
    phone       VARCHAR(20) NOT NULL UNIQUE,   -- Nigerian format: +234XXXXXXXXXX
    password    VARCHAR(255) NOT NULL,
    first_name  VARCHAR(100) NOT NULL,
    last_name   VARCHAR(100) NOT NULL,
    role        ENUM('BUYER','SELLER','AGENT','ADMIN') NOT NULL DEFAULT 'BUYER',
    nin         VARCHAR(11),                   -- National Identification Number
    bvn         VARCHAR(11),                   -- Bank Verification Number
    is_verified BOOLEAN DEFAULT FALSE,
    avatar_url  VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── States & LGAs (Nigerian) ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS states (
    id   INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS lgas (
    id       INT AUTO_INCREMENT PRIMARY KEY,
    state_id INT NOT NULL,
    name     VARCHAR(100) NOT NULL,
    FOREIGN KEY (state_id) REFERENCES states(id)
);

-- ─── Properties ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS properties (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(255) NOT NULL,
    description      TEXT,
    property_type    ENUM('APARTMENT','BUNGALOW','DUPLEX','TERRACED','SEMI_DETACHED','DETACHED','LAND','COMMERCIAL') NOT NULL,
    listing_type     ENUM('FOR_SALE','FOR_RENT','SHORT_LET') NOT NULL,
    price            DECIMAL(15,2) NOT NULL,        -- in NGN (Naira)
    price_period     ENUM('OUTRIGHT','PER_YEAR','PER_MONTH','PER_NIGHT') DEFAULT 'OUTRIGHT',
    bedrooms         INT DEFAULT 0,
    bathrooms        INT DEFAULT 0,
    toilets          INT DEFAULT 0,
    size_sqm         DECIMAL(10,2),
    address          VARCHAR(500) NOT NULL,
    state_id         INT,
    lga_id           INT,
    latitude         DECIMAL(10,8),
    longitude        DECIMAL(11,8),
    owner_id         BIGINT NOT NULL,
    agent_id         BIGINT,
    status           ENUM('PENDING','ACTIVE','SOLD','RENTED','INACTIVE') DEFAULT 'PENDING',
    is_negotiable    BOOLEAN DEFAULT TRUE,
    amenities        JSON,                          -- e.g. ["BOREHOLE","GENERATOR","CCTV","GYM"]
    views_count      INT DEFAULT 0,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id),
    FOREIGN KEY (state_id) REFERENCES states(id),
    FOREIGN KEY (lga_id) REFERENCES lgas(id)
);

-- ─── Property Images ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS property_files (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    property_id  BIGINT NOT NULL,
    file_url     VARCHAR(500) NOT NULL,
    file_type    ENUM('IMAGE','VIDEO','DOCUMENT','VIRTUAL_TOUR') DEFAULT 'IMAGE',
    is_primary   BOOLEAN DEFAULT FALSE,
    uploaded_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- ─── Transactions (Paystack Integration) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
    id               BIGINT AUTO_INCREMENT PRIMARY KEY,
    reference        VARCHAR(100) NOT NULL UNIQUE,  -- Paystack reference
    property_id      BIGINT NOT NULL,
    buyer_id         BIGINT NOT NULL,
    seller_id        BIGINT NOT NULL,
    amount           DECIMAL(15,2) NOT NULL,         -- in NGN
    service_fee      DECIMAL(15,2) NOT NULL DEFAULT 0,
    type             ENUM('RENT','PURCHASE','INSPECTION_FEE','AGENT_FEE') NOT NULL,
    status           ENUM('INITIATED','PENDING','SUCCESS','FAILED','REFUNDED') DEFAULT 'INITIATED',
    payment_channel  VARCHAR(50),                    -- card, bank_transfer, ussd
    paystack_data    JSON,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (buyer_id) REFERENCES users(id),
    FOREIGN KEY (seller_id) REFERENCES users(id)
);

-- ─── Notifications ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    title      VARCHAR(255) NOT NULL,
    message    TEXT NOT NULL,
    type       ENUM('SYSTEM','TRANSACTION','PROPERTY','ENQUIRY','VERIFICATION') NOT NULL,
    channel    ENUM('IN_APP','EMAIL','SMS','PUSH') NOT NULL,
    is_read    BOOLEAN DEFAULT FALSE,
    meta       JSON,
    sent_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ─── Enquiries ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enquiries (
    id           BIGINT AUTO_INCREMENT PRIMARY KEY,
    property_id  BIGINT NOT NULL,
    sender_id    BIGINT NOT NULL,
    message      TEXT NOT NULL,
    status       ENUM('NEW','READ','REPLIED') DEFAULT 'NEW',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES properties(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- ─── Saved / Favourites ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_properties (
    user_id     BIGINT NOT NULL,
    property_id BIGINT NOT NULL,
    saved_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, property_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (property_id) REFERENCES properties(id)
);

-- ─── Seed: Nigerian States ───────────────────────────────────────────────
INSERT INTO states (name) VALUES
('Abia'),('Adamawa'),('Akwa Ibom'),('Anambra'),('Bauchi'),('Bayelsa'),
('Benue'),('Borno'),('Cross River'),('Delta'),('Ebonyi'),('Edo'),
('Ekiti'),('Enugu'),('FCT - Abuja'),('Gombe'),('Imo'),('Jigawa'),
('Kaduna'),('Kano'),('Katsina'),('Kebbi'),('Kogi'),('Kwara'),
('Lagos'),('Nasarawa'),('Niger'),('Ogun'),('Ondo'),('Osun'),
('Oyo'),('Plateau'),('Rivers'),('Sokoto'),('Taraba'),('Yobe'),('Zamfara');

-- Seed a few LGAs for Rivers State (id=33) and Lagos (id=25)
INSERT INTO lgas (state_id, name) VALUES
(33,'Port Harcourt'),(33,'Obio-Akpor'),(33,'Eleme'),(33,'Ikwerre'),(33,'Etche'),
(25,'Lagos Island'),(25,'Lagos Mainland'),(25,'Ikeja'),(25,'Lekki'),(25,'Surulere'),
(25,'Victoria Island'),(25,'Ikorodu'),(25,'Alimosho'),(25,'Eti-Osa'),
(15,'Abuja Municipal'),(15,'Gwagwalada'),(15,'Kuje'),(15,'Bwari');
