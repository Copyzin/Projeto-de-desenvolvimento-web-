-- Fase 4.2 - Materiais curriculares e fixacao individual por usuario

CREATE TABLE IF NOT EXISTS course_materials (
  id SERIAL PRIMARY KEY,
  original_name TEXT NOT NULL,
  internal_name TEXT NOT NULL UNIQUE,
  storage_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  class_section_id INTEGER REFERENCES class_sections(id) ON DELETE SET NULL,
  issued_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS course_materials_course_section_idx
  ON course_materials(course_id, class_section_id, issued_at DESC);

CREATE TABLE IF NOT EXISTS user_pinned_materials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  material_id INTEGER NOT NULL REFERENCES course_materials(id) ON DELETE CASCADE,
  pinned_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS user_pinned_materials_user_material_unique
  ON user_pinned_materials(user_id, material_id);

CREATE INDEX IF NOT EXISTS user_pinned_materials_user_idx
  ON user_pinned_materials(user_id, pinned_at DESC);