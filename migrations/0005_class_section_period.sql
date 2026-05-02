-- Move periodo academico da entidade curso para turma.

ALTER TABLE class_sections
  ADD COLUMN IF NOT EXISTS period TEXT NOT NULL DEFAULT 'noturno';

ALTER TABLE class_sections
  ADD COLUMN IF NOT EXISTS coordinator_teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS current_stage_number INTEGER NOT NULL DEFAULT 1;

ALTER TABLE course_subjects
  ADD COLUMN IF NOT EXISTS stage_number INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'course_subjects' AND column_name = 'semester'
  ) THEN
    UPDATE course_subjects
    SET stage_number = CASE
      WHEN semester ~ '^[0-9]+$' THEN semester::INTEGER
      ELSE 1
    END
    WHERE stage_number IS NULL OR stage_number = 1;
  END IF;
END $$;

DO $$
DECLARE
  has_section_schedule BOOLEAN;
  has_course_schedule BOOLEAN;
  source_expression TEXT;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'class_sections' AND column_name = 'schedule_summary'
  ) INTO has_section_schedule;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'courses' AND column_name = 'schedule'
  ) INTO has_course_schedule;

  IF has_section_schedule AND has_course_schedule THEN
    source_expression := 'COALESCE(cs.schedule_summary, c.schedule, '''')';
  ELSIF has_section_schedule THEN
    source_expression := 'COALESCE(cs.schedule_summary, '''')';
  ELSIF has_course_schedule THEN
    source_expression := 'COALESCE(c.schedule, '''')';
  ELSE
    RETURN;
  END IF;

  EXECUTE '
    UPDATE class_sections cs
    SET period = CASE
      WHEN LOWER(' || source_expression || ') LIKE ''%08:%''
        OR LOWER(' || source_expression || ') LIKE ''%09:%''
        OR LOWER(' || source_expression || ') LIKE ''%matutino%''
        OR LOWER(' || source_expression || ') LIKE ''%manha%''
        THEN ''matutino''
      WHEN LOWER(' || source_expression || ') LIKE ''%13:%''
        OR LOWER(' || source_expression || ') LIKE ''%14:%''
        OR LOWER(' || source_expression || ') LIKE ''%15:%''
        OR LOWER(' || source_expression || ') LIKE ''%vespertino%''
        OR LOWER(' || source_expression || ') LIKE ''%tarde%''
        THEN ''vespertino''
      ELSE ''noturno''
    END
    FROM courses c
    WHERE cs.course_id = c.id';
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'class_sections_period_check'
  ) THEN
    ALTER TABLE class_sections
      ADD CONSTRAINT class_sections_period_check
      CHECK (period IN ('matutino', 'vespertino', 'noturno'));
  END IF;
END $$;

ALTER TABLE class_sections
  DROP COLUMN IF EXISTS schedule_summary;

ALTER TABLE courses
  DROP COLUMN IF EXISTS schedule;

ALTER TABLE courses
  DROP COLUMN IF EXISTS teacher_id;

ALTER TABLE course_subjects
  DROP COLUMN IF EXISTS semester;

CREATE TABLE IF NOT EXISTS class_section_subject_teachers (
  class_section_id INTEGER NOT NULL REFERENCES class_sections(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (class_section_id, subject_id, teacher_id)
);
