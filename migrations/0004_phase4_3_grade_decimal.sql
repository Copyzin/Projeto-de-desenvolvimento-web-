-- Fase 4.3 - Notas decimais (0 a 10) com ate 2 casas

ALTER TABLE enrollments
  ALTER COLUMN grade TYPE DOUBLE PRECISION
  USING CASE WHEN grade IS NULL THEN NULL ELSE grade::DOUBLE PRECISION END;

ALTER TABLE approved_subject_records
  ALTER COLUMN approved_grade TYPE DOUBLE PRECISION
  USING CASE WHEN approved_grade IS NULL THEN NULL ELSE approved_grade::DOUBLE PRECISION END;

UPDATE enrollments
SET grade = ROUND(grade::numeric, 2)::DOUBLE PRECISION
WHERE grade IS NOT NULL;

UPDATE approved_subject_records
SET approved_grade = ROUND(approved_grade::numeric, 2)::DOUBLE PRECISION
WHERE approved_grade IS NOT NULL;