-- ============================================
-- Hagwon LMS - Supabase Database Schema
-- ============================================
-- This SQL creates all tables for the LMS system
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
    class_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. VOCABULARY CLASSES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vocabulary_classes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    parent_class_id UUID REFERENCES vocabulary_classes(id) ON DELETE CASCADE,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. VOCABULARY SETS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vocabulary_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id UUID REFERENCES vocabulary_classes(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('vocabulary', 'chunk-reading', 'sequence')),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 4. VOCABULARY WORDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS vocabulary_words (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID REFERENCES vocabulary_sets(id) ON DELETE CASCADE NOT NULL,
    word TEXT NOT NULL,
    meaning TEXT NOT NULL,
    example TEXT,
    pronunciation TEXT,
    level TEXT CHECK (level IN ('고1', '고2', '고3', '수능')),
    part_of_speech TEXT,
    synonyms TEXT[],
    antonyms TEXT[]
);

-- ============================================
-- 5. PASSAGES TABLE (구조독해)
-- ============================================
CREATE TABLE IF NOT EXISTS passages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    set_id UUID REFERENCES vocabulary_sets(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    sentences TEXT[] NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    source TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 6. SCORES TABLE (학생 채점 결과)
-- ============================================
CREATE TABLE IF NOT EXISTS scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    passage_id UUID REFERENCES passages(id) ON DELETE CASCADE NOT NULL,
    sentence_index INTEGER NOT NULL,
    chunk_reading_score INTEGER CHECK (chunk_reading_score >= 0 AND chunk_reading_score <= 100),
    translation_score INTEGER CHECK (translation_score >= 0 AND translation_score <= 100),
    passed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, passage_id, sentence_index)
);

-- ============================================
-- 7. SENTENCE ANALYSES TABLE (학생 구조 표시)
-- ============================================
CREATE TABLE IF NOT EXISTS sentence_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    passage_id UUID REFERENCES passages(id) ON DELETE CASCADE NOT NULL,
    sentence_index INTEGER NOT NULL,
    groups JSONB NOT NULL, -- WordGroup[] from types/chunk-reading.ts
    translation TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, passage_id, sentence_index)
);

-- ============================================
-- 8. CLASS-STUDENTS JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS class_students (
    class_id UUID REFERENCES vocabulary_classes(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (class_id, student_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_vocabulary_sets_class_id ON vocabulary_sets(class_id);
CREATE INDEX IF NOT EXISTS idx_vocabulary_words_set_id ON vocabulary_words(set_id);
CREATE INDEX IF NOT EXISTS idx_passages_set_id ON passages(set_id);
CREATE INDEX IF NOT EXISTS idx_passages_created_by ON passages(created_by);
CREATE INDEX IF NOT EXISTS idx_scores_student_id ON scores(student_id);
CREATE INDEX IF NOT EXISTS idx_scores_passage_id ON scores(passage_id);
CREATE INDEX IF NOT EXISTS idx_sentence_analyses_student_id ON sentence_analyses(student_id);
CREATE INDEX IF NOT EXISTS idx_sentence_analyses_passage_id ON sentence_analyses(passage_id);
CREATE INDEX IF NOT EXISTS idx_class_students_class_id ON class_students(class_id);
CREATE INDEX IF NOT EXISTS idx_class_students_student_id ON class_students(student_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocabulary_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE sentence_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_students ENABLE ROW LEVEL SECURITY;

-- Users: Everyone can read, only admins can write
CREATE POLICY "Users are viewable by everyone" ON users
    FOR SELECT USING (true);

CREATE POLICY "Only admins can insert users" ON users
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Only admins can update users" ON users
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Vocabulary Classes: Students can read, admins can write
CREATE POLICY "Classes are viewable by everyone" ON vocabulary_classes
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage classes" ON vocabulary_classes
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Vocabulary Sets: Students can read, admins can write
CREATE POLICY "Sets are viewable by everyone" ON vocabulary_sets
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage sets" ON vocabulary_sets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Vocabulary Words: Students can read, admins can write
CREATE POLICY "Words are viewable by everyone" ON vocabulary_words
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage words" ON vocabulary_words
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Passages: Students can read, admins can write
CREATE POLICY "Passages are viewable by everyone" ON passages
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage passages" ON passages
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- Scores: Students can view their own, admins can view all
CREATE POLICY "Students can view their own scores" ON scores
    FOR SELECT USING (
        student_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Students can insert their own scores" ON scores
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own scores" ON scores
    FOR UPDATE USING (student_id = auth.uid());

-- Sentence Analyses: Students can manage their own, admins can view all
CREATE POLICY "Students can view their own analyses" ON sentence_analyses
    FOR SELECT USING (
        student_id = auth.uid() OR 
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

CREATE POLICY "Students can insert their own analyses" ON sentence_analyses
    FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can update their own analyses" ON sentence_analyses
    FOR UPDATE USING (student_id = auth.uid());

-- Class Students: Everyone can read, admins can write
CREATE POLICY "Class rosters are viewable by everyone" ON class_students
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage class rosters" ON class_students
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_vocabulary_classes_updated_at
    BEFORE UPDATE ON vocabulary_classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vocabulary_sets_updated_at
    BEFORE UPDATE ON vocabulary_sets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scores_updated_at
    BEFORE UPDATE ON scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sentence_analyses_updated_at
    BEFORE UPDATE ON sentence_analyses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-calculate 'passed' status on scores
CREATE OR REPLACE FUNCTION calculate_passed_status()
RETURNS TRIGGER AS $$
BEGIN
    NEW.passed := (
        (NEW.chunk_reading_score IS NOT NULL AND NEW.chunk_reading_score >= 80) AND
        (NEW.translation_score IS NOT NULL AND NEW.translation_score >= 80)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_passed_on_insert
    BEFORE INSERT ON scores
    FOR EACH ROW EXECUTE FUNCTION calculate_passed_status();

CREATE TRIGGER calculate_passed_on_update
    BEFORE UPDATE ON scores
    FOR EACH ROW EXECUTE FUNCTION calculate_passed_status();

-- ============================================
-- SEED DATA (for testing)
-- ============================================

-- Insert test admin user
INSERT INTO users (id, username, email, name, role) VALUES
    ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@cheonghan.com', '관리자', 'admin');

-- Insert test students
INSERT INTO users (id, username, email, name, role, class_name) VALUES
    ('00000000-0000-0000-0000-000000000002', 'student1', 'student1@cheonghan.com', '김철수', 'student', '고3 A반'),
    ('00000000-0000-0000-0000-000000000003', 'student2', 'student2@cheonghan.com', '이영희', 'student', '고3 A반'),
    ('00000000-0000-0000-0000-000000000004', 'student3', 'student3@cheonghan.com', '박민수', 'student', '고3 B반');

-- Insert test class
INSERT INTO vocabulary_classes (id, name, description, color, created_by) VALUES
    ('00000000-0000-0000-0000-000000000010', '고3 A반', '2024년 고3 A반 공통 어휘', '#3B82F6', '00000000-0000-0000-0000-000000000001');

-- Insert students into class
INSERT INTO class_students (class_id, student_id) VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000002'),
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000003');
