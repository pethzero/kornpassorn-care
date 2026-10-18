-- =====================================================================================
-- Kornpassorn Care — 02 ข้อมูลตั้งต้น
-- สร้างโดย backend/scripts/build-db-setup.ts เมื่อ 2026-10-17 (อย่าแก้มือ — รันสคริปต์ใหม่แทน)
-- ผู้ใช้: admin / admin1234 (admin), user / 123456 (user) — เปลี่ยนรหัสผ่านหลังติดตั้ง
-- เวลาทำการ: จ.–ศ. 08:00–17:00, ส. 08:00–12:00, อา. ปิด
-- =====================================================================================
-- users (2 แถว)
INSERT INTO "users" SELECT * FROM jsonb_populate_record(NULL::"users", '{"id":"360a8a24-8c17-4c4d-9e3a-d675b98dd1c3","role":"admin","email":null,"isActive":true,"username":"admin","createdAt":"2026-10-17T09:11:54.232827+07:00","last_name":null,"first_name":"ผู้ดูแลระบบ","phone_number":null,"password_hash":"$2b$10$/vFqYYGWaLmvSXDa2pnIPet6B4Rh3G2jya48KoUeBvs0CxAXfXM9y"}');
INSERT INTO "users" SELECT * FROM jsonb_populate_record(NULL::"users", '{"id":"d783aa22-959b-42ff-aaf4-c106628f34a8","role":"user","email":null,"isActive":true,"username":"user","createdAt":"2026-10-17T09:11:54.297985+07:00","last_name":null,"first_name":"เจ้าหน้าที่","phone_number":null,"password_hash":"$2b$10$kQxo.Bl/izDscreabut8Qe9XnN4sLGJK372hdeGdawZbvgfmb9K1."}');

-- hospital_weekly_hours (7 แถว)
INSERT INTO "hospital_weekly_hours" SELECT * FROM jsonb_populate_record(NULL::"hospital_weekly_hours", '{"id":1,"note":null,"is_closed":true,"open_time":null,"close_time":null,"updated_at":"2026-10-17T09:11:53.790211+07:00","day_of_week":0}');
INSERT INTO "hospital_weekly_hours" SELECT * FROM jsonb_populate_record(NULL::"hospital_weekly_hours", '{"id":2,"note":null,"is_closed":false,"open_time":"08:00:00","close_time":"16:00:00","updated_at":"2026-10-17T09:11:53.790211+07:00","day_of_week":1}');
INSERT INTO "hospital_weekly_hours" SELECT * FROM jsonb_populate_record(NULL::"hospital_weekly_hours", '{"id":3,"note":null,"is_closed":false,"open_time":"08:00:00","close_time":"16:00:00","updated_at":"2026-10-17T09:11:53.790211+07:00","day_of_week":2}');
INSERT INTO "hospital_weekly_hours" SELECT * FROM jsonb_populate_record(NULL::"hospital_weekly_hours", '{"id":4,"note":null,"is_closed":false,"open_time":"08:00:00","close_time":"16:00:00","updated_at":"2026-10-17T09:11:53.790211+07:00","day_of_week":3}');
INSERT INTO "hospital_weekly_hours" SELECT * FROM jsonb_populate_record(NULL::"hospital_weekly_hours", '{"id":5,"note":null,"is_closed":false,"open_time":"08:00:00","close_time":"16:00:00","updated_at":"2026-10-17T09:11:53.790211+07:00","day_of_week":4}');
INSERT INTO "hospital_weekly_hours" SELECT * FROM jsonb_populate_record(NULL::"hospital_weekly_hours", '{"id":6,"note":null,"is_closed":false,"open_time":"08:00:00","close_time":"16:00:00","updated_at":"2026-10-17T09:11:53.790211+07:00","day_of_week":5}');
INSERT INTO "hospital_weekly_hours" SELECT * FROM jsonb_populate_record(NULL::"hospital_weekly_hours", '{"id":7,"note":null,"is_closed":true,"open_time":null,"close_time":null,"updated_at":"2026-10-17T09:11:53.790211+07:00","day_of_week":6}');
SELECT setval('public.hospital_weekly_hours_id_seq', COALESCE((SELECT MAX(id) FROM "hospital_weekly_hours"), 0) + 1, false);

