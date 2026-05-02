-- Tabelas semanais de aulas por turma e semestre letivo.

CREATE TABLE IF NOT EXISTS lesson_locations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_schedules (
  id SERIAL PRIMARY KEY,
  class_section_id INTEGER NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  academic_term_id INTEGER NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'noturno',
  created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT lesson_schedules_period_check CHECK (period IN ('matutino', 'vespertino', 'noturno'))
);

CREATE UNIQUE INDEX IF NOT EXISTS lesson_schedules_class_section_term_unique
  ON lesson_schedules(class_section_id, academic_term_id);

CREATE TABLE IF NOT EXISTS lesson_schedule_blocks (
  id SERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL REFERENCES lesson_schedules(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE RESTRICT,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  location_id INTEGER NOT NULL REFERENCES lesson_locations(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_schedule_slots (
  schedule_id INTEGER NOT NULL REFERENCES lesson_schedules(id) ON DELETE CASCADE,
  block_id INTEGER NOT NULL REFERENCES lesson_schedule_blocks(id) ON DELETE CASCADE,
  day_of_week TEXT NOT NULL,
  lesson_number INTEGER NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (schedule_id, day_of_week, lesson_number),
  CONSTRAINT lesson_schedule_slots_day_check CHECK (
    day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday')
  ),
  CONSTRAINT lesson_schedule_slots_lesson_check CHECK (lesson_number BETWEEN 1 AND 4)
);

CREATE TABLE IF NOT EXISTS lesson_schedule_drafts (
  id SERIAL PRIMARY KEY,
  class_section_id INTEGER NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  academic_term_id INTEGER NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL DEFAULT 'noturno',
  draft_payload JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT lesson_schedule_drafts_period_check CHECK (period IN ('matutino', 'vespertino', 'noturno'))
);

CREATE UNIQUE INDEX IF NOT EXISTS lesson_schedule_drafts_scope_unique
  ON lesson_schedule_drafts(class_section_id, academic_term_id, user_id);

INSERT INTO lesson_locations (name)
VALUES ('LAB 4'), ('SALA 23'), ('LAB 2'), ('SALA 12')
ON CONFLICT (name) DO NOTHING;
