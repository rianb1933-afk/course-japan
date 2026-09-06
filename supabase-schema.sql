-- ════════════════════════════════════════════════════════
-- 日本語Pro / Eduma Kaigo — Supabase Schema
-- Run this in Supabase SQL Editor to set up the database
--
-- Aman dijalankan ulang di proyek yang sudah hidup: semua CREATE POLICY
-- dibungkus DO $$ ... EXCEPTION WHEN duplicate_object (Postgres tidak punya
-- IF NOT EXISTS untuk policy), sisanya IF NOT EXISTS / OR REPLACE /
-- DROP IF EXISTS. Menjalankan ulang tidak mengubah policy yang sudah ada.
-- ════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── USER PROGRESS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_progress (
  id            UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  name          TEXT,
  email         TEXT,
  xp            INTEGER DEFAULT 0,
  level         INTEGER DEFAULT 1,
  streak        INTEGER DEFAULT 0,
  last_study    DATE,
  study_dates   JSONB DEFAULT '[]',
  jlpt_progress JSONB DEFAULT '{"N5":0,"N4":0,"N3":0,"N2":0,"N1":0}',
  kaigo_progress INTEGER DEFAULT 0,
  kanji_learned  INTEGER DEFAULT 0,
  quiz_total     INTEGER DEFAULT 0,
  achievements   JSONB DEFAULT '[]',
  is_premium    BOOLEAN DEFAULT FALSE,
  plan          TEXT DEFAULT 'free',
  plan_expires  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ── SRS CARDS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS srs_cards (
  id           UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  card_id      TEXT NOT NULL,
  ef           NUMERIC DEFAULT 2.5,
  interval     INTEGER DEFAULT 0,
  reps         INTEGER DEFAULT 0,
  next_review  BIGINT DEFAULT 0,
  last_rating  INTEGER,
  last_reviewed TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, card_id)
);

-- ── QUIZ RESULTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_results (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  level      TEXT NOT NULL,
  mode       TEXT NOT NULL,
  score      INTEGER NOT NULL,
  total      INTEGER NOT NULL,
  pct        INTEGER NOT NULL,
  categories JSONB DEFAULT '{}',
  taken_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── CERTIFICATES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificates (
  id         UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cert_id    TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  level      TEXT NOT NULL,
  score      INTEGER,
  issued_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── RATE LIMITS (for AI) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS rate_limits (
  user_id TEXT NOT NULL,
  date    DATE NOT NULL,
  count   INTEGER DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

-- Auto-cleanup rate limits older than 7 days
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS VOID AS $$
BEGIN
  DELETE FROM rate_limits WHERE date < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ── ROW LEVEL SECURITY ───────────────────────────────────
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE srs_cards      ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits    ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own data
DO $$ BEGIN
  CREATE POLICY "Users own data" ON user_progress FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users own SRS"  ON srs_cards      FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users own quiz" ON quiz_results   FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users own certs" ON certificates  FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Certificates verifiable by anyone (public read)
DO $$ BEGIN
  CREATE POLICY "Certs public read" ON certificates FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Leaderboard: only authenticated users can see name+xp+streak (no email/id exposed via API)
DO $$ BEGIN
  CREATE POLICY "Leaderboard read" ON user_progress
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Rate limits: each user/session can only access their own row
DO $$ BEGIN
  CREATE POLICY "Users own rate limit" ON rate_limits
    FOR ALL USING (user_id = COALESCE(auth.uid()::text, 'anonymous'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── INDEXES ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_progress_xp      ON user_progress(xp DESC);
CREATE INDEX IF NOT EXISTS idx_srs_next_review        ON srs_cards(user_id, next_review);
CREATE INDEX IF NOT EXISTS idx_quiz_user              ON quiz_results(user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_cert_id               ON certificates(cert_id);

-- ════════════════════════════════════════════════════════
-- DONE! Next steps:
-- 1. Go to Supabase Dashboard → Authentication → Settings
-- 2. Enable Email auth
-- 3. Set site URL: https://nihongopro.id
-- 4. Copy URL + anon key to env.js:
--    window.EDUMA_ENV = {
--      SUPABASE_URL: 'https://xxx.supabase.co',
--      SUPABASE_ANON_KEY: 'eyJ...',
--      AI_API_ENDPOINT: '/api/ai-chat'
--    }
-- ════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════
-- LIVE CLASSROOM TABLES
-- Jalankan di Supabase SQL Editor: https://app.supabase.com → SQL Editor
-- ══════════════════════════════════════════════════════════════════════

-- ── Live Rooms ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_rooms (
  id               BIGSERIAL PRIMARY KEY,
  room_code        VARCHAR(10)  NOT NULL UNIQUE,
  room_name        TEXT         NOT NULL DEFAULT 'Kelas Live',
  host_name        TEXT         NOT NULL,
  host_id          UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  is_locked        BOOLEAN      NOT NULL DEFAULT false,
  participant_count INT          NOT NULL DEFAULT 0,
  settings         JSONB        NOT NULL DEFAULT '{}',
  started_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Live Participants ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_participants (
  id               BIGSERIAL PRIMARY KEY,
  room_code        VARCHAR(10)  NOT NULL REFERENCES live_rooms(room_code) ON DELETE CASCADE,
  peer_id          TEXT         NOT NULL,
  name             TEXT         NOT NULL,
  user_id          UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active        BOOLEAN      NOT NULL DEFAULT true,
  is_host          BOOLEAN      NOT NULL DEFAULT false,
  joined_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  left_at          TIMESTAMPTZ,
  UNIQUE(room_code, peer_id)
);

-- ── Live Schedule ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_schedule (
  id               BIGSERIAL PRIMARY KEY,
  title            TEXT         NOT NULL,
  description      TEXT,
  host             TEXT         NOT NULL,
  host_id          UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  level            VARCHAR(10)  NOT NULL DEFAULT 'N4',
  max_participants INT          NOT NULL DEFAULT 20,
  room_code        VARCHAR(10),
  scheduled_at     TIMESTAMPTZ  NOT NULL,
  duration_minutes INT          NOT NULL DEFAULT 60,
  is_cancelled     BOOLEAN      NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Live Attendance ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_attendance (
  id                BIGSERIAL PRIMARY KEY,
  room_code         VARCHAR(10)  NOT NULL,
  participant_name  TEXT         NOT NULL,
  peer_id           TEXT,
  user_id           UUID         REFERENCES auth.users(id) ON DELETE SET NULL,
  duration_minutes  INT          NOT NULL DEFAULT 0,
  quiz_correct      INT          NOT NULL DEFAULT 0,
  quiz_total        INT          NOT NULL DEFAULT 0,
  xp_earned         INT          NOT NULL DEFAULT 0,
  recorded_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── User XP Log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_xp_log (
  id           BIGSERIAL PRIMARY KEY,
  user_id      UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  xp_earned    INT          NOT NULL DEFAULT 0,
  source       TEXT         NOT NULL DEFAULT 'live_session',
  session_data JSONB        NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ── Increment Participants RPC ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_participants(room TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE live_rooms SET participant_count = participant_count + 1
  WHERE room_code = room;
END;
$$;

-- ── Add User XP RPC ─────────────────────────────────────────────────────────
-- Kolom user_progress adalah `xp` (INTEGER, lihat definisi tabel di atas) --
-- bukan `total_xp`. Versi lama fungsi ini merujuk kolom yang tidak ada, jadi
-- SETIAP pemanggilan gagal saat runtime (error "column total_xp does not
-- exist"); pemanggilnya di Kelas-Online.html menelan error itu diam-diam
-- dengan .catch(()=>{}), sehingga XP kelas live tidak pernah tersambung ke
-- profil. Diperbaiki ke xp, dan insert fallback memakai COALESCE supaya
-- amount NULL tidak merusak baris yang sudah ada.
CREATE OR REPLACE FUNCTION add_user_xp(uid UUID, amount INT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF amount IS NULL OR amount = 0 THEN RETURN; END IF;
  UPDATE user_progress SET
    xp = COALESCE(xp, 0) + amount,
    updated_at = NOW()
  WHERE user_id = uid;
  IF NOT FOUND THEN
    INSERT INTO user_progress(user_id, xp) VALUES(uid, amount);
  END IF;
END;
$$;

-- ── BACKFILL XP kelas live yang hilang ───────────────────────────────────────
-- Selama add_user_xp merujuk kolom total_xp yang tidak ada, SETIAP XP kelas
-- live gagal tersambung ke user_progress.xp -- tapi catatannya tetap utuh di
-- user_xp_log (saveSessionXP meng-insert log SEBELUM memanggil RPC, dan log
-- itu tidak pernah gagal). Fungsi hidup berarti XP yang hilang bisa dihitung
-- ulang dari log.
--
-- IDEMPOTEN TANPA DOBEL: setiap baris log diberi penanda xp_applied. Backfill
-- hanya menyentuh baris yang penandanya masih false, lalu menandainya dalam
-- transaksi yang sama -- dijalankan ulang kapan pun, yang diterapkan hanya
-- baris yang memang belum.
--
-- SUPAYA BARIS JALUR NORMAL TIDAK DIHITUNG DOBEL, add_user_xp saja tidak
-- cukup: klien menyisipkan log lebih dulu, lalu RPC berjalan belakangan --
-- backfill yang berjalan di antara keduanya akan menghitung baris yang RPC-
-- nya menyusul. Solusinya dua fungsi kecil:
--
--   * apply_user_xp(p_user, p_log_id) -- jalur baru untuk klien. Jumlah XP
--     dibaca dari baris log milik pemanggil yang xp_applied=false (BUKAN
--     diterima sebagai argumen, jadi klien tidak bisa mengarang angka),
--     menambahkan ke user_progress, lalu menandai lognya.
--   * mark_user_xp_applied(p_user, p_log_id) -- SECURITY DEFINER, satu-satunya
--     pengecualian penulisan pada tabel audit ini: hanya bisa SET xp_applied
--     untuk (pemanggil, log_id) yang diberikan. Tanpa itu, tabel harus diberi
--     policy UPDATE terbuka yang mengundang manipulasi riwayat.
--
-- add_user_xp tetap ada untuk pemanggil lama tanpa log id (mis. SQL Editor).
ALTER TABLE user_xp_log ADD COLUMN IF NOT EXISTS xp_applied boolean NOT NULL DEFAULT false;

-- Hak eksekusi dicabut dari PUBLIC/anon; hanya authenticated (sesi sah) yang
-- boleh memanggil, dan hanya untuk baris log miliknya sendiri (dijaga WHERE
-- di dalam fungsi).
REVOKE ALL ON FUNCTION apply_user_xp(uuid, bigint) FROM PUBLIC;
-- Sumber XP yang boleh lewat jalur log-id. WHITELIST, bukan bebas: kolom
-- `source` di user_xp_log disisipkan klien, dan tanpa daftar ini klien bisa
-- memangsa apply berulang dengan sumber fiktif. Daftar ini cermin dari
-- SUMBER_VALID di assets/np-xp.js (award/recordQuiz/recordVocab) + live.
CREATE OR REPLACE FUNCTION apply_user_xp(p_user uuid, p_log_id bigint)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_amount int;
BEGIN
  SELECT xp_earned INTO v_amount FROM user_xp_log
  WHERE id = p_log_id AND user_id = p_user AND xp_applied = false
    AND xp_earned <> 0
    AND source IN ('live_session', 'kanji', 'quiz', 'kanji_quiz', 'srs', 'vocab', 'game', 'materi');
  IF NOT FOUND THEN RETURN; END IF;  -- sudah diterapkan / bukan miliknya: no-op

  UPDATE user_progress SET
    xp = COALESCE(xp, 0) + v_amount,
    updated_at = NOW()
  WHERE user_id = p_user;
  IF NOT FOUND THEN
    INSERT INTO user_progress(user_id, xp) VALUES(p_user, v_amount);
  END IF;

  -- Penanda ditulis SETELAH xp bertambah; kalau klien gagal menyampaikan
  -- langkah ini (mis. tab ditutup), backfill di bawah tetap mengambil barisnya.
  -- DITANDAI lewat mark_user_xp_applied, bukan UPDATE langsung: tabel ini
  -- sengaja tanpa policy UPDATE untuk klien (deny-all), jadi UPDATE biasa
  -- akan terdiam menjadi no-op dan backfill kelak menghitung barisnya dobel.
  PERFORM mark_user_xp_applied(p_user, p_log_id);
END;
$$;
DO $$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION apply_user_xp(uuid, bigint) TO authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

REVOKE ALL ON FUNCTION mark_user_xp_applied(uuid, bigint) FROM PUBLIC;
CREATE OR REPLACE FUNCTION mark_user_xp_applied(p_user uuid, p_log_id bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE user_xp_log SET xp_applied = true
  WHERE id = p_log_id AND user_id = p_user AND xp_applied = false;
END;
$$;
DO $$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION mark_user_xp_applied(uuid, bigint) TO authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- add_user_xp dipertahankan demi kompatibilitas; tanpa log id, ia tidak bisa
-- menandai apa pun -- backfill di bawah tidak akan menghitung dobel baris
-- yang ditandai apply_user_xp.
CREATE OR REPLACE FUNCTION add_user_xp(uid UUID, amount INT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF amount IS NULL OR amount = 0 THEN RETURN; END IF;
  UPDATE user_progress SET
    xp = COALESCE(xp, 0) + amount,
    updated_at = NOW()
  WHERE user_id = uid;
  IF NOT FOUND THEN
    INSERT INTO user_progress(user_id, xp) VALUES(uid, amount);
  END IF;
END;
$$;

-- BACKFILL sendiri: jalankan ulang file ini kapan pun -- CTE hanya menyentuh
-- baris xp_applied=false. Yang pertama kali dieksekusi setelah perbaikan
-- inilah yang mengembalikan XP kelas live yang tadinya hilang. Sejak apply
-- melayani sumber lain (kanji/quiz/srs/...), backfill ikut menyapu SEMUA
-- sumber valid -- baris yang RPC-nya gagal dari sumber mana pun tetap pulih.
WITH backlog AS (
  SELECT user_id, SUM(xp_earned) AS xp_total
  FROM user_xp_log
  WHERE xp_applied = false AND xp_earned <> 0
    AND source IN ('live_session', 'kanji', 'quiz', 'kanji_quiz', 'srs', 'vocab', 'game', 'materi')
  GROUP BY user_id
), ditandai AS (
  UPDATE user_xp_log SET xp_applied = true
  WHERE xp_applied = false AND xp_earned <> 0
    AND source IN ('live_session', 'kanji', 'quiz', 'kanji_quiz', 'srs', 'vocab', 'game', 'materi')
  RETURNING user_id
)
INSERT INTO user_progress (user_id, xp)
SELECT b.user_id, GREATEST(b.xp_total, 0)
FROM backlog b
WHERE EXISTS (SELECT 1 FROM ditandai d WHERE d.user_id = b.user_id)
ON CONFLICT (user_id) DO UPDATE
SET xp = COALESCE(user_progress.xp, 0) + EXCLUDED.xp,
    updated_at = NOW();

-- ── RLS Policies ────────────────────────────────────────────────────────────
ALTER TABLE live_rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_schedule     ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_attendance   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp_log       ENABLE ROW LEVEL SECURITY;

-- Public read for rooms (anyone can see active rooms)
DO $$ BEGIN
  CREATE POLICY "Public can read live rooms"
    ON live_rooms FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can insert rooms"
    ON live_rooms FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Host can update their room"
    ON live_rooms FOR UPDATE USING (host_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Participants
DO $$ BEGIN
  CREATE POLICY "Public can read participants"
    ON live_participants FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can join"
    ON live_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Users can update own participation"
    ON live_participants FOR UPDATE USING (user_id = auth.uid() OR peer_id IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Schedule: public read
DO $$ BEGIN
  CREATE POLICY "Public can read schedule"
    ON live_schedule FOR SELECT USING (NOT is_cancelled);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can create schedule"
    ON live_schedule FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- XP log: users see own
DO $$ BEGIN
  CREATE POLICY "Users see own XP log"
    ON user_xp_log FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "System can insert XP"
    ON user_xp_log FOR INSERT WITH CHECK (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_live_rooms_code ON live_rooms(room_code);
CREATE INDEX IF NOT EXISTS idx_live_rooms_started ON live_rooms(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_live_participants_room ON live_participants(room_code);
CREATE INDEX IF NOT EXISTS idx_live_participants_active ON live_participants(room_code, is_active);
CREATE INDEX IF NOT EXISTS idx_live_schedule_date ON live_schedule(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_user_xp_log_user ON user_xp_log(user_id, created_at DESC);

-- ══════════════════════════════════════════════════════════════════════
-- REALTIME: Enable realtime for live tables
-- Jalankan di Supabase Dashboard → Database → Replication → toggle tables
-- ══════════════════════════════════════════════════════════════════════
-- live_rooms, live_participants → enable realtime

-- ══════════════════════════════════════════════════════════════════════
-- TEACHER DASHBOARD — kelas, keanggotaan, tugas
-- Relasi guru↔siswa via classrooms + enrollments. RLS: guru mengelola
-- kelasnya sendiri; siswa melihat kelas & tugas yang diikutinya.
-- ══════════════════════════════════════════════════════════════════════

-- Peran pengguna (opsional; default 'student'). Guru ditandai di sini.
CREATE TABLE IF NOT EXISTS user_roles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','admin')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Kelas yang dibuat guru
CREATE TABLE IF NOT EXISTS classrooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  join_code   text UNIQUE NOT NULL,           -- kode unik untuk siswa bergabung
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Keanggotaan siswa di kelas
CREATE TABLE IF NOT EXISTS enrollments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  student_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (classroom_id, student_id)
);

-- Tugas yang diberikan guru ke kelas
CREATE TABLE IF NOT EXISTS assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  title        text NOT NULL,
  material_url text,                            -- link ke materi/quiz
  due_at       timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Penyerahan/penyelesaian tugas oleh siswa
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed     boolean NOT NULL DEFAULT false,
  score         numeric,
  submitted_at  timestamptz,
  UNIQUE (assignment_id, student_id)
);

-- ── Row Level Security ──
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;

-- user_roles: pengguna lihat perannya sendiri
DO $$ BEGIN
  CREATE POLICY "Users read own role" ON user_roles
    FOR SELECT USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- classrooms: guru kelola kelasnya; siswa lihat kelas yang diikuti
DO $$ BEGIN
  CREATE POLICY "Teachers manage own classrooms" ON classrooms
    FOR ALL USING (teacher_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Students read enrolled classrooms" ON classrooms
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM enrollments e
              WHERE e.classroom_id = classrooms.id AND e.student_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- enrollments: guru lihat siswa di kelasnya; siswa lihat/kelola keanggotaannya
DO $$ BEGIN
  CREATE POLICY "Teachers read class enrollments" ON enrollments
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM classrooms c
              WHERE c.id = enrollments.classroom_id AND c.teacher_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- Policy siswa untuk enrollments SENGAJA tidak didefinisikan di sini.
-- Versi lamanya, `FOR ALL USING (student_id = auth.uid())`, mengizinkan siapa
-- pun yang login MASUK ke grup mana pun tanpa token (lihat uraian panjangnya
-- di bagian "GRUP KELAS & TOKEN GABUNG" di bawah). Penggantinya didefinisikan
-- di bagian itu, satu tempat saja, supaya tidak ada dua versi yang bersaing.

-- assignments: guru kelola; siswa baca tugas kelasnya
DO $$ BEGIN
  CREATE POLICY "Teachers manage class assignments" ON assignments
    FOR ALL USING (
      EXISTS (SELECT 1 FROM classrooms c
              WHERE c.id = assignments.classroom_id AND c.teacher_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Students read class assignments" ON assignments
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM enrollments e
              WHERE e.classroom_id = assignments.classroom_id AND e.student_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- submissions: siswa kelola miliknya; guru baca submission kelasnya
DO $$ BEGIN
  CREATE POLICY "Students manage own submissions" ON assignment_submissions
    FOR ALL USING (student_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Teachers read class submissions" ON assignment_submissions
    FOR SELECT USING (
      EXISTS (SELECT 1 FROM assignments a
              JOIN classrooms c ON c.id = a.classroom_id
              WHERE a.id = assignment_submissions.assignment_id AND c.teacher_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_classrooms_teacher ON classrooms(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classrooms_join_code ON classrooms(join_code);
CREATE INDEX IF NOT EXISTS idx_enrollments_class ON enrollments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class ON assignments(classroom_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);

-- ══════════════════════════════════════════════════════════════════════
-- KAIGO QUESTION BANK — bank soal terpusat & queryable
-- Diisi dari soal terautentikasi di modul (via scripts/build_question_bank.py).
-- Mendukung filter per kategori, level, difficulty, tag untuk kuis dinamis.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kaigo_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module text,                          -- file modul asal (mis. Kaigo-Ujian-Ninchisho.html)
  category     text NOT NULL,                  -- vocabulary/grammar/dementia/emergency/...
  question     text NOT NULL,
  choices      jsonb NOT NULL,                 -- ["opsi A","opsi B","opsi C","opsi D"]
  correct_index smallint NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  explanation  text NOT NULL,                  -- pembahasan dwibahasa
  difficulty   text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  jlpt_level   text,                           -- N5..N1 atau null
  tags         text[] NOT NULL DEFAULT '{}',
  seed         integer,                        -- random seed stabil untuk urutan reproducible
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Bacaan publik (soal latihan bukan rahasia); tulis hanya lewat service role.
ALTER TABLE kaigo_questions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Questions public read" ON kaigo_questions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_kaigo_q_category ON kaigo_questions(category);
CREATE INDEX IF NOT EXISTS idx_kaigo_q_difficulty ON kaigo_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_kaigo_q_jlpt ON kaigo_questions(jlpt_level);
CREATE INDEX IF NOT EXISTS idx_kaigo_q_tags ON kaigo_questions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_kaigo_q_seed ON kaigo_questions(seed);

-- ══════════════════════════════════════════════════════════════════════
-- JLPT QUESTION BANK — bank soal bahasa Jepang umum (non-Kaigo)
-- Struktur sama dengan kaigo_questions; diisi via build_jlpt_question_bank.py
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS jlpt_questions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_module text,
  category     text NOT NULL,
  question     text NOT NULL,
  choices      jsonb NOT NULL,
  correct_index smallint NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  explanation  text NOT NULL,
  difficulty   text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  jlpt_level   text,
  tags         text[] NOT NULL DEFAULT '{}',
  seed         integer,
  -- v185: kolom CMS ditambah -- soal LAMA (dari build_jlpt_question_bank.py,
  -- source_module terisi) semuanya default published=true, created_by NULL
  -- (bukan ditulis lewat CMS). Soal BARU yang ditulis admin lewat
  -- jlpt-cms.js akan punya created_by terisi. Additive, tidak mengubah
  -- 2.707 soal existing.
  published    boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE jlpt_questions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "JLPT questions public read" ON jlpt_questions FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_jlpt_q_category ON jlpt_questions(category);
CREATE INDEX IF NOT EXISTS idx_jlpt_q_difficulty ON jlpt_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_jlpt_q_tags ON jlpt_questions USING GIN(tags);
-- Tulis (INSERT/UPDATE/DELETE): sengaja TANPA policy untuk client (deny-all),
-- pola sama seperti blog_posts (v184) dan rate_limits (v176) -- hanya
-- service role (Netlify Function setelah verifikasi admin) yang bisa tulis.

-- ══════════════════════════════════════════════════════════════════════
-- EXAM HISTORY — riwayat hasil ujian siswa (untuk grafik progres)
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS exam_history (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_type    text NOT NULL,                -- 'kaigo' / 'jlpt'
  category     text,
  total        smallint NOT NULL,
  correct      smallint NOT NULL,
  score_pct    smallint NOT NULL,
  duration_sec integer,
  taken_at     timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE exam_history ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own exam history" ON exam_history FOR ALL USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_exam_hist_user ON exam_history(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_hist_taken ON exam_history(taken_at);

-- ══════════════════════════════════════════════════════════════════════
-- CERTIFICATES — record sertifikat untuk verifikasi publik via Verify.html
-- ══════════════════════════════════════════════════════════════════════
-- CATATAN: tabel "certificates" SUDAH ADA di atas (baris awal file ini) dari
-- sistem Certificate-Pro.html lama (kolom user_id/name/level/score). Tabel itu
-- dikonfirmasi TIDAK PERNAH benar-benar di-insert via Supabase (Certificate-Pro
-- hanya update localStorage). Untuk menghindari konflik nama TANPA menghapus
-- apa pun yang sudah ada, sertifikat ujian (Ujian.html/Verify.html) memakai
-- tabel TERPISAH: exam_certificates.
CREATE TABLE IF NOT EXISTS exam_certificates (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_id        text UNIQUE NOT NULL,   -- ID yang tercetak di sertifikat & QR
  recipient_name text NOT NULL,
  exam_type      text NOT NULL,          -- 'kaigo' / 'jlpt'
  score_pct      smallint NOT NULL,
  correct        smallint,
  total          smallint,
  issued_at      timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE exam_certificates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Exam certificates public read" ON exam_certificates FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Exam certificates insert by anyone" ON exam_certificates FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_exam_cert_id ON exam_certificates(cert_id);

-- ══════════════════════════════════════════════════════════════════════
-- PAYMENTS — audit trail transaksi Midtrans (ditulis oleh payment-webhook.js)
-- Sumber kebenaran akses premium tetap user_progress.is_premium; tabel ini
-- hanya untuk pencatatan/audit riwayat transaksi.
-- ══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   text UNIQUE NOT NULL,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id    text NOT NULL,
  amount     integer NOT NULL,
  status     text NOT NULL DEFAULT 'paid',
  paid_at    timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
-- Hanya service role (webhook) yang menulis; user hanya bisa baca riwayat miliknya sendiri.
DO $$ BEGIN
  CREATE POLICY "Users read own payments" ON payments FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- ══════════════════════════════════════════════════════════════════════
-- FASE 2 SECURITY FIX (v176): RLS untuk 8 tabel yang sebelumnya TANPA
-- proteksi row-level sama sekali. Tanpa ini, siapa pun dengan anon key
-- publik (yang memang tertanam di frontend) bisa membaca/menulis SEMUA
-- baris tabel-tabel ini tanpa batas -- termasuk quiz_results & certificates
-- milik SEMUA user, dan yang paling berbahaya: memanipulasi rate_limits
-- milik sendiri untuk melewati batas kuota AI di ai-chat.js.
-- ══════════════════════════════════════════════════════════════════════

-- srs_cards: kartu SRS milik masing-masing user
ALTER TABLE srs_cards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own srs_cards" ON srs_cards
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- quiz_results: hasil kuis milik masing-masing user (baca+tulis sendiri, tanpa update/delete)
ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users read own quiz_results" ON quiz_results
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users insert own quiz_results" ON quiz_results
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- certificates (tabel lama, dikonfirmasi belum benar-benar dipakai per audit
-- v139 -- tetap diberi RLS sebagai praktik aman berjaga-jaga)
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users read own certificates" ON certificates
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users insert own certificates" ON certificates
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- rate_limits: TIDAK BOLEH diakses client sama sekali (hanya lewat service
-- role di netlify/functions/ai-chat.js). RLS diaktifkan TANPA policy apa pun
-- untuk anon/authenticated -- ini secara default MENOLAK SEMUA akses non
-- service-role, persis yang diinginkan untuk tabel internal seperti ini.
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
-- (sengaja tanpa CREATE POLICY -- default RLS = deny all untuk anon/authenticated)

-- live_rooms: info room dibaca publik (agar orang bisa lihat/join room aktif),
-- tapi hanya host yang bisa ubah/hapus room miliknya
ALTER TABLE live_rooms ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Live rooms public read" ON live_rooms FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Host manages own live_rooms" ON live_rooms
    FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated create live_rooms" ON live_rooms
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- live_schedule: jadwal kelas dibaca publik (untuk ditampilkan ke semua calon
-- peserta), hanya host yang bisa ubah/hapus jadwalnya sendiri
ALTER TABLE live_schedule ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Live schedule public read" ON live_schedule FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Host manages own live_schedule" ON live_schedule
    FOR UPDATE USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated create live_schedule" ON live_schedule
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- live_attendance: peserta mencatat kehadiran diri sendiri; user baca
-- riwayat kehadirannya sendiri
ALTER TABLE live_attendance ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users read own live_attendance" ON live_attendance
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Authenticated record own attendance" ON live_attendance
    FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- user_xp_log: log XP milik masing-masing user
ALTER TABLE user_xp_log ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users read own xp_log" ON user_xp_log
    FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Users insert own xp_log" ON user_xp_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════════════
-- CMS: BLOG POSTS (v184) — bukti konsep pertama sistem CMS
-- ══════════════════════════════════════════════════════════════════════
-- Artikel yang ditulis via panel admin (bukan hardcode di Blog.html).
-- 12 artikel LAMA di Blog.html TETAP statis (tidak dimigrasikan) --
-- tabel ini HANYA untuk artikel BARU yang ditulis lewat CMS, additive
-- terhadap yang sudah ada, bukan menggantikannya. Lihat CHANGELOG v184
-- untuk alasan pendekatan bertahap ini.
CREATE TABLE IF NOT EXISTS blog_posts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text UNIQUE NOT NULL,          -- URL-safe, dipakai di #slug routing
  title        text NOT NULL,
  tags         text[] NOT NULL DEFAULT '{}',
  author       text NOT NULL DEFAULT 'Tim NihongoPro',
  read_minutes integer NOT NULL DEFAULT 5,
  -- Body disimpan sebagai HTML sudah jadi (bukan Markdown) supaya konsisten
  -- dengan render 12 artikel lama yang juga langsung HTML -- panel admin
  -- yang membatasi tag yang boleh dipakai, BUKAN render mempercayai HTML
  -- bebas dari mana pun (lihat validasi di netlify/functions/blog-cms.js).
  body_html    text NOT NULL,
  published    boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES auth.users(id),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Baca publik HANYA yang published=true (draft tidak boleh terlihat visitor
-- biasa). Tulis (INSERT/UPDATE/DELETE) TIDAK ADA policy untuk client --
-- sengaja deny-all, hanya service role (Netlify Function blog-cms.js
-- setelah verifikasi role admin) yang bisa menulis. Pola sama seperti
-- rate_limits (v176).
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Published posts public read" ON blog_posts
    FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published, created_at DESC);

-- ══════════════════════════════════════════════════════════════════════
-- GRUP KELAS & TOKEN GABUNG
-- Dipakai Grup-Kelas.html lewat /api/group-tokens
-- ══════════════════════════════════════════════════════════════════════
-- Grup memakai ulang tabel `classrooms` yang sudah ada, bukan tabel baru:
-- konsepnya identik (satu wadah beranggotakan pengguna, dimiliki seorang
-- pengajar) dan `enrollments` + policy-nya sudah terpasang. Yang ditambah
-- hanya dua hal: penanda level/jenis grup, dan token gabung yang bisa
-- diterbitkan berkali-kali.

ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS level text NOT NULL DEFAULT 'umum';
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS kind  text NOT NULL DEFAULT 'pelajar';
ALTER TABLE classrooms ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

DO $$ BEGIN
  ALTER TABLE classrooms ADD CONSTRAINT classrooms_kind_check
    CHECK (kind IN ('pelajar','pengajar'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Token gabung.
-- ─────────────────────────────────────────────────────────────────────
-- `classrooms.join_code` yang lama adalah SATU kode permanen per kelas:
-- tidak bisa dicabut tanpa memutus semua orang, tidak bisa kedaluwarsa,
-- dan tidak terlihat siapa memakai yang mana. Tabel ini menggantikannya
-- untuk pendaftaran: banyak token per grup, masing-masing punya batas
-- pemakaian, masa berlaku, dan bisa dicabut sendiri-sendiri.
--
-- Yang disimpan adalah SHA-256 token, bukan tokennya. Plaintext hanya
-- dikembalikan sekali saat diterbitkan. Konsekuensinya token yang hilang
-- tidak bisa "dilihat lagi" — harus diterbitkan ulang — dan itu memang
-- perilaku yang diinginkan: basis data yang bocor tidak ikut membocorkan
-- akses ke grup.
CREATE TABLE IF NOT EXISTS group_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  classroom_id uuid NOT NULL REFERENCES classrooms(id) ON DELETE CASCADE,
  token_hash   text NOT NULL UNIQUE,
  label        text,
  max_uses     integer NOT NULL DEFAULT 1 CHECK (max_uses > 0),
  used_count   integer NOT NULL DEFAULT 0,
  expires_at   timestamptz,
  revoked_at   timestamptz,
  created_by   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS via_token_id uuid
  REFERENCES group_tokens(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_group_tokens_classroom ON group_tokens(classroom_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_classrooms_kind_level  ON classrooms(kind, level) WHERE archived = false;

-- ── Row Level Security ──
-- group_tokens: RLS aktif TANPA policy apa pun = deny-all untuk klien.
-- Hanya service role (netlify/functions/group-tokens.js, sesudah memverifikasi
-- peran pemanggil) yang menyentuh tabel ini. Pola sama seperti rate_limits
-- dan blog_posts.
ALTER TABLE group_tokens ENABLE ROW LEVEL SECURITY;

-- PERBAIKAN KEAMANAN pada policy enrollments yang lama.
-- ─────────────────────────────────────────────────────────────────────
--   CREATE POLICY "Students manage own enrollment" ON enrollments
--     FOR ALL USING (student_id = auth.uid());
--
-- `FOR ALL` mencakup INSERT, dan tanpa WITH CHECK, PostgreSQL memakai
-- klausa USING itu juga untuk INSERT. Syaratnya hanya `student_id =
-- auth.uid()` — TIDAK ada syarat apa pun tentang classroom_id. Artinya
-- siapa pun yang sudah login bisa menyisipkan barisnya sendiri ke grup mana
-- pun hanya dengan menebak/melihat id grup, tanpa pernah memegang token.
-- Kode gabung jadi sekadar hiasan.
--
-- Diganti: baca & keluar sendiri tetap boleh, tapi MASUK hanya lewat
-- service role sesudah token diverifikasi (lihat redeem_group_token).
DROP POLICY IF EXISTS "Students manage own enrollment" ON enrollments;
DROP POLICY IF EXISTS "Students read own enrollment" ON enrollments;
DROP POLICY IF EXISTS "Students leave own group" ON enrollments;

DO $$ BEGIN
  CREATE POLICY "Students read own enrollment" ON enrollments
    FOR SELECT USING (student_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "Students leave own group" ON enrollments
    FOR DELETE USING (student_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- KENAPA BUKAN SECURITY DEFINER, DAN KENAPA HAK EKSEKUSINYA DICABUT
-- ─────────────────────────────────────────────────────────────────────
-- Versi pertama fungsi ini SECURITY DEFINER tanpa REVOKE. Itu keliru, dan
-- kelirunya justru membatalkan seluruh penjagaan di atas:
--
--   * PostgREST mengekspos SETIAP fungsi di skema `public` sebagai endpoint
--     /rest/v1/rpc/<nama>, dan CREATE FUNCTION memberi EXECUTE ke PUBLIC
--     secara bawaan -- jadi peran `anon` dan `authenticated` bisa memanggilnya
--     langsung dari browser.
--   * SECURITY DEFINER membuatnya berjalan sebagai pemilik fungsi, melewati
--     RLS sepenuhnya.
--   * `p_user` datang dari pemanggil, bukan dari sesi.
--
-- Gabungannya: siapa pun yang memegang satu token sah bisa mendaftarkan
-- pengguna LAIN ke grup, dan siapa pun bisa menebak hash token langsung ke
-- basis data tanpa pernah melewati /api/group-tokens -- artinya batas 30
-- percobaan per IP di function itu tidak berlaku sama sekali.
--
-- SECURITY INVOKER membalik keadaannya: fungsi berjalan dengan hak pemanggil.
-- Service role (dipakai netlify/functions/group-tokens.js) tetap melewati RLS
-- dan bisa menulis; pengguna biasa terbentur ketiadaan policy INSERT pada
-- enrollments dan gagal. REVOKE di bawah menutup pintunya satu lapis lebih
-- awal, supaya endpoint RPC-nya tidak bisa dipanggil sama sekali.
--
-- search_path dipatok karena fungsi tanpa itu bisa dibelokkan lewat skema
-- bayangan; linter Supabase juga menandainya.

-- Penukaran token, ATOMIK.
-- ─────────────────────────────────────────────────────────────────────
-- Diletakkan di database, bukan di JavaScript, karena "cek sisa kuota lalu
-- tambah pemakaian" yang dipecah jadi dua perintah terpisah bisa dilewati
-- dua permintaan bersamaan: keduanya membaca used_count yang sama, keduanya
-- lolos, dan token dengan max_uses=1 terpakai dua kali. Satu UPDATE
-- berkondisi menutup celah itu tanpa perlu kunci eksplisit.
CREATE OR REPLACE FUNCTION redeem_group_token(p_hash text, p_user uuid)
RETURNS TABLE (classroom_id uuid, classroom_name text, token_id uuid, already_member boolean)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_token   group_tokens%ROWTYPE;
  v_class   classrooms%ROWTYPE;
  v_exists  boolean;
BEGIN
  SELECT * INTO v_token FROM group_tokens WHERE token_hash = p_hash;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOKEN_INVALID'; END IF;
  IF v_token.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'TOKEN_REVOKED'; END IF;
  IF v_token.expires_at IS NOT NULL AND v_token.expires_at <= now() THEN
    RAISE EXCEPTION 'TOKEN_EXPIRED';
  END IF;

  SELECT * INTO v_class FROM classrooms WHERE id = v_token.classroom_id;
  -- Grup yang diarsipkan sudah ditutup: list-groups tidak pernah menampilkannya,
  -- jadi token lamanya juga tidak boleh masih bisa mendaftarkan orang.
  IF NOT FOUND OR v_class.archived THEN RAISE EXCEPTION 'TOKEN_INVALID'; END IF;

  SELECT EXISTS (
    SELECT 1 FROM enrollments e
    WHERE e.classroom_id = v_token.classroom_id AND e.student_id = p_user
  ) INTO v_exists;

  -- Sudah anggota: kembalikan sukses TANPA memakai kuota. Menekan tombol
  -- dua kali seharusnya tidak menghanguskan satu jatah token.
  IF v_exists THEN
    RETURN QUERY SELECT v_class.id, v_class.name, v_token.id, true;
    RETURN;
  END IF;

  UPDATE group_tokens SET used_count = used_count + 1
  WHERE id = v_token.id AND used_count < max_uses;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOKEN_EXHAUSTED'; END IF;

  INSERT INTO enrollments (classroom_id, student_id, via_token_id)
  VALUES (v_token.classroom_id, p_user, v_token.id);

  RETURN QUERY SELECT v_class.id, v_class.name, v_token.id, false;
END $$;

-- Hak eksekusi dicabut dari semua peran yang bisa dijangkau browser.
-- Dibungkus DO supaya berkas ini tetap jalan di Postgres polos, yang tidak
-- punya peran `anon`/`authenticated` bawaan Supabase.
REVOKE ALL ON FUNCTION redeem_group_token(text, uuid) FROM PUBLIC;
DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION redeem_group_token(text, uuid) FROM anon';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
DO $$
BEGIN
  EXECUTE 'REVOKE ALL ON FUNCTION redeem_group_token(text, uuid) FROM authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;
