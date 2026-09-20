-- ==============================================================================
-- TaskFlow Database Schema (Supabase / PostgreSQL)
-- Academic Project: Task Management System
-- ==============================================================================

-- 1. Enable UUID extension (enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop existing tables if re-running script (Order respects foreign keys)
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Users Table
-- Stores user credentials and profile details.
-- Passwords are encrypted via bcrypt in the backend before insertion.
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 4. Tasks Table
-- Stores individual tasks linked directly to the creator (One-to-Many).
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('Low', 'Medium', 'High')) DEFAULT 'Medium',
    status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'In Progress', 'Completed')) DEFAULT 'Pending',
    due_date TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Performance Indexes
-- Essential for fast lookups by user and status filtering
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_users_email ON users(email);

-- 6. Trigger to automatically update updated_at timestamp on task modification
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_task_timestamp
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- ==============================================================================
-- Demo Academic Seed Data (Optional for testing directly in Supabase SQL editor)
-- Default test user password: "Password123!" (hashed with bcrypt 10 salt rounds)
-- ==============================================================================

INSERT INTO users (id, name, email, password) VALUES
('a0000000-0000-0000-0000-000000000001', 'Harshika Sharma', 'harshika@example.com', '$2a$10$sPJFBM/pwKzKhO6YAttXY.e8T.renYSXyln4LlNcE30rbm/rreS4.')
ON CONFLICT (email) DO NOTHING;

INSERT INTO tasks (id, user_id, title, description, priority, status, due_date) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Complete DSA Assignment', 'Solve array, stack and linked-list practice problems on dynamic programming.', 'High', 'In Progress', NOW() + INTERVAL '3 days'),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Prepare Software Engineering Notes', 'Review SRS documentation, DFD diagrams and agile methodology questions.', 'Medium', 'Pending', NOW() + INTERVAL '5 days'),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Submit DBMS Practical', 'Execute SQL queries for normalization and trigger implementation.', 'High', 'Completed', NOW() - INTERVAL '1 day'),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Prepare Mid-Sem Presentation', 'Create PowerPoint slides for semester project viva demonstration.', 'High', 'Pending', NOW() + INTERVAL '2 days'),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Complete Project Documentation', 'Finalize ER diagrams, API test cases, and viva question bank in README.', 'Low', 'In Progress', NOW() + INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;
