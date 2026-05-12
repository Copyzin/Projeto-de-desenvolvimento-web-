-- Remove estruturas legadas de prioridade/preferencia docente e rascunhos
-- antigos que nao fazem parte do fluxo atual de atribuicao de aulas.
-- As tabelas lesson_* e os cadastros preservados seguem intactos.

BEGIN;

-- Mantem as tabelas preservadas, mas remove vinculos com estruturas obsoletas.
ALTER TABLE IF EXISTS class_schedule_entries
  DROP COLUMN IF EXISTS assignment_id;

ALTER TABLE IF EXISTS schedule_publications
  DROP COLUMN IF EXISTS generation_run_id;

ALTER TABLE IF EXISTS locations
  DROP COLUMN IF EXISTS category_id;

-- Historico antigo de geracao/validacao de grade.
DROP TABLE IF EXISTS class_slot_conflicts;
DROP TABLE IF EXISTS schedule_generation_runs;

-- Preferencias, prioridade e pontuacao docente.
DROP TABLE IF EXISTS teacher_subject_match_scores;
DROP TABLE IF EXISTS teacher_subject_manual_overrides;
DROP TABLE IF EXISTS teacher_assignment_profiles;
DROP TABLE IF EXISTS teacher_preference_class_sections;
DROP TABLE IF EXISTS teacher_preference_subjects;
DROP TABLE IF EXISTS teacher_preference_submissions;
DROP TABLE IF EXISTS teacher_availability_slots;

-- Atribuicoes redundantes ou rascunhos de features futuras.
DROP TABLE IF EXISTS class_section_subject_assignments;
DROP TABLE IF EXISTS grade_entries;
DROP TABLE IF EXISTS attendance_entries;

-- Competencias e perfil docente enriquecido serao redesenhados futuramente.
DROP TABLE IF EXISTS teacher_professional_experience_competencies;
DROP TABLE IF EXISTS subject_competencies;
DROP TABLE IF EXISTS teacher_competencies;
DROP TABLE IF EXISTS competency_tags;
DROP TABLE IF EXISTS teacher_academic_degrees;
DROP TABLE IF EXISTS teacher_professional_experiences;
DROP TABLE IF EXISTS teacher_subject_history;

-- Locations fica preservada; categorias legadas deixam de existir.
DROP TABLE IF EXISTS location_categories;

COMMIT;
