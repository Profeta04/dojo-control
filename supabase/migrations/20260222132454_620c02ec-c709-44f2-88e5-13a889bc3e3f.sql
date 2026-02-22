
ALTER TABLE attendance DISABLE TRIGGER prevent_self_checkin_delete;
ALTER TABLE attendance DISABLE TRIGGER prevent_self_checkin_update;

DELETE FROM attendance WHERE class_id IN (SELECT id FROM classes WHERE dojo_id = '52aa2376-dfd8-4e2a-b877-571c86f7ff4c');

ALTER TABLE attendance ENABLE TRIGGER prevent_self_checkin_delete;
ALTER TABLE attendance ENABLE TRIGGER prevent_self_checkin_update;
