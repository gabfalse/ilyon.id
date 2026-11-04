-- ============================================================
-- ILYON ACADEMY MANAGEMENT SYSTEM
-- PostgreSQL schema for Neon
-- Version: 1.0
-- Run this script in the Neon SQL Editor on an empty database.
--
-- Design notes:
-- 1. One PostgreSQL database for all Ilyon branches.
-- 2. branch_id scopes branch-level operational records.
-- 3. Payments are recorded and verified manually.
-- 4. A parent account can be linked to multiple students.
-- 5. A tutor can be assigned to multiple branches.
-- 6. Flexible tutor compensation methods are supported.
-- 7. Clinic visits support flexible student arrival times.
-- ============================================================

BEGIN;

-- ---------- Reusable trigger function ----------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ---------- A. Organization and branches ----------
CREATE TABLE organization_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_name VARCHAR(180) NOT NULL DEFAULT 'Ilyon Academy',
    legal_name VARCHAR(180),
    logo_file_id UUID,
    email VARCHAR(180),
    phone VARCHAR(40),
    whatsapp VARCHAR(40),
    website_url TEXT,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    timezone VARCHAR(60) NOT NULL DEFAULT 'Asia/Jakarta',
    currency CHAR(3) NOT NULL DEFAULT 'IDR',
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_code VARCHAR(30) NOT NULL UNIQUE,
    branch_name VARCHAR(150) NOT NULL,
    phone VARCHAR(40),
    whatsapp VARCHAR(40),
    email VARCHAR(180),
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    postal_code VARCHAR(20),
    is_head_office BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    opened_at DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE branch_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL UNIQUE REFERENCES branches(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- B. Authentication, roles, permissions ----------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(180) UNIQUE,
    phone VARCHAR(40) UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(180) NOT NULL,
    avatar_file_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_code VARCHAR(40) NOT NULL UNIQUE,
    role_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_code VARCHAR(100) NOT NULL UNIQUE,
    permission_name VARCHAR(150) NOT NULL,
    module VARCHAR(80) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- branch_id NULL means organization-wide role assignment.
CREATE TABLE user_branch_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id, branch_id)
);

CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token_hash TEXT NOT NULL UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- C. Students and parents ----------
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_code VARCHAR(40) NOT NULL UNIQUE,
    primary_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    full_name VARCHAR(180) NOT NULL,
    nickname VARCHAR(100),
    gender VARCHAR(20) CHECK (gender IN ('male','female','other','unspecified')),
    birth_date DATE,
    school_name VARCHAR(180),
    school_grade VARCHAR(80),
    school_dismissal_time TIME,
    address TEXT,
    city VARCHAR(100),
    province VARCHAR(100),
    student_phone VARCHAR(40),
    notes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','inactive','graduated','transferred','withdrawn')),
    photo_file_id UUID,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(180) NOT NULL,
    relationship_label VARCHAR(50),
    phone VARCHAR(40),
    whatsapp VARCHAR(40),
    email VARCHAR(180),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE student_parents (
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    parent_id UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    is_primary_contact BOOLEAN NOT NULL DEFAULT FALSE,
    can_view_progress BOOLEAN NOT NULL DEFAULT TRUE,
    can_receive_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    relationship_label VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_id, parent_id)
);

CREATE TABLE student_branch_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    from_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    to_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reason TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- D. Tutors and staff ----------
CREATE TABLE tutor_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    tutor_code VARCHAR(40) UNIQUE,
    education_level VARCHAR(100),
    education_major VARCHAR(150),
    experience_years NUMERIC(4,1) CHECK (experience_years >= 0),
    expertise TEXT[],
    employment_status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (employment_status IN ('active','inactive','resigned','on_leave')),
    join_date DATE,
    emergency_contact_name VARCHAR(180),
    emergency_contact_phone VARCHAR(40),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tutor_branch_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    assigned_from DATE NOT NULL DEFAULT CURRENT_DATE,
    assigned_until DATE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tutor_id, branch_id, assigned_from),
    CHECK (assigned_until IS NULL OR assigned_until >= assigned_from)
);

CREATE TABLE staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    staff_code VARCHAR(40) UNIQUE,
    job_title VARCHAR(120),
    employment_status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (employment_status IN ('active','inactive','resigned','on_leave')),
    join_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- E. Programs, subjects, classes and schedules ----------
CREATE TABLE programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_code VARCHAR(40) NOT NULL UNIQUE,
    program_name VARCHAR(150) NOT NULL,
    delivery_type VARCHAR(30) NOT NULL
        CHECK (delivery_type IN ('onsite','visit','online','other')),
    program_model VARCHAR(40) NOT NULL
        CHECK (program_model IN ('daily_clinic','monthly_regular','private','small_group','special_course','custom')),
    description TEXT,
    default_duration_minutes INTEGER CHECK (default_duration_minutes > 0),
    default_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (default_price >= 0),
    billing_period VARCHAR(30) NOT NULL DEFAULT 'per_session'
        CHECK (billing_period IN ('per_session','weekly','monthly','package','custom')),
    min_students INTEGER CHECK (min_students IS NULL OR min_students >= 1),
    max_students INTEGER CHECK (max_students IS NULL OR max_students >= 1),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (max_students IS NULL OR min_students IS NULL OR max_students >= min_students)
);

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_code VARCHAR(40) NOT NULL UNIQUE,
    subject_name VARCHAR(120) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE program_subjects (
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (program_id, subject_id)
);

CREATE TABLE student_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('pending','active','paused','completed','cancelled')),
    agreed_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (agreed_price >= 0),
    billing_period VARCHAR(30),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE TABLE classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    class_code VARCHAR(40),
    class_name VARCHAR(150) NOT NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    location TEXT,
    capacity INTEGER CHECK (capacity IS NULL OR capacity >= 1),
    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','inactive','completed')),
    start_date DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (branch_id, class_code)
);

CREATE TABLE class_members (
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    enrollment_id UUID REFERENCES student_enrollments(id) ON DELETE SET NULL,
    joined_at DATE NOT NULL DEFAULT CURRENT_DATE,
    left_at DATE,
    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','completed','left')),
    PRIMARY KEY (class_id, student_id),
    CHECK (left_at IS NULL OR left_at >= joined_at)
);

CREATE TABLE class_tutors (
    class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE RESTRICT,
    assigned_from DATE NOT NULL DEFAULT CURRENT_DATE,
    assigned_until DATE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (class_id, tutor_id, assigned_from),
    CHECK (assigned_until IS NULL OR assigned_until >= assigned_from)
);

CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    program_id UUID NOT NULL REFERENCES programs(id) ON DELETE RESTRICT,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    tutor_id UUID REFERENCES tutor_profiles(id) ON DELETE SET NULL,
    schedule_title VARCHAR(180),
    day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME,
    end_time TIME,
    start_date DATE,
    end_date DATE,
    location TEXT,
    is_flexible BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(30) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','cancelled','completed')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (start_time IS NULL OR end_time IS NULL OR end_time > start_time),
    CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

-- ---------- F. Attendance and clinic visits ----------
CREATE TABLE attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
    class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
    session_date DATE NOT NULL DEFAULT CURRENT_DATE,
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    session_type VARCHAR(30) NOT NULL DEFAULT 'scheduled'
        CHECK (session_type IN ('scheduled','clinic','private','small_group','makeup','other')),
    status VARCHAR(30) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','completed','cancelled')),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

CREATE TABLE student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('present','late','sick','permission','absent')),
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    note TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (session_id, student_id),
    CHECK (check_out_at IS NULL OR check_in_at IS NULL OR check_out_at >= check_in_at)
);

CREATE TABLE tutor_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    tutor_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE RESTRICT,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_at TIMESTAMPTZ,
    check_out_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL
        CHECK (status IN ('present','late','sick','permission','absent')),
    note TEXT,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tutor_id, attendance_date),
    CHECK (check_out_at IS NULL OR check_in_at IS NULL OR check_out_at >= check_in_at)
);

CREATE TABLE clinic_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    enrollment_id UUID REFERENCES student_enrollments(id) ON DELETE SET NULL,
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    check_out_at TIMESTAMPTZ,
    tutor_id UUID REFERENCES tutor_profiles(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    learning_summary TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'completed'
        CHECK (status IN ('in_progress','completed','cancelled')),
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (check_out_at IS NULL OR check_out_at >= check_in_at)
);

-- ---------- G. Invoices, payments and finance ----------
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) NOT NULL UNIQUE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    enrollment_id UUID REFERENCES student_enrollments(id) ON DELETE SET NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    period_start DATE,
    period_end DATE,
    subtotal NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    status VARCHAR(30) NOT NULL DEFAULT 'unpaid'
        CHECK (status IN ('draft','unpaid','partial','paid','overdue','cancelled')),
    notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (due_date IS NULL OR due_date >= issue_date),
    CHECK (paid_amount <= total_amount)
);

CREATE TABLE invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(240) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    line_total NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (line_total >= 0),
    enrollment_id UUID REFERENCES student_enrollments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number VARCHAR(50) NOT NULL UNIQUE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30) NOT NULL DEFAULT 'bank_transfer'
        CHECK (payment_method IN ('cash','bank_transfer','e_wallet','other')),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reference_number VARCHAR(120),
    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','verified','rejected','refunded')),
    submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    verification_note TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (verified_at IS NULL OR verified_at >= paid_at)
);

CREATE TABLE payment_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    file_id UUID,
    file_url TEXT,
    original_file_name VARCHAR(255),
    mime_type VARCHAR(120),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (file_id IS NOT NULL OR file_url IS NOT NULL)
);

CREATE TABLE expense_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(120) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number VARCHAR(50) UNIQUE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES expense_categories(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(30)
        CHECK (payment_method IN ('cash','bank_transfer','e_wallet','other')),
    receipt_file_id UUID,
    recorded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'approved'
        CHECK (status IN ('draft','pending','approved','rejected')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tutor_compensation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    compensation_type VARCHAR(30) NOT NULL
        CHECK (compensation_type IN ('monthly_fixed','per_session','per_student','mixed')),
    fixed_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (fixed_amount >= 0),
    per_session_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (per_session_amount >= 0),
    per_student_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (per_student_amount >= 0),
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_until DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (effective_until IS NULL OR effective_until >= effective_from)
);

CREATE TABLE tutor_payroll (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_number VARCHAR(50) NOT NULL UNIQUE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    tutor_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE RESTRICT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (base_amount >= 0),
    adjustment_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    deduction_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (deduction_amount >= 0),
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','approved','paid','cancelled')),
    paid_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (period_end >= period_start)
);

CREATE TABLE tutor_payroll_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_id UUID NOT NULL REFERENCES tutor_payroll(id) ON DELETE CASCADE,
    description VARCHAR(240) NOT NULL,
    quantity NUMERIC(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    source_session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- H. Curriculum, learning and progress ----------
CREATE TABLE curriculum_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    level_code VARCHAR(40) NOT NULL,
    level_name VARCHAR(120) NOT NULL,
    level_order INTEGER NOT NULL DEFAULT 1 CHECK (level_order > 0),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subject_id, level_code),
    UNIQUE (subject_id, level_order)
);

CREATE TABLE curriculum_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level_id UUID NOT NULL REFERENCES curriculum_levels(id) ON DELETE CASCADE,
    material_title VARCHAR(180) NOT NULL,
    material_description TEXT,
    material_order INTEGER NOT NULL DEFAULT 1 CHECK (material_order > 0),
    content TEXT,
    attachment_file_id UUID,
    estimated_duration_minutes INTEGER CHECK (estimated_duration_minutes > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (level_id, material_order)
);

CREATE TABLE learning_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    tutor_id UUID REFERENCES tutor_profiles(id) ON DELETE SET NULL,
    session_id UUID REFERENCES attendance_sessions(id) ON DELETE SET NULL,
    clinic_visit_id UUID REFERENCES clinic_visits(id) ON DELETE SET NULL,
    subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
    material_id UUID REFERENCES curriculum_materials(id) ON DELETE SET NULL,
    learning_date DATE NOT NULL DEFAULT CURRENT_DATE,
    topic VARCHAR(180),
    activity_notes TEXT,
    strengths TEXT,
    difficulties TEXT,
    follow_up TEXT,
    score NUMERIC(6,2),
    max_score NUMERIC(6,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (score IS NULL OR score >= 0),
    CHECK (max_score IS NULL OR max_score > 0),
    CHECK (score IS NULL OR max_score IS NULL OR score <= max_score)
);

CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    level_id UUID REFERENCES curriculum_levels(id) ON DELETE SET NULL,
    assessment_name VARCHAR(180) NOT NULL,
    assessment_type VARCHAR(30) NOT NULL DEFAULT 'test'
        CHECK (assessment_type IN ('quiz','test','exam','practice','review','other')),
    assessment_date DATE,
    max_score NUMERIC(8,2) NOT NULL DEFAULT 100 CHECK (max_score > 0),
    description TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assessment_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    score NUMERIC(8,2) NOT NULL CHECK (score >= 0),
    feedback TEXT,
    assessed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, student_id)
);

CREATE TABLE student_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
    level_id UUID REFERENCES curriculum_levels(id) ON DELETE SET NULL,
    progress_status VARCHAR(30) NOT NULL DEFAULT 'in_progress'
        CHECK (progress_status IN ('not_started','in_progress','mastered','needs_review')),
    progress_percent NUMERIC(5,2) CHECK (progress_percent BETWEEN 0 AND 100),
    started_at DATE,
    completed_at DATE,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE progress_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE RESTRICT,
    parent_id UUID REFERENCES parents(id) ON DELETE SET NULL,
    tutor_id UUID REFERENCES tutor_profiles(id) ON DELETE SET NULL,
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    report_title VARCHAR(180),
    academic_summary TEXT,
    behavior_summary TEXT,
    recommendations TEXT,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (report_period_end >= report_period_start)
);

-- ---------- I. Announcements and notifications ----------
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    body TEXT NOT NULL,
    audience VARCHAR(30) NOT NULL DEFAULT 'all'
        CHECK (audience IN ('all','admin','tutor','parent','student')),
    publish_from TIMESTAMPTZ,
    publish_until TIMESTAMPTZ,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (publish_until IS NULL OR publish_from IS NULL OR publish_until >= publish_from)
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    title VARCHAR(180) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(50),
    reference_table VARCHAR(80),
    reference_id UUID,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notification_reads (
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (notification_id, user_id)
);

-- ---------- J. Registration and public website ----------
CREATE TABLE registration_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    student_name VARCHAR(180) NOT NULL,
    birth_date DATE,
    school_name VARCHAR(180),
    school_grade VARCHAR(80),
    parent_name VARCHAR(180) NOT NULL,
    parent_phone VARCHAR(40) NOT NULL,
    parent_email VARCHAR(180),
    address TEXT,
    program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
    preferred_schedule TEXT,
    notes TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new','contacted','trial','accepted','rejected','converted')),
    converted_student_id UUID REFERENCES students(id) ON DELETE SET NULL,
    handled_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE registration_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_lead_id UUID NOT NULL REFERENCES registration_leads(id) ON DELETE CASCADE,
    file_id UUID,
    file_url TEXT,
    document_type VARCHAR(80),
    original_file_name VARCHAR(255),
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (file_id IS NOT NULL OR file_url IS NOT NULL)
);

CREATE TABLE website_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type VARCHAR(40) NOT NULL
        CHECK (content_type IN ('page','article','program_info','about','faq','other')),
    slug VARCHAR(180) NOT NULL UNIQUE,
    title VARCHAR(220) NOT NULL,
    excerpt TEXT,
    body TEXT,
    cover_file_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft','published','archived')),
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    title VARCHAR(180),
    description TEXT,
    file_id UUID,
    file_url TEXT,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (file_id IS NOT NULL OR file_url IS NOT NULL)
);

-- ---------- K. File metadata ----------
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    storage_provider VARCHAR(50) NOT NULL DEFAULT 'external',
    storage_key TEXT,
    file_url TEXT,
    original_file_name VARCHAR(255) NOT NULL,
    stored_file_name VARCHAR(255),
    mime_type VARCHAR(150),
    file_size_bytes BIGINT CHECK (file_size_bytes IS NULL OR file_size_bytes >= 0),
    checksum_sha256 VARCHAR(64),
    is_private BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (storage_key IS NOT NULL OR file_url IS NOT NULL)
);

-- Add file foreign keys after files table exists.
ALTER TABLE organization_settings
    ADD CONSTRAINT fk_org_logo_file FOREIGN KEY (logo_file_id) REFERENCES files(id) ON DELETE SET NULL;
ALTER TABLE users
    ADD CONSTRAINT fk_users_avatar_file FOREIGN KEY (avatar_file_id) REFERENCES files(id) ON DELETE SET NULL;
ALTER TABLE students
    ADD CONSTRAINT fk_students_photo_file FOREIGN KEY (photo_file_id) REFERENCES files(id) ON DELETE SET NULL;
ALTER TABLE expenses
    ADD CONSTRAINT fk_expenses_receipt_file FOREIGN KEY (receipt_file_id) REFERENCES files(id) ON DELETE SET NULL;
ALTER TABLE curriculum_materials
    ADD CONSTRAINT fk_material_attachment_file FOREIGN KEY (attachment_file_id) REFERENCES files(id) ON DELETE SET NULL;
ALTER TABLE learning_records
    ADD CONSTRAINT fk_learning_attachment_placeholder FOREIGN KEY (material_id) REFERENCES curriculum_materials(id) ON DELETE SET NULL;
ALTER TABLE payment_proofs
    ADD CONSTRAINT fk_payment_proof_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL;
ALTER TABLE registration_documents
    ADD CONSTRAINT fk_registration_document_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL;
ALTER TABLE website_content
    ADD CONSTRAINT fk_website_cover_file FOREIGN KEY (cover_file_id) REFERENCES files(id) ON DELETE SET NULL;
ALTER TABLE gallery
    ADD CONSTRAINT fk_gallery_file FOREIGN KEY (file_id) REFERENCES files(id) ON DELETE SET NULL;

-- ---------- L. Audit and system configuration ----------
CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_table VARCHAR(100),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(150) NOT NULL UNIQUE,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------- Indexes for common queries ----------
CREATE INDEX idx_students_branch_status ON students(primary_branch_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_students_name ON students USING gin (to_tsvector('simple', full_name));
CREATE INDEX idx_student_parents_parent ON student_parents(parent_id);
CREATE INDEX idx_enrollments_student_status ON student_enrollments(student_id, status);
CREATE INDEX idx_enrollments_branch ON student_enrollments(branch_id);
CREATE INDEX idx_tutor_branch_branch ON tutor_branch_assignments(branch_id);
CREATE INDEX idx_schedules_branch_date ON schedules(branch_id, start_date, status);
CREATE INDEX idx_attendance_sessions_branch_date ON attendance_sessions(branch_id, session_date);
CREATE INDEX idx_student_attendance_student ON student_attendance(student_id, created_at DESC);
CREATE INDEX idx_clinic_visits_branch_date ON clinic_visits(branch_id, visit_date);
CREATE INDEX idx_clinic_visits_student_date ON clinic_visits(student_id, visit_date DESC);
CREATE INDEX idx_invoices_branch_status ON invoices(branch_id, status);
CREATE INDEX idx_invoices_student_date ON invoices(student_id, issue_date DESC);
CREATE INDEX idx_payments_invoice_status ON payments(invoice_id, status);
CREATE INDEX idx_expenses_branch_date ON expenses(branch_id, expense_date DESC);
CREATE INDEX idx_learning_records_student_date ON learning_records(student_id, learning_date DESC);
CREATE INDEX idx_progress_reports_student_period ON progress_reports(student_id, report_period_end DESC);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_table, entity_id);

-- ---------- updated_at triggers ----------
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'organization_settings','branches','branch_settings','users','students',
        'parents','tutor_profiles','staff_profiles','programs','student_enrollments',
        'classes','schedules','invoices','expenses','curriculum_materials',
        'learning_records','student_progress','announcements','registration_leads',
        'website_content','system_settings'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
            'trg_' || t || '_updated_at', t
        );
    END LOOP;
END $$;

-- ---------- Initial roles ----------
INSERT INTO roles (role_code, role_name, description) VALUES
('super_admin', 'Admin Pusat', 'Mengelola seluruh cabang dan pengaturan lembaga.'),
('branch_admin', 'Admin Cabang', 'Mengelola operasional cabang yang ditugaskan.'),
('tutor', 'Tutor', 'Mengelola jadwal, absensi, catatan, dan perkembangan siswa yang ditugaskan.'),
('parent', 'Orang Tua', 'Memantau data, pembayaran, dan perkembangan anak.')
ON CONFLICT (role_code) DO NOTHING;

-- ---------- Initial subjects ----------
INSERT INTO subjects (subject_code, subject_name) VALUES
('CALISTUNG', 'Calistung'),
('MATH', 'Matematika'),
('ENGLISH', 'English'),
('MANDARIN', 'Mandarin'),
('JAPANESE', 'Japanese'),
('ARABIC', 'Bahasa Arab')
ON CONFLICT (subject_code) DO NOTHING;

-- ---------- Initial expense categories ----------
INSERT INTO expense_categories (category_name, description) VALUES
('Sewa', 'Biaya sewa tempat atau bangunan.'),
('Listrik dan Internet', 'Biaya listrik, air, dan internet.'),
('Alat Tulis dan Pembelajaran', 'Perlengkapan belajar dan alat tulis.'),
('Operasional', 'Pengeluaran operasional lainnya.'),
('Gaji dan Honor', 'Pembayaran gaji dan honor.')
ON CONFLICT (category_name) DO NOTHING;

COMMIT;

-- ============================================================
-- IMPORTANT IMPLEMENTATION NOTES
-- ============================================================
-- 1. Generate student_code in the application, for example IYS-00001.
--    Use a transaction/sequence-backed generator to prevent duplicates.
-- 2. Store only password hashes generated by a secure password-hashing
--    algorithm in the backend. Never store plain-text passwords.
-- 3. Enforce role and branch access in the PHP API on every request.
--    A branch_id column alone does not secure data.
-- 4. When a payment is verified, update the invoice paid_amount/status
--    in the same database transaction. Do not trust browser totals.
-- 5. Keep financial and attendance records; avoid hard deletion.
-- 6. File binaries should live in object storage or another file service.
--    The files table stores metadata and storage references.
-- 7. Add PostgreSQL Row Level Security only after the backend access
--    model and connection strategy are finalized.
-- 8. This schema is a strong initial foundation. Review business rules
--    and test migrations in a development Neon database before production.
