-- Fase 3.1 - Fundacao academica, historico de matricula e notificacoes

CREATE TABLE IF NOT EXISTS academic_terms (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  starts_at TIMESTAMP NOT NULL,
  ends_at TIMESTAMP NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_sections (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  academic_term_id INTEGER NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  room TEXT,
  schedule_summary TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS class_section_teachers (
  class_section_id INTEGER NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_section_id, teacher_id)
);

ALTER TABLE enrollments
  ADD COLUMN IF NOT EXISTS class_section_id INTEGER REFERENCES class_sections(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS academic_term_id INTEGER REFERENCES academic_terms(id) ON DELETE SET NULL;

DROP INDEX IF EXISTS enrollments_student_course_unique;
CREATE UNIQUE INDEX IF NOT EXISTS enrollments_student_course_term_unique
  ON enrollments(student_id, course_id, academic_term_id);

CREATE TABLE IF NOT EXISTS enrollment_status_history (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  previous_status TEXT,
  next_status TEXT NOT NULL,
  changed_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approved_subject_records (
  id SERIAL PRIMARY KEY,
  enrollment_id INTEGER NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  approved_grade INTEGER,
  approved_at TIMESTAMP NOT NULL DEFAULT NOW(),
  snapshot_batch_id TEXT,
  source TEXT NOT NULL DEFAULT 'lock_snapshot',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS announcement_targets (
  announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id INTEGER NOT NULL,
  PRIMARY KEY (announcement_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  destination_route TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id INTEGER,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx ON notifications(user_id, is_read, created_at DESC);

INSERT INTO academic_terms (code, name, starts_at, ends_at, is_active)
SELECT
  'LEGACY',
  'Periodo legado',
  NOW() - INTERVAL '5 years',
  NOW() + INTERVAL '5 years',
  TRUE
WHERE NOT EXISTS (SELECT 1 FROM academic_terms);

WITH selected_term AS (
  SELECT id
  FROM academic_terms
  ORDER BY is_active DESC, starts_at DESC
  LIMIT 1
)
INSERT INTO class_sections (code, name, course_id, academic_term_id, schedule_summary)
SELECT
  CONCAT(c.code, '-LEGACY-T1'),
  'Turma Legacy',
  c.id,
  st.id,
  c.schedule
FROM courses c
CROSS JOIN selected_term st
WHERE NOT EXISTS (
  SELECT 1
  FROM class_sections cs
  WHERE cs.course_id = c.id
);

INSERT INTO class_section_teachers (class_section_id, teacher_id)
SELECT cs.id, c.teacher_id
FROM class_sections cs
JOIN courses c ON c.id = cs.course_id
WHERE c.teacher_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE enrollments e
SET class_section_id = selected_section.id
FROM LATERAL (
  SELECT cs.id
  FROM class_sections cs
  WHERE cs.course_id = e.course_id
  ORDER BY cs.created_at
  LIMIT 1
) AS selected_section
WHERE e.class_section_id IS NULL;

UPDATE enrollments e
SET academic_term_id = cs.academic_term_id
FROM class_sections cs
WHERE e.class_section_id = cs.id
  AND e.academic_term_id IS NULL;

WITH selected_term AS (
  SELECT id
  FROM academic_terms
  ORDER BY is_active DESC, starts_at DESC
  LIMIT 1
)
UPDATE enrollments e
SET academic_term_id = st.id
FROM selected_term st
WHERE e.academic_term_id IS NULL;

INSERT INTO enrollment_status_history (enrollment_id, previous_status, next_status, reason)
SELECT e.id, NULL, e.status, 'Bootstrap de historico de matricula'
FROM enrollments e
WHERE NOT EXISTS (
  SELECT 1
  FROM enrollment_status_history h
  WHERE h.enrollment_id = e.id
);

INSERT INTO announcement_targets (announcement_id, target_type, target_id)
SELECT ac.announcement_id, 'course', ac.course_id
FROM announcement_courses ac
ON CONFLICT DO NOTHING;
