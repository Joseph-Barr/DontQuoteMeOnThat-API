CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id uuid DEFAULT uuid_generate_v4 (),
    username VARCHAR (255) UNIQUE NOT NULL, 
    password VARCHAR(255) NOT NULL,
    permission_level VARCHAR(10) DEFAULT 'user',
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS quotes (
    id uuid DEFAULT uuid_generate_v4 (),
    text TEXT NOT NULL,
    by VARCHAR (255) DEFAULT 'Anonymous',
    year INT,
    creator uuid NOT NULL,
    public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (creator) REFERENCES users(id)
);