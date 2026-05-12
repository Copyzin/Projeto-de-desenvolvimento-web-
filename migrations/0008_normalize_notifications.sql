-- Remodela notificacoes para evitar duplicacao de texto por usuario.
-- Dados antigos de notificacao sao descartados porque o sistema ainda nao esta em uso.

BEGIN;

DROP TABLE IF EXISTS notification_recipients;
DROP TABLE IF EXISTS notifications;

CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  sender_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  destination_route TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_related_entity_idx
  ON notifications(related_entity_type, related_entity_id);

CREATE INDEX notifications_created_at_idx
  ON notifications(created_at DESC);

CREATE TABLE notification_recipients (
  id SERIAL PRIMARY KEY,
  notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
  class_section_id INTEGER REFERENCES class_sections(id) ON DELETE SET NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMP,
  delivered_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX notification_recipients_notification_user_unique
  ON notification_recipients(notification_id, user_id);

CREATE INDEX notification_recipients_user_unread_idx
  ON notification_recipients(user_id, is_read, delivered_at DESC);

CREATE INDEX notification_recipients_course_idx
  ON notification_recipients(course_id, user_id);

COMMIT;
