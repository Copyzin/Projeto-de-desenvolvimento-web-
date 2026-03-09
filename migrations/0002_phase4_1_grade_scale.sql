-- Fase 4.1 - Ajuste de escala de notas para 0..10 e faltas nao negativas

UPDATE enrollments
SET grade = CASE
  WHEN grade IS NULL THEN NULL
  WHEN grade > 10 THEN ROUND(grade::numeric / 10.0)::integer
  WHEN grade < 0 THEN 0
  ELSE grade
END;

UPDATE approved_subject_records
SET approved_grade = CASE
  WHEN approved_grade IS NULL THEN NULL
  WHEN approved_grade > 10 THEN ROUND(approved_grade::numeric / 10.0)::integer
  WHEN approved_grade < 0 THEN 0
  ELSE approved_grade
END;

DO $$
BEGIN
  ALTER TABLE enrollments
    ADD CONSTRAINT enrollments_grade_range_chk
    CHECK (grade IS NULL OR (grade >= 0 AND grade <= 10));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE approved_subject_records
    ADD CONSTRAINT approved_subject_records_grade_range_chk
    CHECK (approved_grade IS NULL OR (approved_grade >= 0 AND approved_grade <= 10));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  ALTER TABLE enrollments
    ADD CONSTRAINT enrollments_attendance_nonnegative_chk
    CHECK (attendance IS NULL OR attendance >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;