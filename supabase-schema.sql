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

-- Papan peringkat: view berkolom terbatas, BUKAN policy baca-semua.
--
-- Sebelumnya di sini ada policy "Leaderboard read" yang memberi SELECT atas
-- SELURUH baris user_progress kepada setiap pengguna terautentikasi.
-- Komentarnya berbunyi "no email/id exposed via API" — dan itu keliru: RLS
-- bekerja per-BARIS, bukan per-kolom. Begitu satu baris lolos, seluruh
-- kolomnya ikut terbaca, jadi siapa pun yang login bisa meminta
-- select=email,is_premium,plan dan memanen alamat email serta status
-- langganan semua pengguna. Papan peringkatnya sendiri (getLeaderboard di
-- assets/supabase-client.js) cuma memakai name, xp, streak, level.
--
-- Sekarang batasnya dipasang di tempat yang memang bisa membatasi kolom.
-- security_invoker = false membuat view berjalan sebagai pemiliknya sehingga
-- RLS tabel dasar dilewati — itu justru yang dibutuhkan, karena papan
-- peringkat harus melihat baris milik semua orang. Hak anon dicabut agar
-- pengunjung yang belum masuk tidak ikut membacanya.
--
-- Baris milik sendiri tetap terbaca utuh lewat policy "Users own data".
DROP POLICY IF EXISTS "Leaderboard read" ON user_progress;

CREATE OR REPLACE VIEW public.leaderboard AS
  SELECT name, xp, streak, level FROM public.user_progress;
ALTER VIEW public.leaderboard SET (security_invoker = false);
REVOKE ALL ON public.leaderboard FROM PUBLIC;
REVOKE ALL ON public.leaderboard FROM anon;
GRANT SELECT ON public.leaderboard TO authenticated;

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
-- Hak eksekusi dicabut dari PUBLIC/anon; hanya authenticated (sesi sah) yang
-- boleh memanggil, dan hanya untuk baris log miliknya sendiri (dijaga WHERE
-- di dalam fungsi).
--
-- REVOKE harus berada SESUDAH CREATE. Sebelumnya baris ini ada di atas, dan
-- itu jalan di basis data yang fungsinya sudah ada -- tapi di basis data baru
-- fungsinya belum lahir saat baris ini dibaca, dan REVOKE tidak punya bentuk
-- IF EXISTS, jadi seluruh skema berhenti dengan "42883: function
-- apply_user_xp(uuid, bigint) does not exist". Terbukti saat pemasangan
-- pertama yang sungguhan. redeem_group_token di bawah sudah memakai urutan
-- yang benar ini.
REVOKE ALL ON FUNCTION apply_user_xp(uuid, bigint) FROM PUBLIC;
DO $$ BEGIN
  EXECUTE 'GRANT EXECUTE ON FUNCTION apply_user_xp(uuid, bigint) TO authenticated';
EXCEPTION WHEN undefined_object THEN NULL; END $$;

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
-- Sama seperti apply_user_xp: dicabut sesudah fungsinya ada, bukan sebelum.
REVOKE ALL ON FUNCTION mark_user_xp_applied(uuid, bigint) FROM PUBLIC;
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


-- ============================================================
-- SSW (特定技能) — skema pembelajaran + CMS
-- ============================================================
-- Fase 1 platform SSW. Additive terhadap schema existing: tidak
-- satu pun tabel/kolom lama disentuh. Semua statement idempoten
-- (IF NOT EXISTS / DO $$ EXCEPTION duplicate_object) supaya file
-- ini aman di-Run ulang di SQL Editor — pola yang sama dengan
-- sisa supabase-schema.sql.
--
-- Pola konten mengikuti jlpt_questions: publik hanya boleh baca
-- published = true; penulisan konten TIDAK lewat PostgREST sama
-- sekali, hanya lewat netlify/functions/ssw-cms.js (service key,
-- role admin diverifikasi server). RLS di bawah sengaja hanya
-- memberi SELECT ke publik dan SELECT/INSERT/UPDATE/DELETE ke
-- owner utk tabel milik user sendiri (progress/exam/favorites).
--
-- Sumber resmi utama:
--   ISA  https://www.moj.go.jp/isa/index.html        (kebijakan 特定技能)
--   OTIT https://www.otit.go.jp/                     (ujian 技能試験)
--   JITCO https://www.jitco.or.jp/                   (panduan bidang)

-- ── Kategori bidang SSW (dinamis — admin bisa INSERT lewat CMS) ──
CREATE TABLE IF NOT EXISTS ssw_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text UNIQUE NOT NULL,               -- 'kaigo', 'nougyou', ...
  name_jp     text NOT NULL,                      -- 介護
  name_id     text NOT NULL,                      -- Perawatan
  name_en     text NOT NULL,                      -- Caregiving
  icon        text NOT NULL DEFAULT '🗂️',
  type1_ok    boolean NOT NULL DEFAULT true,      -- tersedia di 特定技能1号
  type2_ok    boolean NOT NULL DEFAULT false,     -- tersedia di 特定技能2号
  description text NOT NULL DEFAULT '',
  sort        integer NOT NULL DEFAULT 100,
  published   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── Modul & lesson (Category → Module → Lesson) ──
CREATE TABLE IF NOT EXISTS ssw_modules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES ssw_categories(id) ON DELETE CASCADE,
  title       text NOT NULL,
  title_jp    text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  sort        integer NOT NULL DEFAULT 100,
  published   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssw_modules_cat ON ssw_modules(category_id, sort);

CREATE TABLE IF NOT EXISTS ssw_lessons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id    uuid NOT NULL REFERENCES ssw_modules(id) ON DELETE CASCADE,
  slug         text NOT NULL,
  title        text NOT NULL,
  title_jp     text NOT NULL DEFAULT '',
  description  text NOT NULL DEFAULT '',
  body_md      text NOT NULL DEFAULT '',          -- materi teks (heading/list/tabel ringan)
  vocab_ids    uuid[] NOT NULL DEFAULT '{}',      -- referensi ssw_vocabulary
  kanji_ids    uuid[] NOT NULL DEFAULT '{}',
  grammar_ids  uuid[] NOT NULL DEFAULT '{}',
  audio_text   text NOT NULL DEFAULT '',          -- teks yang dibacakan /api/tts
  video_url    text NOT NULL DEFAULT '',
  dialogues    jsonb NOT NULL DEFAULT '[]',       -- [{speaker, jp, furigana, id}]
  example_questions jsonb NOT NULL DEFAULT '[]',  -- [{q, choices, correct, explanation}]
  notes        text NOT NULL DEFAULT '',          -- catatan penting
  sort         integer NOT NULL DEFAULT 100,
  published    boolean NOT NULL DEFAULT true,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, slug)
);
CREATE INDEX IF NOT EXISTS idx_ssw_lessons_module ON ssw_lessons(module_id, sort);

-- ── Kosakata SSW ──
CREATE TABLE IF NOT EXISTS ssw_vocabulary (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id      uuid NOT NULL REFERENCES ssw_categories(id) ON DELETE CASCADE,
  term             text NOT NULL,                 -- 日本語
  furigana         text NOT NULL DEFAULT '',
  romaji           text NOT NULL DEFAULT '',
  meaning_id       text NOT NULL,                -- arti Indonesia
  meaning_en       text NOT NULL DEFAULT '',
  example          text NOT NULL DEFAULT '',     -- contoh kalimat JP
  example_furigana text NOT NULL DEFAULT '',
  example_id       text NOT NULL DEFAULT '',     -- terjemahan contoh
  audio_text       text NOT NULL DEFAULT '',     -- kosong = term itu sendiri
  tags             text[] NOT NULL DEFAULT '{}',
  level            text NOT NULL DEFAULT 'dasar' CHECK (level IN ('dasar','menengah','lanjut')),
  published        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssw_vocab_cat ON ssw_vocabulary(category_id);
-- Pencarian JP + ID di sisi DB (used oleh /api/ssw-cms?action=search)
CREATE INDEX IF NOT EXISTS idx_ssw_vocab_term ON ssw_vocabulary USING gin (to_tsvector('simple', term || ' ' || furigana || ' ' || romaji || ' ' || meaning_id));

-- ── Kanji SSW ──
CREATE TABLE IF NOT EXISTS ssw_kanji (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES ssw_categories(id) ON DELETE CASCADE,
  kanji       text NOT NULL,
  onyomi      text NOT NULL DEFAULT '',
  kunyomi     text NOT NULL DEFAULT '',
  furigana    text NOT NULL DEFAULT '',
  meaning_id  text NOT NULL,
  examples    jsonb NOT NULL DEFAULT '[]',        -- [{word, reading, meaning_id}]
  sentence    text NOT NULL DEFAULT '',           -- contoh kalimat
  sentence_furigana text NOT NULL DEFAULT '',
  sentence_id text NOT NULL DEFAULT '',
  strokes     integer,
  published   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssw_kanji_cat ON ssw_kanji(category_id);

-- ── Grammar SSW ──
CREATE TABLE IF NOT EXISTS ssw_grammar (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES ssw_categories(id) ON DELETE CASCADE,
  pattern     text NOT NULL,                      -- ～なければなりません
  meaning_id  text NOT NULL,
  explanation text NOT NULL DEFAULT '',
  structure   text NOT NULL DEFAULT '',
  examples    jsonb NOT NULL DEFAULT '[]',        -- [{jp, furigana, id}]
  notes       text NOT NULL DEFAULT '',           -- catatan penggunaan
  published   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssw_grammar_cat ON ssw_grammar(category_id);

-- ── Listening ──
CREATE TABLE IF NOT EXISTS ssw_listening (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES ssw_categories(id) ON DELETE CASCADE,
  title       text NOT NULL,
  audio_text  text NOT NULL,                      -- dibacakan /api/tts (gratis, instan)
  transcript  text NOT NULL DEFAULT '',
  transcript_furigana text NOT NULL DEFAULT '',
  translation_id text NOT NULL DEFAULT '',
  questions   jsonb NOT NULL DEFAULT '[]',        -- [{type:'choice'|'blank'|'tf', ...}]
  published   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssw_listening_cat ON ssw_listening(category_id);

-- ── Reading ──
CREATE TABLE IF NOT EXISTS ssw_reading (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES ssw_categories(id) ON DELETE CASCADE,
  title       text NOT NULL,
  text        text NOT NULL,                      -- teks Jepang
  furigana_text text NOT NULL DEFAULT '',         -- versi ber-furigana (toggle)
  translation_id text NOT NULL DEFAULT '',        -- versi Indonesia (toggle)
  vocab       jsonb NOT NULL DEFAULT '[]',        -- [{term, reading, meaning_id}]
  questions   jsonb NOT NULL DEFAULT '[]',
  published   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssw_reading_cat ON ssw_reading(category_id);

-- ── Quiz / Practice / Mock Exam ──
-- kind: 'quiz' (per lesson/topik) | 'practice' (Practice Test) | 'mock' (Mock Exam)
-- source: 'practice' (Generated Practice) | 'official' (Officially sourced) —
-- label ini WAJIB ditampilkan apa adanya di UI; jangan pernah menampilkan
-- soal generated sebagai soal resmi.
CREATE TABLE IF NOT EXISTS ssw_quizzes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid NOT NULL REFERENCES ssw_categories(id) ON DELETE CASCADE,
  lesson_id       uuid REFERENCES ssw_lessons(id) ON DELETE SET NULL,
  kind            text NOT NULL CHECK (kind IN ('quiz','practice','mock')),
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  pass_score      integer NOT NULL DEFAULT 60,    -- persen
  time_limit_min  integer,                        -- NULL = tanpa batas waktu
  question_count  integer,                        -- utk mock: jumlah soal per sesi
  randomize       boolean NOT NULL DEFAULT false,
  source          text NOT NULL DEFAULT 'practice' CHECK (source IN ('practice','official')),
  source_name     text NOT NULL DEFAULT '',
  source_url      text NOT NULL DEFAULT '',
  source_updated  date,
  published       boolean NOT NULL DEFAULT true,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssw_quizzes_cat ON ssw_quizzes(category_id, kind);

-- type: mc|tf|fill|match|vocab|kanji|grammar|listening|reading
-- payload/answer jsonb: bentuk per tipe dijaga test unit test-ssw-cms.js
CREATE TABLE IF NOT EXISTS ssw_questions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id     uuid NOT NULL REFERENCES ssw_quizzes(id) ON DELETE CASCADE,
  type        text NOT NULL CHECK (type IN ('mc','tf','fill','match','vocab','kanji','grammar','listening','reading')),
  payload     jsonb NOT NULL,                     -- {question, choices[], audio_text, passage, ...}
  answer      jsonb NOT NULL,                     -- {index|bool|text|pairs[]}
  explanation text NOT NULL DEFAULT '',
  points      integer NOT NULL DEFAULT 1,
  sort        integer NOT NULL DEFAULT 100,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssw_questions_quiz ON ssw_questions(quiz_id, sort);

-- ── Progres & hasil (milik user sendiri) ──
CREATE TABLE IF NOT EXISTS ssw_progress (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid REFERENCES ssw_categories(id) ON DELETE CASCADE,
  item_kind   text NOT NULL CHECK (item_kind IN ('lesson','vocab','kanji','grammar','listening','reading','quiz')),
  item_id     text NOT NULL,                      -- uuid konten ATAU slug lokal
  completed   boolean NOT NULL DEFAULT false,
  score       integer,
  last_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_kind, item_id)
);
CREATE INDEX IF NOT EXISTS idx_ssw_progress_user ON ssw_progress(user_id, category_id);

CREATE TABLE IF NOT EXISTS ssw_exam_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id     uuid REFERENCES ssw_quizzes(id) ON DELETE SET NULL,
  category_id uuid REFERENCES ssw_categories(id) ON DELETE SET NULL,
  score       integer NOT NULL,                   -- 0..100
  passed      boolean NOT NULL DEFAULT false,
  duration_s  integer NOT NULL DEFAULT 0,
  detail      jsonb NOT NULL DEFAULT '[]',        -- per soal: {qid, correct, given}
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ssw_exam_user ON ssw_exam_results(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ssw_favorites (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_kind  text NOT NULL CHECK (item_kind IN ('lesson','vocab','kanji','grammar','listening','reading','quiz')),
  item_id    text NOT NULL,
  label      text NOT NULL DEFAULT '',            -- snapshot judul utk tampilan
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_kind, item_id)
);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE ssw_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_modules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_lessons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_vocabulary  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_kanji       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_grammar     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_listening   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_reading     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_quizzes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_progress    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ssw_favorites   ENABLE ROW LEVEL SECURITY;

-- Konten: publik baca published saja. Tidak ada policy INSERT/UPDATE/DELETE —
-- penulisan hanya via ssw-cms.js (service key bypass RLS), pola jlpt_questions.
DO $$ BEGIN
  CREATE POLICY "SSW categories public read" ON ssw_categories FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "SSW modules public read" ON ssw_modules FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "SSW lessons public read" ON ssw_lessons FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "SSW vocab public read" ON ssw_vocabulary FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "SSW kanji public read" ON ssw_kanji FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "SSW grammar public read" ON ssw_grammar FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "SSW listening public read" ON ssw_listening FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "SSW reading public read" ON ssw_reading FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "SSW quizzes public read" ON ssw_quizzes FOR SELECT USING (published = true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "SSW questions public read" ON ssw_questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM ssw_quizzes q WHERE q.id = quiz_id AND q.published = true)
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Progres/hasil/favorit: milik user sendiri.
DO $$ BEGIN
  CREATE POLICY "SSW progress own" ON ssw_progress FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "SSW exam results own" ON ssw_exam_results FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "SSW favorites own" ON ssw_favorites FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- Seed 14 bidang resmi (slug dipakai URL ?field=)
-- Sumber daftar: ISA/OTIT — 12 bidang 1号,其中的 11 juga 2号.
-- idempoten: ON CONFLICT DO NOTHING supaya editan admin lewat CMS
-- tidak tertimpa bila schema di-run ulang.
-- ============================================================
INSERT INTO ssw_categories (slug, name_jp, name_id, name_en, icon, type1_ok, type2_ok, description, sort) VALUES
  ('kaigo',       '介護',             'Perawatan Lansia',        'Caregiving',                     '🧑‍🦳', true,  true,  'Perawatan harian lansia di fasilitas/rumah — ekosistem materi Kaigo situs ini tersedia penuh.', 10),
  ('building-clean','ビルクリーニング','Pembersihan Gedung',      'Building Cleaning',              '🧹', true,  true,  'Pembersihan interior/eksterior gedung dan manajemen kebersihan fasilitas.', 20),
  ('manufaktur',  '工業製品製造業',     'Manufaktur Produk Industri','Industrial Product Manufacturing','🏭', true, true, 'Pemeriksaan kualitas, perakitan, dan pengolahan material produk industri.', 30),
  ('kensetsu',    '建設',             'Konstruksi',              'Construction',                   '🏗️', true,  true,  'Konstruksi bangunan, sipil, dan pemeliharaan fasilitas.', 40),
  ('zousen',      '造船・舶用工業',     'Perkapalan',              'Shipbuilding & Marine Equipment','🚢', true,  true,  'Perakitan kapal, kelengkapan laut, dan pekerjaan pelayaran.', 50),
  ('jidousha-seibi','自動車整備',      'Servis Otomotif',         'Automobile Maintenance',         '🔧', true,  true,  'Perawatan dan perbaikan kendaraan bermotor di bengkel resmi.', 60),
  ('koukuu',      '航空',             'Penerbangan',             'Aviation',                       '✈️', true,  true,  'Penanganan darat bandara, bagasi, kargo, dan kebersihan pesawat.', 70),
  ('shukuhaku',   '宿泊',             'Perhotelan',              'Accommodation',                  '🏨', true,  true,  'Front desk, housekeeping, F&B hotel dan ryokan.', 80),
  ('unten',       '自動車運送業',       'Transportasi Kendaraan',  'Automobile Transportation',      '🚌', true,  false, 'Pengemudi bus/taksi/truk — khusus 1号.', 90),
  ('tetsudou',    '鉄道',             'Kereta Api',              'Railway',                        '🚉', true,  true,  'Operasional stasiun, penjualan tiket, perawatan sarana rel.', 100),
  ('nougyou',     '農業',             'Pertanian',               'Agriculture',                    '🌾', true,  true,  'Budidaya tanaman pangan/hortikultura dan manajemen lahan.', 110),
  ('gyogyou',     '漁業',             'Perikanan',               'Fishery',                        '🐟', true,  true,  'Penangkapan dan budidaya ikan serta pengolahan hasil laut.', 120),
  ('shokuhin',    '飲食料品製造業',     'Manufaktur Makanan',      'Food & Beverage Manufacturing',  '🍱', true,  true,  'Produksi dan pengolahan makanan/minuman di pabrik.', 130),
  ('gaishoku',    '外食業',           'Restoran',                'Food Service',                   '🍜', true,  true,  'Penyajian makanan di restoran/kafe — dapur dan melayani pelanggan.', 140)
ON CONFLICT (slug) DO NOTHING;

-- ══════════════════════════════════════════════════════════════════════
-- Konten SSW — 14 bidang, sangat lengkap (kosakata, kanji, grammar,
-- listening, reading, quiz latihan, modul & lesson)
-- ══════════════════════════════════════════════════════════════════════
-- ── Constraint idempoten untuk seeding konten SSW ──
-- Tabel-tabel ini awalnya hanya punya primary key UUID (selalu baru),
-- jadi ON CONFLICT pada seed di bawah butuh UNIQUE eksplisit supaya
-- menjalankan schema berkali-kali tidak menggandakan baris.
DO $$ BEGIN
  ALTER TABLE ssw_vocabulary ADD CONSTRAINT ssw_vocabulary_cat_term_key UNIQUE (category_id, term);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ssw_kanji ADD CONSTRAINT ssw_kanji_cat_kanji_key UNIQUE (category_id, kanji);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ssw_grammar ADD CONSTRAINT ssw_grammar_cat_pattern_key UNIQUE (category_id, pattern);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ssw_listening ADD CONSTRAINT ssw_listening_cat_title_key UNIQUE (category_id, title);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ssw_reading ADD CONSTRAINT ssw_reading_cat_title_key UNIQUE (category_id, title);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ssw_quizzes ADD CONSTRAINT ssw_quizzes_cat_title_key UNIQUE (category_id, title);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ssw_questions ADD CONSTRAINT ssw_questions_quiz_sort_key UNIQUE (quiz_id, sort);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE ssw_modules ADD CONSTRAINT ssw_modules_cat_title_key UNIQUE (category_id, title);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- SSW — Kosakata (ssw_vocabulary), 14 bidang × ±8 kata
-- ============================================================
INSERT INTO ssw_vocabulary (category_id, term, furigana, romaji, meaning_id, meaning_en, example, example_furigana, example_id, level, tags) VALUES
  -- 介護 Kaigo (Perawatan Lansia)
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '移乗', 'いじょう', 'ijō', 'Pemindahan/transfer pengguna', 'Transfer', '利用者をベッドから車いすへ移乗させます。', 'りようしゃをベッドからくるまいすへいじょうさせます。', 'Memindahkan pengguna dari tempat tidur ke kursi roda.', 'dasar', '{perawatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '食事介助', 'しょくじかいじょ', 'shokuji kaijo', 'Bantuan makan', 'Meal assistance', '利用者に食事介助を行います。', 'りようしゃにしょくじかいじょをおこないます。', 'Melakukan bantuan makan kepada pengguna.', 'dasar', '{perawatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '入浴介助', 'にゅうよくかいじょ', 'nyūyoku kaijo', 'Bantuan mandi', 'Bathing assistance', '入浴介助の前に体調を確認します。', 'にゅうよくかいじょのまえにたいちょうをかくにんします。', 'Memeriksa kondisi tubuh sebelum bantuan mandi.', 'dasar', '{perawatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '排泄', 'はいせつ', 'haisetsu', 'Buang air (besar/kecil)', 'Excretion', '排泄のサポートが必要です。', 'はいせつのサポートがひつようです。', 'Butuh dukungan buang air.', 'dasar', '{perawatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '認知症', 'にんちしょう', 'ninchishō', 'Demensia', 'Dementia', '認知症のご利用者に優しく話しかけます。', 'にんちしょうのごりようしゃにやさしくはなしかけます。', 'Berbicara dengan lembut kepada pengguna demensia.', 'dasar', '{kesehatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '体位変換', 'たいいへんかん', 'taii henkan', 'Pengubahan posisi tubuh', 'Repositioning', '2時間ごとに体位変換をします。', 'にじかんごとにたいいへんかんをします。', 'Mengubah posisi tubuh setiap dua jam.', 'menengah', '{perawatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '褥瘡', 'じょくそう', 'jokusō', 'Luka tekan (dekubitus)', 'Pressure sore', '褥瘡を予防するために体位を変えます。', 'じょくそうをよぼうするためにたいいをかえます。', 'Mengubah posisi untuk mencegah luka tekan.', 'lanjut', '{kesehatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), 'バイタルサイン', 'バイタルサイン', 'baitaru sain', 'Tanda vital', 'Vital signs', '毎朝バイタルサインを測定します。', 'まいあさバイタルサインをそくていします。', 'Mengukur tanda vital setiap pagi.', 'dasar', '{kesehatan}'),

  -- ビルクリーニング Building Cleaning
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '清掃', 'せいそう', 'seisō', 'Pembersihan', 'Cleaning', '毎朝ロビーを清掃します。', 'まいあさロビーをせいそうします。', 'Membersihkan lobi setiap pagi.', 'dasar', '{dasar}'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '床磨き', 'ゆかみがき', 'yuka migaki', 'Poles lantai', 'Floor polishing', 'ポリッシャーで床磨きをします。', 'ポリッシャーでゆかみがきをします。', 'Memoles lantai dengan mesin polisher.', 'dasar', '{alat}'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '洗剤', 'せんざい', 'senzai', 'Deterjen/bahan pembersih', 'Detergent', '中性洗剤を使ってください。', 'ちゅうせいせんざいをつかってください。', 'Silakan gunakan deterjen netral.', 'dasar', '{bahan}'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '高所作業', 'こうしょさぎょう', 'kōsho sagyō', 'Kerja di tempat tinggi', 'Work at height', '高所作業では安全帯を着用します。', 'こうしょさぎょうではあんぜんたいをちゃくようします。', 'Memakai sabuk pengaman saat kerja di tempat tinggi.', 'menengah', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), 'ワックスがけ', 'ワックスがけ', 'wakkusu gake', 'Pelapisan wax lantai', 'Floor waxing', '床にワックスがけをします。', 'ゆかにワックスがけをします。', 'Melapisi lantai dengan wax.', 'menengah', '{alat}'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), 'ガラス清掃', 'ガラスせいそう', 'garasu seisō', 'Pembersihan kaca', 'Glass cleaning', '窓のガラス清掃を担当します。', 'まどのガラスせいそうをたんとうします。', 'Bertanggung jawab membersihkan kaca jendela.', 'dasar', '{dasar}'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), 'ゴミ分別', 'ゴミぶんべつ', 'gomi bunbetsu', 'Pemilahan sampah', 'Waste sorting', 'ゴミ分別のルールを守ります。', 'ゴミぶんべつのルールをまもります。', 'Mematuhi aturan pemilahan sampah.', 'dasar', '{aturan}'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '安全靴', 'あんぜんぐつ', 'anzen gutsu', 'Sepatu safety', 'Safety shoes', '作業中は安全靴を履きます。', 'さぎょうちゅうはあんぜんぐつをはきます。', 'Memakai sepatu safety saat bekerja.', 'dasar', '{keselamatan}'),

  -- 工業製品製造業 Manufaktur Produk Industri
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '検品', 'けんぴん', 'kenpin', 'Pemeriksaan kualitas produk', 'Product inspection', '製品を一つずつ検品します。', 'せいひんをひとつずつけんぴんします。', 'Memeriksa produk satu per satu.', 'dasar', '{QC}'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '組立', 'くみたて', 'kumitate', 'Perakitan', 'Assembly', 'ライン作業で部品を組立します。', 'ラインさぎょうでぶひんをくみたてします。', 'Merakit komponen di jalur produksi.', 'dasar', '{produksi}'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '不良品', 'ふりょうひん', 'furyōhin', 'Barang cacat/reject', 'Defective product', '不良品を見つけたら報告します。', 'ふりょうひんをみつけたらほうこくします。', 'Melapor jika menemukan barang cacat.', 'dasar', '{QC}'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '溶接', 'ようせつ', 'yōsetsu', 'Pengelasan', 'Welding', '溶接の資格を取得しました。', 'ようせつのしかくをしゅとくしました。', 'Memperoleh sertifikat pengelasan.', 'menengah', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), 'プレス加工', 'プレスかこう', 'puresu kakō', 'Proses press/stamping', 'Press processing', 'プレス加工で金属を成形します。', 'プレスかこうできんぞくをせいけいします。', 'Membentuk logam dengan proses press.', 'menengah', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '安全教育', 'あんぜんきょういく', 'anzen kyōiku', 'Pelatihan keselamatan kerja', 'Safety training', '入社時に安全教育を受けます。', 'にゅうしゃじにあんぜんきょういくをうけます。', 'Menerima pelatihan keselamatan saat masuk kerja.', 'dasar', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '寸法', 'すんぽう', 'sunpō', 'Ukuran/dimensi', 'Dimension', 'ノギスで寸法を測ります。', 'ノギスですんぽうをはかります。', 'Mengukur dimensi dengan jangka sorong.', 'menengah', '{QC}'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '作業手順書', 'さぎょうてじゅんしょ', 'sagyō tejunsho', 'Instruksi kerja/SOP', 'Work instruction sheet', '作業手順書の通りに進めます。', 'さぎょうてじゅんしょのとおりにすすめます。', 'Bekerja sesuai instruksi kerja.', 'dasar', '{aturan}'),

  -- 建設 Kensetsu (Konstruksi)
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '足場', 'あしば', 'ashiba', 'Perancah/scaffolding', 'Scaffolding', '足場を組んでから作業します。', 'あしばをくんでからさぎょうします。', 'Bekerja setelah memasang perancah.', 'dasar', '{alat}'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '型枠', 'かたわく', 'katawaku', 'Bekisting cor', 'Formwork', '型枠にコンクリートを流します。', 'かたわくにコンクリートをながします。', 'Menuang beton ke dalam bekisting.', 'menengah', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '鉄筋', 'てっきん', 'tekkin', 'Besi tulangan', 'Rebar', '鉄筋を結束線で固定します。', 'てっきんをけっそくせんでこていします。', 'Mengikat besi tulangan dengan kawat.', 'menengah', '{material}'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), 'ヘルメット着用', 'ヘルメットちゃくよう', 'herumetto chakuyō', 'Memakai helm', 'Wearing helmet', '現場では必ずヘルメット着用です。', 'げんばではかならずヘルメットちゃくようです。', 'Wajib memakai helm di lokasi proyek.', 'dasar', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '重機', 'じゅうき', 'jūki', 'Alat berat', 'Heavy machinery', '重機の周りに近づかないでください。', 'じゅうきのまわりにちかづかないでください。', 'Jangan mendekat di sekitar alat berat.', 'dasar', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '墨出し', 'すみだし', 'sumidashi', 'Penandaan garis konstruksi', 'Marking lines', '柱の位置に墨出しをします。', 'はしらのいちにすみだしをします。', 'Menandai posisi tiang.', 'lanjut', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '朝礼', 'ちょうれい', 'chōrei', 'Briefing pagi', 'Morning meeting', '毎朝、朝礼で安全確認をします。', 'まいあさ、ちょうれいであんぜんかくにんをします。', 'Cek keselamatan tiap pagi saat briefing.', 'dasar', '{aturan}'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '養生', 'ようじょう', 'yōjō', 'Perlindungan/curing material', 'Protection/curing', 'コンクリートの養生期間を守ります。', 'コンクリートのようじょうきかんをまもります。', 'Menjaga masa curing beton.', 'lanjut', '{proses}'),

  -- 造船・舶用工業 Zousen (Perkapalan)
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '船体', 'せんたい', 'sentai', 'Badan kapal', 'Hull', '船体の溶接作業をします。', 'せんたいのようせつさぎょうをします。', 'Melakukan pengelasan badan kapal.', 'dasar', '{struktur}'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '艤装', 'ぎそう', 'gisō', 'Instalasi perlengkapan kapal', 'Outfitting', '艤装工事で配管を取り付けます。', 'ぎそうこうじではいかんをとりつけます。', 'Memasang pipa dalam pekerjaan instalasi.', 'lanjut', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '塗装', 'とそう', 'tosō', 'Pengecatan', 'Painting', '船体に塗装を行います。', 'せんたいにとそうをおこないます。', 'Melakukan pengecatan pada badan kapal.', 'dasar', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '鋼材', 'こうざい', 'kōzai', 'Material baja', 'Steel material', '鋼材を所定の寸法に切断します。', 'こうざいをしょていのすんぽうにせつだんします。', 'Memotong material baja sesuai ukuran.', 'menengah', '{material}'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '足場作業', 'あしばさぎょう', 'ashiba sagyō', 'Kerja di perancah', 'Scaffold work', 'ドック内で足場作業をします。', 'ドックないであしばさぎょうをします。', 'Bekerja di perancah dalam dok.', 'menengah', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '配管', 'はいかん', 'haikan', 'Perpipaan', 'Piping', '配管のつなぎ目を確認します。', 'はいかんのつなぎめをかくにんします。', 'Memeriksa sambungan pipa.', 'menengah', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '溶接資格', 'ようせつしかく', 'yōsetsu shikaku', 'Sertifikasi las', 'Welding certification', '溶接資格を持っています。', 'ようせつしかくをもっています。', 'Memiliki sertifikasi las.', 'menengah', '{sertifikasi}'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), 'ドック', 'ドック', 'dokku', 'Dok kapal', 'Dock', '船はドックで修理中です。', 'ふねはドックでしゅうりちゅうです。', 'Kapal sedang diperbaiki di dok.', 'dasar', '{fasilitas}'),

  -- 自動車整備 Jidousha-seibi (Servis Otomotif)
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '点検', 'てんけん', 'tenken', 'Pemeriksaan/inspeksi', 'Inspection', '車の点検を行います。', 'くるまのてんけんをおこないます。', 'Melakukan pemeriksaan mobil.', 'dasar', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), 'オイル交換', 'オイルこうかん', 'oiru kōkan', 'Ganti oli', 'Oil change', 'エンジンオイル交換をします。', 'エンジンオイルこうかんをします。', 'Mengganti oli mesin.', 'dasar', '{perawatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), 'ブレーキ', 'ブレーキ', 'burēki', 'Rem', 'Brake', 'ブレーキパッドを交換します。', 'ブレーキパッドをこうかんします。', 'Mengganti kampas rem.', 'dasar', '{komponen}'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), 'エンジン', 'エンジン', 'enjin', 'Mesin', 'Engine', 'エンジンの異音を確認します。', 'エンジンのいおんをかくにんします。', 'Memeriksa suara aneh dari mesin.', 'dasar', '{komponen}'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), 'タイヤ交換', 'タイヤこうかん', 'taiya kōkan', 'Ganti ban', 'Tire change', 'パンクしたタイヤ交換をします。', 'パンクしたタイヤこうかんをします。', 'Mengganti ban yang bocor.', 'dasar', '{perawatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '車検', 'しゃけん', 'shaken', 'Inspeksi kendaraan berkala', 'Vehicle inspection', '車検の準備をします。', 'しゃけんのじゅんびをします。', 'Menyiapkan inspeksi kendaraan berkala.', 'menengah', '{aturan}'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '整備士', 'せいびし', 'seibishi', 'Mekanik/teknisi servis', 'Mechanic', '整備士として働いています。', 'せいびしとしてはたらいています。', 'Bekerja sebagai mekanik.', 'dasar', '{profesi}'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '故障診断', 'こしょうしんだん', 'koshō shindan', 'Diagnosis kerusakan', 'Fault diagnosis', '機械で故障診断をします。', 'きかいでこしょうしんだんをします。', 'Mendiagnosis kerusakan dengan alat.', 'menengah', '{proses}'),

  -- 航空 Koukuu (Penerbangan)
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '手荷物', 'てにもつ', 'tenimotsu', 'Bagasi', 'Baggage', '手荷物をベルトコンベアに載せます。', 'てにもつをベルトコンベアにのせます。', 'Meletakkan bagasi di ban berjalan.', 'dasar', '{operasional}'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '搭乗手続き', 'とうじょうてつづき', 'tōjō tetsuzuki', 'Prosedur boarding', 'Boarding procedure', '搭乗手続きをご案内します。', 'とうじょうてつづきをごあんないします。', 'Memandu prosedur boarding.', 'dasar', '{layanan}'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '貨物', 'かもつ', 'kamotsu', 'Kargo', 'Cargo', '貨物を航空機に積み込みます。', 'かもつをこうくうきにつみこみます。', 'Memuat kargo ke pesawat.', 'dasar', '{operasional}'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '機内清掃', 'きないせいそう', 'kinai seisō', 'Pembersihan kabin pesawat', 'Cabin cleaning', '着陸後に機内清掃をします。', 'ちゃくりくごにきないせいそうをします。', 'Membersihkan kabin setelah mendarat.', 'dasar', '{operasional}'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '誘導灯', 'ゆうどうとう', 'yūdōtō', 'Lampu pemandu (marshalling)', 'Guidance light', '誘導灯を使って飛行機を誘導します。', 'ゆうどうとうをつかってひこうきをゆうどうします。', 'Memandu pesawat dengan lampu pemandu.', 'menengah', '{operasional}'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '地上支援', 'ちじょうしえん', 'chijō shien', 'Ground support', 'Ground support', '地上支援業務を担当します。', 'ちじょうしえんぎょうむをたんとうします。', 'Bertanggung jawab pada ground support.', 'menengah', '{profesi}'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '安全確認', 'あんぜんかくにん', 'anzen kakunin', 'Konfirmasi keselamatan', 'Safety check', '出発前に安全確認をします。', 'しゅっぱつまえにあんぜんかくにんをします。', 'Melakukan konfirmasi keselamatan sebelum berangkat.', 'dasar', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '滑走路', 'かっそうろ', 'kassōro', 'Landasan pacu', 'Runway', '滑走路には許可なく入れません。', 'かっそうろにはきょかなくはいれません。', 'Tidak boleh masuk landasan pacu tanpa izin.', 'menengah', '{fasilitas}'),

  -- 宿泊 Shukuhaku (Perhotelan)
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), 'チェックイン', 'チェックイン', 'chekkuin', 'Check-in', 'Check-in', 'お客様のチェックインを担当します。', 'おきゃくさまのチェックインをたんとうします。', 'Melayani check-in tamu.', 'dasar', '{front-desk}'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '客室清掃', 'きゃくしつせいそう', 'kyakushitsu seisō', 'Pembersihan kamar tamu', 'Room cleaning', '客室清掃は午前中に行います。', 'きゃくしつせいそうはごぜんちゅうにおこないます。', 'Membersihkan kamar tamu di pagi hari.', 'dasar', '{housekeeping}'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '予約', 'よやく', 'yoyaku', 'Reservasi', 'Reservation', '電話で予約を受け付けます。', 'でんわでよやくをうけつけます。', 'Menerima reservasi lewat telepon.', 'dasar', '{front-desk}'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '接客', 'せっきゃく', 'sekkyaku', 'Pelayanan tamu', 'Customer service', '丁寧な接客を心がけます。', 'ていねいなせっきゃくをこころがけます。', 'Mengutamakan pelayanan yang sopan.', 'dasar', '{layanan}'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), 'ベッドメイキング', 'ベッドメイキング', 'beddo meikingu', 'Merapikan tempat tidur', 'Bed making', 'ベッドメイキングを丁寧に行います。', 'ベッドメイキングをていねいにおこないます。', 'Merapikan tempat tidur dengan teliti.', 'dasar', '{housekeeping}'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '朝食会場', 'ちょうしょくかいじょう', 'chōshoku kaijō', 'Area sarapan', 'Breakfast venue', '朝食会場のご案内をします。', 'ちょうしょくかいじょうのごあんないをします。', 'Mengarahkan ke area sarapan.', 'dasar', '{F&B}'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), 'クレーム対応', 'クレームたいおう', 'kurēmu taiō', 'Penanganan keluhan', 'Complaint handling', 'クレーム対応は丁寧に行います。', 'クレームたいおうはていねいにおこないます。', 'Menangani keluhan dengan sopan.', 'menengah', '{layanan}'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), 'チェックアウト', 'チェックアウト', 'chekkuauto', 'Check-out', 'Check-out', 'チェックアウトの時間は10時です。', 'チェックアウトのじかんは10じです。', 'Waktu check-out adalah jam 10.', 'dasar', '{front-desk}'),

  -- 自動車運送業 Unten (Transportasi Kendaraan)
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '運転免許', 'うんてんめんきょ', 'unten menkyo', 'SIM/lisensi mengemudi', 'Driving license', '二種運転免許が必要です。', 'にしゅうんてんめんきょがひつようです。', 'Diperlukan SIM kelas dua.', 'dasar', '{lisensi}'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '運行管理', 'うんこうかんり', 'unkō kanri', 'Manajemen operasi armada', 'Fleet operation management', '運行管理者の指示に従います。', 'うんこうかんりしゃのしじにしたがいます。', 'Mengikuti instruksi manajer operasi.', 'menengah', '{aturan}'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '点呼', 'てんこ', 'tenko', 'Absensi/pemeriksaan sebelum kerja', 'Roll call check', '出発前に点呼を受けます。', 'しゅっぱつまえにてんこをうけます。', 'Menjalani pemeriksaan sebelum berangkat.', 'dasar', '{aturan}'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '安全運転', 'あんぜんうんてん', 'anzen unten', 'Mengemudi aman', 'Safe driving', '常に安全運転を心がけます。', 'つねにあんぜんうんてんをこころがけます。', 'Selalu mengutamakan mengemudi aman.', 'dasar', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '乗客', 'じょうきゃく', 'jōkyaku', 'Penumpang', 'Passenger', '乗客の安全を確認します。', 'じょうきゃくのあんぜんをかくにんします。', 'Memastikan keselamatan penumpang.', 'dasar', '{layanan}'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '運賃', 'うんちん', 'unchin', 'Tarif angkutan', 'Fare', '運賃をメーターで確認します。', 'うんちんをメーターでかくにんします。', 'Memeriksa tarif dari argo.', 'dasar', '{operasional}'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '経路', 'けいろ', 'keiro', 'Rute perjalanan', 'Route', '最短の経路を選びます。', 'さいたんのけいろをえらびます。', 'Memilih rute tercepat.', 'menengah', '{operasional}'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '車両点検', 'しゃりょうてんけん', 'sharyō tenken', 'Pemeriksaan kendaraan', 'Vehicle inspection', '乗務前に車両点検をします。', 'じょうむまえにしゃりょうてんけんをします。', 'Memeriksa kendaraan sebelum bertugas.', 'dasar', '{keselamatan}'),

  -- 鉄道 Tetsudou (Kereta Api)
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '改札', 'かいさつ', 'kaisatsu', 'Gerbang tiket', 'Ticket gate', '改札でチケットを確認します。', 'かいさつでチケットをかくにんします。', 'Memeriksa tiket di gerbang tiket.', 'dasar', '{operasional}'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), 'ホーム', 'ホーム', 'hōmu', 'Peron stasiun', 'Platform', 'ホームで安全確認をします。', 'ホームであんぜんかくにんをします。', 'Melakukan pengecekan keselamatan di peron.', 'dasar', '{fasilitas}'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '発車', 'はっしゃ', 'hassha', 'Keberangkatan (kereta)', 'Departure', '電車が定刻に発車します。', 'でんしゃがていこくにはっしゃします。', 'Kereta berangkat tepat waktu.', 'dasar', '{operasional}'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '保守点検', 'ほしゅてんけん', 'hoshu tenken', 'Perawatan & inspeksi sarana', 'Maintenance inspection', '線路の保守点検を行います。', 'せんろのほしゅてんけんをおこないます。', 'Melakukan perawatan dan inspeksi rel.', 'menengah', '{perawatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '遅延', 'ちえん', 'chien', 'Keterlambatan', 'Delay', '大雨により遅延が発生しました。', 'おおあめによりちえんがはっせいしました。', 'Terjadi keterlambatan karena hujan lebat.', 'dasar', '{operasional}'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '券売機', 'けんばいき', 'kenbaiki', 'Mesin tiket otomatis', 'Ticket vending machine', '券売機でチケットを買います。', 'けんばいきでチケットをかいます。', 'Membeli tiket di mesin tiket otomatis.', 'dasar', '{fasilitas}'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '踏切', 'ふみきり', 'fumikiri', 'Perlintasan sebidang', 'Level crossing', '踏切の安全を確認します。', 'ふみきりのあんぜんをかくにんします。', 'Memeriksa keselamatan perlintasan sebidang.', 'menengah', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '車掌', 'しゃしょう', 'shashō', 'Kondektur', 'Conductor', '車掌がアナウンスをします。', 'しゃしょうがアナウンスをします。', 'Kondektur melakukan pengumuman.', 'dasar', '{profesi}'),

  -- 農業 Nougyou (Pertanian)
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '収穫', 'しゅうかく', 'shūkaku', 'Panen', 'Harvest', '野菜の収穫をします。', 'やさいのしゅうかくをします。', 'Memanen sayuran.', 'dasar', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '種まき', 'たねまき', 'tanemaki', 'Penyemaian benih', 'Seeding', '畑に種まきをします。', 'はたけにたねまきをします。', 'Menyemai benih di ladang.', 'dasar', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '施肥', 'せひ', 'sehi', 'Pemupukan', 'Fertilizing', '定期的に施肥を行います。', 'ていきてきにせひをおこないます。', 'Melakukan pemupukan secara berkala.', 'menengah', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '農薬散布', 'のうやくさんぷ', 'nōyaku sanpu', 'Penyemprotan pestisida', 'Pesticide spraying', '農薬散布の前に防護服を着ます。', 'のうやくさんぷのまえにぼうごふくをきます。', 'Memakai baju pelindung sebelum menyemprot pestisida.', 'menengah', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), 'ビニールハウス', 'ビニールハウス', 'binīru hausu', 'Rumah kaca (greenhouse)', 'Greenhouse', 'ビニールハウスで野菜を育てます。', 'ビニールハウスでやさいをそだてます。', 'Membudidayakan sayuran di rumah kaca.', 'dasar', '{fasilitas}'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '選別', 'せんべつ', 'senbetsu', 'Sortasi hasil panen', 'Sorting', 'サイズごとに選別します。', 'サイズごとにせんべつします。', 'Menyortir berdasarkan ukuran.', 'dasar', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '灌水', 'かんすい', 'kansui', 'Penyiraman/irigasi', 'Irrigation', '朝と夕方に灌水をします。', 'あさとゆうがたにかんすいをします。', 'Menyiram pagi dan sore.', 'dasar', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), 'トラクター', 'トラクター', 'torakutā', 'Traktor', 'Tractor', 'トラクターで畑を耕します。', 'トラクターではたけをたがやします。', 'Membajak ladang dengan traktor.', 'menengah', '{alat}'),

  -- 漁業 Gyogyou (Perikanan)
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '漁船', 'ぎょせん', 'gyosen', 'Kapal ikan', 'Fishing boat', '漁船に乗って出港します。', 'ぎょせんにのってしゅっこうします。', 'Naik kapal ikan lalu berangkat berlayar.', 'dasar', '{fasilitas}'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '網', 'あみ', 'ami', 'Jaring', 'Net', '網を海に投げ入れます。', 'あみをうみになげいれます。', 'Melempar jaring ke laut.', 'dasar', '{alat}'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '養殖', 'ようしょく', 'yōshoku', 'Budidaya (akuakultur)', 'Aquaculture', '魚の養殖をしています。', 'さかなのようしょくをしています。', 'Membudidayakan ikan.', 'menengah', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '水揚げ', 'みずあげ', 'mizuage', 'Pendaratan hasil tangkapan', 'Landing catch', '朝早く水揚げをします。', 'あさはやくみずあげをします。', 'Mendaratkan hasil tangkapan pagi-pagi.', 'dasar', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '氷詰め', 'こおりづめ', 'kōrizume', 'Pengemasan dengan es', 'Ice packing', '魚を氷詰めにして保存します。', 'さかなをこおりづめにしてほぞんします。', 'Menyimpan ikan dengan cara dikemas es.', 'dasar', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '救命胴衣', 'きゅうめいどうい', 'kyūmei dōi', 'Jaket pelampung', 'Life jacket', '乗船中は救命胴衣を着用します。', 'じょうせんちゅうはきゅうめいどういをちゃくようします。', 'Memakai jaket pelampung selama di kapal.', 'dasar', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '天候確認', 'てんこうかくにん', 'tenkō kakunin', 'Pemeriksaan cuaca', 'Weather check', '出港前に天候確認をします。', 'しゅっこうまえにてんこうかくにんをします。', 'Memeriksa cuaca sebelum berangkat.', 'menengah', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '選別作業', 'せんべつさぎょう', 'senbetsu sagyō', 'Sortasi hasil tangkapan', 'Catch sorting', '魚種ごとに選別作業をします。', 'ぎょしゅごとにせんべつさぎょうをします。', 'Menyortir berdasarkan jenis ikan.', 'menengah', '{proses}'),

  -- 飲食料品製造業 Shokuhin (Manufaktur Makanan)
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '衛生管理', 'えいせいかんり', 'eisei kanri', 'Manajemen higiene', 'Hygiene management', '食品工場では衛生管理が重要です。', 'しょくひんこうじょうではえいせいかんりがじゅうようです。', 'Manajemen higiene penting di pabrik makanan.', 'dasar', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '計量', 'けいりょう', 'keiryō', 'Penimbangan/pengukuran', 'Weighing', '材料を正確に計量します。', 'ざいりょうをせいかくにけいりょうします。', 'Menimbang bahan dengan akurat.', 'dasar', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '殺菌', 'さっきん', 'sakkin', 'Sterilisasi', 'Sterilization', '加熱して殺菌を行います。', 'かねつしてさっきんをおこないます。', 'Melakukan sterilisasi dengan pemanasan.', 'menengah', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '包装', 'ほうそう', 'hōsō', 'Pengemasan', 'Packaging', '製品を包装して出荷します。', 'せいひんをほうそうしてしゅっかします。', 'Mengemas dan mengirim produk.', 'dasar', '{proses}'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '異物混入', 'いぶつこんにゅう', 'ibutsu konnyū', 'Kontaminasi benda asing', 'Foreign object contamination', '異物混入を防ぐため手袋をします。', 'いぶつこんにゅうをふせぐためてぶくろをします。', 'Memakai sarung tangan untuk mencegah kontaminasi.', 'menengah', '{QC}'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '賞味期限', 'しょうみきげん', 'shōmi kigen', 'Tanggal kedaluwarsa', 'Best-before date', '賞味期限を確認して表示します。', 'しょうみきげんをかくにんしてひょうじします。', 'Memeriksa dan mencantumkan tanggal kedaluwarsa.', 'dasar', '{QC}'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '手洗い消毒', 'てあらいしょうどく', 'tearai shōdoku', 'Cuci tangan & disinfeksi', 'Hand washing & disinfection', '作業前に手洗い消毒をします。', 'さぎょうまえにてあらいしょうどくをします。', 'Cuci tangan dan disinfeksi sebelum bekerja.', 'dasar', '{keselamatan}'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '冷凍保存', 'れいとうほぞん', 'reitō hozon', 'Penyimpanan beku', 'Frozen storage', '肉は冷凍保存します。', 'にくはれいとうほぞんします。', 'Daging disimpan dalam keadaan beku.', 'dasar', '{proses}'),

  -- 外食業 Gaishoku (Restoran)
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '注文', 'ちゅうもん', 'chūmon', 'Pesanan', 'Order', 'お客様の注文を取ります。', 'おきゃくさまのちゅうもんをとります。', 'Menerima pesanan pelanggan.', 'dasar', '{layanan}'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '盛り付け', 'もりつけ', 'moritsuke', 'Penataan hidangan', 'Plating', '料理の盛り付けをきれいにします。', 'りょうりのもりつけをきれいにします。', 'Menata hidangan dengan rapi.', 'dasar', '{dapur}'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '調理', 'ちょうり', 'chōri', 'Memasak', 'Cooking', 'レシピ通りに調理します。', 'レシピどおりにちょうりします。', 'Memasak sesuai resep.', 'dasar', '{dapur}'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '食器洗浄', 'しょっきせんじょう', 'shokki senjō', 'Pencucian peralatan makan', 'Dishwashing', '食器洗浄機を使います。', 'しょっきせんじょうきをつかいます。', 'Menggunakan mesin cuci piring.', 'dasar', '{dapur}'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), 'アレルギー対応', 'アレルギーたいおう', 'arerugī taiō', 'Penanganan alergi makanan', 'Allergy handling', 'アレルギー対応のメニューがあります。', 'アレルギーたいおうのメニューがあります。', 'Ada menu untuk penanganan alergi.', 'menengah', '{layanan}'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), 'レジ会計', 'レジかいけい', 'reji kaikei', 'Pembayaran di kasir', 'Cashier payment', 'レジ会計を担当します。', 'レジかいけいをたんとうします。', 'Bertugas di kasir.', 'dasar', '{layanan}'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), 'テーブルセッティング', 'テーブルセッティング', 'tēburu settingu', 'Penataan meja', 'Table setting', 'テーブルセッティングを整えます。', 'テーブルセッティングをととのえます。', 'Merapikan penataan meja.', 'dasar', '{layanan}'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '仕込み', 'しこみ', 'shikomi', 'Persiapan bahan sebelum buka', 'Food prep', '開店前に仕込みをします。', 'かいてんまえにしこみをします。', 'Menyiapkan bahan sebelum buka toko.', 'menengah', '{dapur}')
ON CONFLICT (category_id, term) DO NOTHING;

-- ============================================================
-- SSW — Kanji (ssw_kanji), 14 bidang × ±6 kanji relevan bidang
-- ============================================================
INSERT INTO ssw_kanji (category_id, kanji, onyomi, kunyomi, furigana, meaning_id, examples, sentence, sentence_furigana, sentence_id, strokes) VALUES
  -- kaigo
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '介', 'カイ', '', 'かい', 'Perantara/bantuan', '[{"word":"介護","reading":"かいご","meaning_id":"perawatan"}]', '介護の仕事をしています。', 'かいごのしごとをしています。', 'Saya bekerja di bidang perawatan.', 4),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '護', 'ゴ', 'まも(る)', 'ご', 'Melindungi/menjaga', '[{"word":"介護","reading":"かいご","meaning_id":"perawatan"}]', '利用者を護ります。', 'りようしゃをまもります。', 'Melindungi pengguna.', 20),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '浴', 'ヨク', 'あ(びる)', 'よく', 'Mandi', '[{"word":"入浴","reading":"にゅうよく","meaning_id":"mandi"}]', '入浴の時間です。', 'にゅうよくのじかんです。', 'Waktunya mandi.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '症', 'ショウ', '', 'しょう', 'Gejala/penyakit', '[{"word":"認知症","reading":"にんちしょう","meaning_id":"demensia"}]', '認知症の症状を観察します。', 'にんちしょうのしょうじょうをかんさつします。', 'Mengamati gejala demensia.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '施', 'シ', 'ほどこ(す)', 'し', 'Fasilitas/melaksanakan', '[{"word":"施設","reading":"しせつ","meaning_id":"fasilitas"}]', '介護施設で働きます。', 'かいごしせつではたらきます。', 'Bekerja di fasilitas perawatan.', 9),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '設', 'セツ', 'もう(ける)', 'せつ', 'Mendirikan/fasilitas', '[{"word":"施設","reading":"しせつ","meaning_id":"fasilitas"}]', '新しい施設ができました。', 'あたらしいしせつができました。', 'Fasilitas baru telah dibangun.', 11),

  -- building-clean
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '清', 'セイ', 'きよ(い)', 'せい', 'Bersih', '[{"word":"清掃","reading":"せいそう","meaning_id":"pembersihan"}]', '毎日清掃をします。', 'まいにちせいそうをします。', 'Membersihkan setiap hari.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '掃', 'ソウ', 'は(く)', 'そう', 'Menyapu/membersihkan', '[{"word":"清掃","reading":"せいそう","meaning_id":"pembersihan"}]', '床を掃きます。', 'ゆかをはきます。', 'Menyapu lantai.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '磨', 'マ', 'みが(く)', 'ま', 'Memoles/menggosok', '[{"word":"床磨き","reading":"ゆかみがき","meaning_id":"poles lantai"}]', '窓を磨きます。', 'まどをみがきます。', 'Memoles jendela.', 16),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '洗', 'セン', 'あら(う)', 'せん', 'Mencuci', '[{"word":"洗剤","reading":"せんざい","meaning_id":"deterjen"}]', '洗剤で汚れを落とします。', 'せんざいでよごれをおとします。', 'Menghilangkan kotoran dengan deterjen.', 9),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '危', 'キ', 'あぶ(ない)', 'き', 'Bahaya', '[{"word":"危険","reading":"きけん","meaning_id":"bahaya"}]', '高所作業は危険です。', 'こうしょさぎょうはきけんです。', 'Kerja di tempat tinggi berbahaya.', 6),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '険', 'ケン', '', 'けん', 'Curam/berisiko', '[{"word":"危険","reading":"きけん","meaning_id":"bahaya"}]', '危険な場所に注意します。', 'きけんなばしょにちゅういします。', 'Berhati-hati di tempat berbahaya.', 11),

  -- manufaktur
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '製', 'セイ', '', 'せい', 'Membuat/produksi', '[{"word":"製造","reading":"せいぞう","meaning_id":"produksi"}]', '製品を製造します。', 'せいひんをせいぞうします。', 'Memproduksi produk.', 14),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '造', 'ゾウ', 'つく(る)', 'ぞう', 'Membuat/membangun', '[{"word":"製造","reading":"せいぞう","meaning_id":"produksi"}]', '工場で部品を造ります。', 'こうじょうでぶひんをつくります。', 'Membuat komponen di pabrik.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '検', 'ケン', '', 'けん', 'Memeriksa', '[{"word":"検品","reading":"けんぴん","meaning_id":"pemeriksaan"}]', '製品を検品します。', 'せいひんをけんぴんします。', 'Memeriksa produk.', 12),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '品', 'ヒン', 'しな', 'ひん', 'Barang/kualitas', '[{"word":"不良品","reading":"ふりょうひん","meaning_id":"barang cacat"}]', '不良品を除きます。', 'ふりょうひんをのぞきます。', 'Menyingkirkan barang cacat.', 9),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '組', 'ソ', 'く(む)', 'そ', 'Merakit/kelompok', '[{"word":"組立","reading":"くみたて","meaning_id":"perakitan"}]', '部品を組み立てます。', 'ぶひんをくみたてます。', 'Merakit komponen.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '寸', 'スン', '', 'すん', 'Ukuran', '[{"word":"寸法","reading":"すんぽう","meaning_id":"dimensi"}]', '寸法を確認します。', 'すんぽうをかくにんします。', 'Memeriksa dimensi.', 3),

  -- kensetsu
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '建', 'ケン', 'た(てる)', 'けん', 'Membangun', '[{"word":"建設","reading":"けんせつ","meaning_id":"konstruksi"}]', 'ビルを建てます。', 'ビルをたてます。', 'Membangun gedung.', 9),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '設', 'セツ', 'もう(ける)', 'せつ', 'Mendirikan', '[{"word":"建設","reading":"けんせつ","meaning_id":"konstruksi"}]', '道路を建設します。', 'どうろをけんせつします。', 'Membangun jalan.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '足', 'ソク', 'あし', 'そく', 'Kaki/perancah', '[{"word":"足場","reading":"あしば","meaning_id":"perancah"}]', '足場を組みます。', 'あしばをくみます。', 'Memasang perancah.', 7),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '鉄', 'テツ', '', 'てつ', 'Besi', '[{"word":"鉄筋","reading":"てっきん","meaning_id":"besi tulangan"}]', '鉄筋を運びます。', 'てっきんをはこびます。', 'Membawa besi tulangan.', 13),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '現', 'ゲン', '', 'げん', 'Lokasi/kini', '[{"word":"現場","reading":"げんば","meaning_id":"lokasi proyek"}]', '現場で作業します。', 'げんばでさぎょうします。', 'Bekerja di lokasi proyek.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '重', 'ジュウ', 'おも(い)', 'じゅう', 'Berat', '[{"word":"重機","reading":"じゅうき","meaning_id":"alat berat"}]', '重機を運転します。', 'じゅうきをうんてんします。', 'Mengoperasikan alat berat.', 9),

  -- zousen
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '船', 'セン', 'ふね', 'せん', 'Kapal', '[{"word":"船体","reading":"せんたい","meaning_id":"badan kapal"}]', '船体を点検します。', 'せんたいをてんけんします。', 'Memeriksa badan kapal.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '造', 'ゾウ', 'つく(る)', 'ぞう', 'Membangun', '[{"word":"造船","reading":"ぞうせん","meaning_id":"perkapalan"}]', '造船所で働きます。', 'ぞうせんじょではたらきます。', 'Bekerja di galangan kapal.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '鋼', 'コウ', 'はがね', 'こう', 'Baja', '[{"word":"鋼材","reading":"こうざい","meaning_id":"material baja"}]', '鋼材を溶接します。', 'こうざいをようせつします。', 'Mengelas material baja.', 16),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '溶', 'ヨウ', 'と(ける)', 'よう', 'Melebur/las', '[{"word":"溶接","reading":"ようせつ","meaning_id":"pengelasan"}]', '溶接の練習をします。', 'ようせつのれんしゅうをします。', 'Berlatih pengelasan.', 13),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '塗', 'ト', 'ぬ(る)', 'と', 'Mengecat/melapisi', '[{"word":"塗装","reading":"とそう","meaning_id":"pengecatan"}]', '船体に塗装します。', 'せんたいにとそうします。', 'Mengecat badan kapal.', 13),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '装', 'ソウ', '', 'そう', 'Perlengkapan/pasang', '[{"word":"艤装","reading":"ぎそう","meaning_id":"instalasi perlengkapan"}]', '艤装工事をします。', 'ぎそうこうじをします。', 'Mengerjakan instalasi perlengkapan.', 12),

  -- jidousha-seibi
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '整', 'セイ', 'ととの(える)', 'せい', 'Merawat/merapikan', '[{"word":"整備","reading":"せいび","meaning_id":"perawatan"}]', '車を整備します。', 'くるまをせいびします。', 'Merawat mobil.', 16),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '備', 'ビ', 'そな(える)', 'び', 'Melengkapi/siap', '[{"word":"整備","reading":"せいび","meaning_id":"perawatan"}]', '整備の準備をします。', 'せいびのじゅんびをします。', 'Bersiap untuk servis.', 12),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '検', 'ケン', '', 'けん', 'Memeriksa', '[{"word":"点検","reading":"てんけん","meaning_id":"inspeksi"}]', '毎日点検をします。', 'まいにちてんけんをします。', 'Melakukan inspeksi setiap hari.', 12),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '故', 'コ', 'ゆえ', 'こ', 'Sebab/rusak', '[{"word":"故障","reading":"こしょう","meaning_id":"kerusakan"}]', 'エンジンが故障しました。', 'エンジンがこしょうしました。', 'Mesin rusak.', 9),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '障', 'ショウ', '', 'しょう', 'Gangguan/rintangan', '[{"word":"故障","reading":"こしょう","meaning_id":"kerusakan"}]', '故障の原因を調べます。', 'こしょうのげんいんをしらべます。', 'Menyelidiki penyebab kerusakan.', 13),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '換', 'カン', 'か(える)', 'かん', 'Mengganti', '[{"word":"交換","reading":"こうかん","meaning_id":"penggantian"}]', 'オイルを交換します。', 'オイルをこうかんします。', 'Mengganti oli.', 12),

  -- koukuu
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '空', 'クウ', 'そら', 'くう', 'Langit/udara', '[{"word":"航空","reading":"こうくう","meaning_id":"penerbangan"}]', '航空会社で働きます。', 'こうくうがいしゃではたらきます。', 'Bekerja di perusahaan penerbangan.', 8),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '航', 'コウ', '', 'こう', 'Berlayar/terbang', '[{"word":"航空","reading":"こうくう","meaning_id":"penerbangan"}]', '飛行機が航行します。', 'ひこうきがこうこうします。', 'Pesawat sedang mengudara.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '荷', 'カ', 'に', 'か', 'Muatan/barang', '[{"word":"手荷物","reading":"てにもつ","meaning_id":"bagasi"}]', '手荷物を預けます。', 'てにもつをあずけます。', 'Menitipkan bagasi.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '搭', 'トウ', '', 'とう', 'Naik (kendaraan)', '[{"word":"搭乗","reading":"とうじょう","meaning_id":"boarding"}]', '搭乗手続きをします。', 'とうじょうてつづきをします。', 'Melakukan prosedur boarding.', 12),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '貨', 'カ', '', 'か', 'Barang dagangan', '[{"word":"貨物","reading":"かもつ","meaning_id":"kargo"}]', '貨物を積みます。', 'かもつをつみます。', 'Memuat kargo.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '誘', 'ユウ', 'さそ(う)', 'ゆう', 'Memandu/mengajak', '[{"word":"誘導","reading":"ゆうどう","meaning_id":"pemanduan"}]', '飛行機を誘導します。', 'ひこうきをゆうどうします。', 'Memandu pesawat.', 14),

  -- shukuhaku
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '宿', 'シュク', 'やど', 'しゅく', 'Menginap/penginapan', '[{"word":"宿泊","reading":"しゅくはく","meaning_id":"akomodasi"}]', '宿泊施設で働きます。', 'しゅくはくしせつではたらきます。', 'Bekerja di fasilitas akomodasi.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '泊', 'ハク', 'と(まる)', 'はく', 'Bermalam', '[{"word":"宿泊","reading":"しゅくはく","meaning_id":"akomodasi"}]', 'ホテルに宿泊します。', 'ホテルにしゅくはくします。', 'Menginap di hotel.', 8),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '客', 'キャク', '', 'きゃく', 'Tamu', '[{"word":"接客","reading":"せっきゃく","meaning_id":"pelayanan tamu"}]', 'お客様を案内します。', 'おきゃくさまをあんないします。', 'Mengarahkan tamu.', 9),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '予', 'ヨ', '', 'よ', 'Sebelumnya/rencana', '[{"word":"予約","reading":"よやく","meaning_id":"reservasi"}]', '部屋を予約します。', 'へやをよやくします。', 'Memesan kamar.', 4),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '接', 'セツ', '', 'せつ', 'Menyambut/kontak', '[{"word":"接客","reading":"せっきゃく","meaning_id":"pelayanan tamu"}]', '丁寧に接客します。', 'ていねいにせっきゃくします。', 'Melayani tamu dengan sopan.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '案', 'アン', '', 'あん', 'Rencana/panduan', '[{"word":"案内","reading":"あんない","meaning_id":"panduan"}]', '客室を案内します。', 'きゃくしつをあんないします。', 'Mengarahkan ke kamar.', 10),

  -- unten
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '運', 'ウン', 'はこ(ぶ)', 'うん', 'Mengangkut/nasib', '[{"word":"運転","reading":"うんてん","meaning_id":"mengemudi"}]', 'バスを運転します。', 'バスをうんてんします。', 'Mengemudikan bus.', 12),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '転', 'テン', 'ころ(がる)', 'てん', 'Berputar/pindah', '[{"word":"運転","reading":"うんてん","meaning_id":"mengemudi"}]', '安全運転を心がけます。', 'あんぜんうんてんをこころがけます。', 'Mengutamakan mengemudi aman.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '客', 'キャク', '', 'きゃく', 'Penumpang/tamu', '[{"word":"乗客","reading":"じょうきゃく","meaning_id":"penumpang"}]', '乗客を安全に運びます。', 'じょうきゃくをあんぜんにはこびます。', 'Mengangkut penumpang dengan aman.', 9),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '免', 'メン', 'まぬか(れる)', 'めん', 'Izin/dibebaskan', '[{"word":"免許","reading":"めんきょ","meaning_id":"lisensi"}]', '運転免許を取得しました。', 'うんてんめんきょをしゅとくしました。', 'Memperoleh SIM.', 8),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '許', 'キョ', 'ゆる(す)', 'きょ', 'Mengizinkan', '[{"word":"免許","reading":"めんきょ","meaning_id":"lisensi"}]', '許可を得ます。', 'きょかをえます。', 'Mendapatkan izin.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '経', 'ケイ', '', 'けい', 'Melewati/rute', '[{"word":"経路","reading":"けいろ","meaning_id":"rute"}]', '経路を確認します。', 'けいろをかくにんします。', 'Memeriksa rute.', 11),

  -- tetsudou
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '鉄', 'テツ', '', 'てつ', 'Besi', '[{"word":"鉄道","reading":"てつどう","meaning_id":"kereta api"}]', '鉄道会社で働きます。', 'てつどうがいしゃではたらきます。', 'Bekerja di perusahaan kereta api.', 13),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '道', 'ドウ', 'みち', 'どう', 'Jalan', '[{"word":"鉄道","reading":"てつどう","meaning_id":"kereta api"}]', '鉄道の安全を守ります。', 'てつどうのあんぜんをまもります。', 'Menjaga keselamatan kereta api.', 12),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '駅', 'エキ', '', 'えき', 'Stasiun', '[{"word":"駅員","reading":"えきいん","meaning_id":"petugas stasiun"}]', '駅で案内をします。', 'えきであんないをします。', 'Memandu di stasiun.', 14),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '発', 'ハツ', '', 'はつ', 'Berangkat/muncul', '[{"word":"発車","reading":"はっしゃ","meaning_id":"keberangkatan"}]', '電車が発車します。', 'でんしゃがはっしゃします。', 'Kereta berangkat.', 9),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '改', 'カイ', 'あらた(める)', 'かい', 'Memperbaiki/memeriksa', '[{"word":"改札","reading":"かいさつ","meaning_id":"gerbang tiket"}]', '改札を通ります。', 'かいさつをとおります。', 'Melewati gerbang tiket.', 7),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '遅', 'チ', 'おく(れる)', 'ち', 'Terlambat', '[{"word":"遅延","reading":"ちえん","meaning_id":"keterlambatan"}]', '電車が遅延しています。', 'でんしゃがちえんしています。', 'Kereta mengalami keterlambatan.', 12),

  -- nougyou
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '農', 'ノウ', '', 'のう', 'Pertanian', '[{"word":"農業","reading":"のうぎょう","meaning_id":"pertanian"}]', '農業を学びます。', 'のうぎょうをまなびます。', 'Belajar pertanian.', 13),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '収', 'シュウ', 'おさ(める)', 'しゅう', 'Mengumpulkan/panen', '[{"word":"収穫","reading":"しゅうかく","meaning_id":"panen"}]', '野菜を収穫します。', 'やさいをしゅうかくします。', 'Memanen sayuran.', 4),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '穫', 'カク', '', 'かく', 'Memanen', '[{"word":"収穫","reading":"しゅうかく","meaning_id":"panen"}]', '収穫の季節です。', 'しゅうかくのきせつです。', 'Ini musim panen.', 18),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '肥', 'ヒ', 'こ(える)', 'ひ', 'Pupuk/gemuk', '[{"word":"施肥","reading":"せひ","meaning_id":"pemupukan"}]', '施肥を行います。', 'せひをおこないます。', 'Melakukan pemupukan.', 8),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '畑', '', 'はたけ', 'はたけ', 'Ladang', '[{"word":"畑","reading":"はたけ","meaning_id":"ladang"}]', '畑で働きます。', 'はたけではたらきます。', 'Bekerja di ladang.', 9),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '種', 'シュ', 'たね', 'しゅ', 'Benih/jenis', '[{"word":"種まき","reading":"たねまき","meaning_id":"penyemaian"}]', '種をまきます。', 'たねをまきます。', 'Menabur benih.', 14),

  -- gyogyou
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '漁', 'ギョ', '', 'ぎょ', 'Menangkap ikan', '[{"word":"漁業","reading":"ぎょぎょう","meaning_id":"perikanan"}]', '漁業で働いています。', 'ぎょぎょうではたらいています。', 'Bekerja di bidang perikanan.', 14),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '船', 'セン', 'ふね', 'せん', 'Kapal', '[{"word":"漁船","reading":"ぎょせん","meaning_id":"kapal ikan"}]', '漁船に乗ります。', 'ぎょせんにのります。', 'Naik kapal ikan.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '網', 'モウ', 'あみ', 'もう', 'Jaring', '[{"word":"網","reading":"あみ","meaning_id":"jaring"}]', '網を引き上げます。', 'あみをひきあげます。', 'Menarik jaring ke atas.', 14),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '養', 'ヨウ', 'やしな(う)', 'よう', 'Memelihara', '[{"word":"養殖","reading":"ようしょく","meaning_id":"budidaya"}]', '魚を養殖します。', 'さかなをようしょくします。', 'Membudidayakan ikan.', 15),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '殖', 'ショク', 'ふ(える)', 'しょく', 'Berkembang biak', '[{"word":"養殖","reading":"ようしょく","meaning_id":"budidaya"}]', '養殖場を見学します。', 'ようしょくじょうをけんがくします。', 'Mengunjungi lokasi budidaya.', 12),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '氷', 'ヒョウ', 'こおり', 'ひょう', 'Es', '[{"word":"氷詰め","reading":"こおりづめ","meaning_id":"pengemasan es"}]', '魚を氷詰めにします。', 'さかなをこおりづめにします。', 'Mengemas ikan dengan es.', 5),

  -- shokuhin
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '飲', 'イン', 'の(む)', 'いん', 'Minum', '[{"word":"飲食","reading":"いんしょく","meaning_id":"makan minum"}]', '飲食料品を作ります。', 'いんしょくりょうひんをつくります。', 'Membuat makanan dan minuman.', 12),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '衛', 'エイ', '', 'えい', 'Menjaga/higiene', '[{"word":"衛生","reading":"えいせい","meaning_id":"higiene"}]', '衛生管理を徹底します。', 'えいせいかんりをてっていします。', 'Menerapkan manajemen higiene dengan ketat.', 16),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '菌', 'キン', '', 'きん', 'Bakteri/kuman', '[{"word":"殺菌","reading":"さっきん","meaning_id":"sterilisasi"}]', '殺菌をしっかり行います。', 'さっきんをしっかりおこないます。', 'Melakukan sterilisasi dengan baik.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '包', 'ホウ', 'つつ(む)', 'ほう', 'Membungkus', '[{"word":"包装","reading":"ほうそう","meaning_id":"pengemasan"}]', '製品を包装します。', 'せいひんをほうそうします。', 'Mengemas produk.', 5),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '異', 'イ', 'こと(なる)', 'い', 'Berbeda/aneh', '[{"word":"異物","reading":"いぶつ","meaning_id":"benda asing"}]', '異物混入に注意します。', 'いぶつこんにゅうにちゅういします。', 'Waspada terhadap kontaminasi benda asing.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '凍', 'トウ', 'こお(る)', 'とう', 'Membeku', '[{"word":"冷凍","reading":"れいとう","meaning_id":"pembekuan"}]', '肉を冷凍します。', 'にくをれいとうします。', 'Membekukan daging.', 10),

  -- gaishoku
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '飲', 'イン', 'の(む)', 'いん', 'Minum', '[{"word":"飲食店","reading":"いんしょくてん","meaning_id":"restoran"}]', '飲食店で働きます。', 'いんしょくてんではたらきます。', 'Bekerja di restoran.', 12),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '調', 'チョウ', 'ととの(える)', 'ちょう', 'Menyiapkan/menyesuaikan', '[{"word":"調理","reading":"ちょうり","meaning_id":"memasak"}]', '料理を調理します。', 'りょうりをちょうりします。', 'Memasak hidangan.', 15),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '理', 'リ', '', 'り', 'Alasan/mengatur', '[{"word":"調理","reading":"ちょうり","meaning_id":"memasak"}]', '調理場で働きます。', 'ちょうりばではたらきます。', 'Bekerja di dapur.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '盛', 'セイ', 'も(る)', 'せい', 'Menata/mengisi', '[{"word":"盛り付け","reading":"もりつけ","meaning_id":"penataan hidangan"}]', '料理を盛り付けます。', 'りょうりをもりつけます。', 'Menata hidangan.', 11),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '注', 'チュウ', 'そそ(ぐ)', 'ちゅう', 'Menuang/memesan', '[{"word":"注文","reading":"ちゅうもん","meaning_id":"pesanan"}]', '注文を受けます。', 'ちゅうもんをうけます。', 'Menerima pesanan.', 8),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '席', 'セキ', '', 'せき', 'Tempat duduk', '[{"word":"席","reading":"せき","meaning_id":"kursi/meja"}]', 'お客様を席に案内します。', 'おきゃくさまをせきにあんないします。', 'Mengarahkan tamu ke tempat duduk.', 10)
ON CONFLICT (category_id, kanji) DO NOTHING;

-- ============================================================
-- SSW — Grammar (ssw_grammar), 14 bidang × 3 pola, contoh disesuaikan bidang
-- ============================================================
INSERT INTO ssw_grammar (category_id, pattern, meaning_id, explanation, structure, examples, notes) VALUES
  -- kaigo
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '～なければなりません', 'Harus ~ (kewajiban)', 'Menyatakan kewajiban atau keharusan melakukan sesuatu.', 'Kata kerja bentuk nai + ければなりません', '[{"jp":"利用者を優しく介助しなければなりません。","furigana":"りようしゃをやさしくかいじょしなければなりません。","id":"Harus membantu pengguna dengan lembut."}]', 'Bentuk formal, sering dipakai di tempat kerja.'),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '～ておく', 'Melakukan ~ terlebih dahulu (persiapan)', 'Menyatakan tindakan persiapan untuk hal yang akan terjadi kemudian.', 'Kata kerja bentuk te + おく', '[{"jp":"食事の前に手を洗っておきます。","furigana":"しょくじのまえにてをあらっておきます。","id":"Mencuci tangan terlebih dahulu sebelum makan."}]', 'Sangat umum dalam instruksi kerja perawatan.'),
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '～ようにする', 'Berusaha untuk ~ / mengusahakan agar ~', 'Menyatakan usaha sadar untuk membiasakan atau mencapai sesuatu.', 'Kata kerja bentuk kamus/nai + ようにする', '[{"jp":"毎回声をかけるようにしています。","furigana":"まいかいこえをかけるようにしています。","id":"Berusaha selalu menyapa setiap kali."}]', 'Menunjukkan kebiasaan yang diusahakan, bukan otomatis.'),

  -- building-clean
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '～てください', 'Tolong lakukan ~', 'Permintaan sopan untuk melakukan sesuatu.', 'Kata kerja bentuk te + ください', '[{"jp":"床を掃いてください。","furigana":"ゆかをはいてください。","id":"Tolong sapu lantainya."}]', 'Instruksi dasar paling sering didengar di lokasi kerja.'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '～てはいけません', 'Tidak boleh ~', 'Menyatakan larangan.', 'Kata kerja bentuk te + はいけません', '[{"jp":"洗剤を混ぜてはいけません。","furigana":"せんざいをまぜてはいけません。","id":"Tidak boleh mencampur deterjen."}]', 'Penting untuk aturan keselamatan kerja.'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '～前に', 'Sebelum ~', 'Menyatakan urutan waktu — dilakukan sebelum hal lain.', 'Kata kerja bentuk kamus + 前に', '[{"jp":"作業する前に手袋をはめます。","furigana":"さぎょうするまえにてぶくろをはめます。","id":"Memakai sarung tangan sebelum bekerja."}]', 'Umum dalam prosedur keselamatan.'),

  -- manufaktur
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '～ことになっている', 'Ditetapkan/diatur untuk ~', 'Menyatakan aturan atau kebiasaan yang sudah ditetapkan.', 'Kata kerja bentuk kamus + ことになっている', '[{"jp":"検品は二人で行うことになっています。","furigana":"けんぴんはふたりでおこなうことになっています。","id":"Pemeriksaan kualitas ditetapkan dilakukan oleh dua orang."}]', 'Sering muncul di SOP pabrik.'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '～場合は', 'Dalam hal ~ / jika terjadi ~', 'Menyatakan kondisi tertentu dan tindakan yang harus diambil.', 'Kata kerja/kata sifat kamus + 場合は', '[{"jp":"不良品を見つけた場合は、すぐに報告してください。","furigana":"ふりょうひんをみつけたばあいは、すぐにほうこくしてください。","id":"Jika menemukan barang cacat, segera laporkan."}]', 'Umum dalam instruksi penanganan masalah.'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '～ように', 'Agar ~ / supaya ~', 'Menyatakan tujuan dari suatu tindakan.', 'Kata kerja bentuk kamus/nai + ように', '[{"jp":"傷がつかないように注意します。","furigana":"きずがつかないようにちゅういします。","id":"Berhati-hati agar tidak tergores."}]', 'Sering dipakai untuk instruksi kehati-hatian.'),

  -- kensetsu
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '～ないでください', 'Tolong jangan ~', 'Larangan sopan.', 'Kata kerja bentuk nai + でください', '[{"jp":"重機に近づかないでください。","furigana":"じゅうきにちかづかないでください。","id":"Tolong jangan mendekati alat berat."}]', 'Sangat penting di lokasi proyek konstruksi.'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '～たら', 'Kalau/jika sudah ~', 'Menyatakan syarat atau urutan kejadian.', 'Kata kerja bentuk ta + ら', '[{"jp":"型枠ができたら、コンクリートを流します。","furigana":"かたわくができたら、コンクリートをながします。","id":"Kalau bekisting sudah jadi, tuang beton."}]', 'Umum dalam urutan tahapan pekerjaan.'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '～必要があります', 'Perlu untuk ~', 'Menyatakan keperluan/kebutuhan melakukan sesuatu.', 'Kata kerja bentuk kamus + 必要があります', '[{"jp":"作業前にヘルメットを着用する必要があります。","furigana":"さぎょうまえにヘルメットをちゃくようするひつようがあります。","id":"Perlu memakai helm sebelum bekerja."}]', 'Formal, dipakai dalam aturan keselamatan.'),

  -- zousen
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '～際に', 'Pada saat ~', 'Menyatakan waktu terjadinya suatu tindakan, lebih formal dari とき.', 'Kata kerja bentuk kamus/ta + 際に', '[{"jp":"溶接をする際に、保護メガネを使います。","furigana":"ようせつをするさいに、ほごメガネをつかいます。","id":"Saat mengelas, memakai kacamata pelindung."}]', 'Formal, sering di manual kerja teknis.'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '～ておりません', 'Belum ~ (bentuk sopan)', 'Bentuk sopan dari ていません, menyatakan belum selesai.', 'Kata kerja bentuk te + おりません', '[{"jp":"塗装がまだ終わっておりません。","furigana":"とそうがまだおわっておりません。","id":"Pengecatan belum selesai."}]', 'Dipakai saat lapor ke atasan/klien.'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '～次第', 'Segera setelah ~', 'Menyatakan tindakan dilakukan segera setelah kondisi terpenuhi.', 'Kata kerja bentuk masu (stem) + 次第', '[{"jp":"作業が終わり次第、報告します。","furigana":"さぎょうがおわりしだい、ほうこくします。","id":"Segera setelah pekerjaan selesai, akan melapor."}]', 'Formal, umum di laporan kerja.'),

  -- jidousha-seibi
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '～かどうか', 'Apakah ~ atau tidak', 'Menyatakan ketidakpastian, biasa dipakai dengan kata kerja memeriksa.', 'Kata kerja bentuk kamus + かどうか', '[{"jp":"ブレーキが正常かどうか確認します。","furigana":"ブレーキがせいじょうかどうかかくにんします。","id":"Memeriksa apakah rem normal atau tidak."}]', 'Sering dalam konteks inspeksi/diagnosis.'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '～たばかり', 'Baru saja ~', 'Menyatakan sesuatu baru saja selesai dilakukan.', 'Kata kerja bentuk ta + ばかり', '[{"jp":"オイルを交換したばかりです。","furigana":"オイルをこうかんしたばかりです。","id":"Baru saja mengganti oli."}]', 'Menekankan kebaruan waktu.'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '～はずです', 'Seharusnya ~', 'Menyatakan dugaan berdasarkan logika/informasi yang dimiliki.', 'Kata kerja/kata sifat bentuk kamus + はずです', '[{"jp":"新しい部品なので、正常に動くはずです。","furigana":"あたらしいぶひんなので、せいじょうにうごくはずです。","id":"Karena komponen baru, seharusnya berfungsi normal."}]', 'Dipakai saat mendiagnosis kerusakan.'),

  -- koukuu
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '～までに', 'Sebelum batas waktu ~', 'Menyatakan tenggat waktu suatu tindakan harus selesai.', 'Kata benda waktu/kata kerja kamus + までに', '[{"jp":"出発時刻までに搭乗を終えてください。","furigana":"しゅっぱつじこくまでにとうじょうをおえてください。","id":"Tolong selesaikan boarding sebelum waktu keberangkatan."}]', 'Penting dalam operasional bandara yang ketat waktu.'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '～ことがあります', 'Terkadang ~ / ada kalanya ~', 'Menyatakan kemungkinan yang kadang terjadi.', 'Kata kerja bentuk kamus/nai + ことがあります', '[{"jp":"天候により、フライトが遅れることがあります。","furigana":"てんこうにより、フライトがおくれることがあります。","id":"Terkadang penerbangan tertunda karena cuaca."}]', 'Umum dalam pengumuman ke penumpang.'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '～通りに', 'Sesuai dengan ~', 'Menyatakan tindakan dilakukan sesuai aturan/instruksi.', 'Kata benda + の通りに / kata kerja bentuk kamus + 通りに', '[{"jp":"マニュアル通りに手荷物を扱います。","furigana":"マニュアルどおりにてにもつをあつかいます。","id":"Menangani bagasi sesuai manual."}]', 'Dipakai untuk menekankan kepatuhan prosedur.'),

  -- shukuhaku
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '～させていただきます', 'Izinkan saya melakukan ~ (sangat sopan)', 'Bentuk kausatif + sopan, dipakai staf saat melayani tamu.', 'Kata kerja bentuk causative + いただきます', '[{"jp":"お荷物をお部屋まで運ばせていただきます。","furigana":"おにもつをおへやまではこばせていただきます。","id":"Izinkan saya membawakan barang Anda ke kamar."}]', 'Bahasa keigo, wajib di industri perhotelan.'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '～でございます', 'Adalah ~ (sangat sopan)', 'Bentuk sopan dari です, dipakai staf pelayanan.', 'Kata benda + でございます', '[{"jp":"チェックインは15時からでございます。","furigana":"チェックインは15じからでございます。","id":"Check-in dimulai pukul 15:00."}]', 'Keigo standar hotel/resepsionis.'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), '～かしこまりました', 'Baik, saya mengerti (sangat sopan)', 'Ungkapan menerima permintaan tamu secara formal.', 'Ungkapan tetap (tidak berkonjugasi)', '[{"jp":"かしこまりました。すぐにご用意いたします。","furigana":"かしこまりました。すぐにごよういいたします。","id":"Baik. Akan segera saya siapkan."}]', 'Ungkapan wajib dihafal untuk pelayanan tamu.'),

  -- unten
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '～際は', 'Pada saat ~ (formal)', 'Menyatakan situasi tertentu dan tindakan yang menyertainya.', 'Kata kerja bentuk kamus/ta + 際は', '[{"jp":"乗車の際は、シートベルトを締めてください。","furigana":"じょうしゃのさいは、シートベルトをしめてください。","id":"Saat naik kendaraan, tolong kenakan sabuk pengaman."}]', 'Formal, dipakai dalam pengumuman ke penumpang.'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '～おそれがあります', 'Ada risiko/kemungkinan ~ (negatif)', 'Menyatakan kemungkinan terjadinya hal buruk.', 'Kata kerja bentuk kamus + おそれがあります', '[{"jp":"スピードを出しすぎると事故のおそれがあります。","furigana":"スピードをだしすぎるとじこのおそれがあります。","id":"Kalau terlalu kencang ada risiko kecelakaan."}]', 'Dipakai dalam peringatan keselamatan.'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '～ようにしています', 'Berusaha untuk selalu ~', 'Menyatakan kebiasaan yang diusahakan secara sadar.', 'Kata kerja bentuk kamus/nai + ようにしています', '[{"jp":"毎回、車両点検をするようにしています。","furigana":"まいかい、しゃりょうてんけんをするようにしています。","id":"Selalu berusaha melakukan pemeriksaan kendaraan setiap kali."}]', 'Menunjukkan disiplin kerja.'),

  -- tetsudou
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '～次第です', 'Beginilah situasinya / karena itulah ~', 'Menjelaskan alasan/latar belakang secara formal.', 'Kalimat + という次第です', '[{"jp":"大雨のため、遅延が発生した次第です。","furigana":"おおあめのため、ちえんがはっせいしたしだいです。","id":"Karena hujan lebat, itulah sebabnya terjadi keterlambatan."}]', 'Formal, sering di pengumuman resmi.'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '～ご利用ください', 'Silakan gunakan ~ (sopan)', 'Ajakan sopan untuk menggunakan sesuatu.', 'Kata benda + をご利用ください', '[{"jp":"券売機をご利用ください。","furigana":"けんばいきをごりようください。","id":"Silakan gunakan mesin tiket otomatis."}]', 'Umum dalam pengumuman stasiun.'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '～恐れがあります', 'Ada kemungkinan/risiko ~', 'Menyatakan potensi bahaya atau masalah.', 'Kata kerja bentuk kamus + 恐れがあります', '[{"jp":"踏切内に立ち入ると危険な恐れがあります。","furigana":"ふみきりないにたちいるときけんなおそれがあります。","id":"Masuk ke area perlintasan berisiko bahaya."}]', 'Umum di rambu keselamatan stasiun.'),

  -- nougyou
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '～季節になると', 'Ketika musim ~ tiba', 'Menyatakan perubahan situasi seiring datangnya musim tertentu.', 'Kata benda musim + になると', '[{"jp":"収穫の季節になると忙しくなります。","furigana":"しゅうかくのきせつになるといそがしくなります。","id":"Ketika musim panen tiba, menjadi sibuk."}]', 'Umum dalam percakapan tentang siklus pertanian.'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '～ながら', 'Sambil ~', 'Menyatakan dua tindakan dilakukan bersamaan.', 'Kata kerja bentuk masu (stem) + ながら', '[{"jp":"天気を見ながら灌水の時間を決めます。","furigana":"てんきをみながらかんすいのじかんをきめます。","id":"Sambil melihat cuaca, menentukan waktu penyiraman."}]', 'Umum dalam kerja lapangan yang butuh pengamatan.'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '～ように気をつける', 'Berhati-hati agar ~', 'Menyatakan kehati-hatian terhadap suatu hal.', 'Kata kerja bentuk kamus/nai + ように気をつける', '[{"jp":"農薬がかからないように気をつけます。","furigana":"のうやくがかからないようにきをつけます。","id":"Berhati-hati agar tidak terkena pestisida."}]', 'Penting untuk keselamatan kerja pertanian.'),

  -- gyogyou
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '～前に', 'Sebelum ~', 'Menyatakan urutan waktu.', 'Kata kerja bentuk kamus + 前に', '[{"jp":"出港する前に天候を確認します。","furigana":"しゅっこうするまえにてんこうをかくにんします。","id":"Memeriksa cuaca sebelum berangkat berlayar."}]', 'Penting untuk keselamatan di laut.'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '～ように命じられる', 'Diperintahkan untuk ~', 'Bentuk pasif dari perintah, dipakai untuk instruksi dari atasan.', 'Kata kerja bentuk kamus + ように命じられる', '[{"jp":"船長に戻るように命じられました。","furigana":"せんちょうにもどるようにめいじられました。","id":"Diperintahkan kapten untuk kembali."}]', 'Formal, konteks hierarki di kapal.'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '～によって', 'Tergantung pada ~ / karena ~', 'Menyatakan sebab atau faktor yang mempengaruhi.', 'Kata benda + によって', '[{"jp":"天候によって漁に出られないことがあります。","furigana":"てんこうによってりょうにでられないことがあります。","id":"Tergantung cuaca, terkadang tidak bisa melaut."}]', 'Umum dalam konteks yang bergantung faktor alam.'),

  -- shokuhin
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '～てから', 'Setelah ~', 'Menyatakan urutan waktu, tindakan kedua dilakukan setelah yang pertama.', 'Kata kerja bentuk te + から', '[{"jp":"手を洗ってから作業を始めます。","furigana":"てをあらってからさぎょうをはじめます。","id":"Memulai pekerjaan setelah mencuci tangan."}]', 'Sangat umum dalam prosedur higiene pangan.'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '～ように義務づけられている', 'Diwajibkan untuk ~', 'Menyatakan kewajiban formal berdasarkan aturan.', 'Kata kerja bentuk kamus + ように義務づけられている', '[{"jp":"衛生管理を行うように義務づけられています。","furigana":"えいせいかんりをおこなうようにぎむづけられています。","id":"Diwajibkan melakukan manajemen higiene."}]', 'Formal, terkait regulasi keamanan pangan.'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '～おそれがある', 'Berisiko ~ (hal negatif)', 'Menyatakan kemungkinan risiko yang perlu diwaspadai.', 'Kata kerja bentuk kamus + おそれがある', '[{"jp":"異物が混入するおそれがあります。","furigana":"いぶつがこんにゅうするおそれがあります。","id":"Ada risiko tercampur benda asing."}]', 'Penting dalam kontrol kualitas makanan.'),

  -- gaishoku
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '～ましょうか', 'Bolehkah saya ~ / Mari saya ~ (menawarkan)', 'Menawarkan bantuan kepada pelanggan dengan sopan.', 'Kata kerja bentuk masu (stem) + ましょうか', '[{"jp":"お水をお持ちしましょうか。","furigana":"おみずをおもちしましょうか。","id":"Bolehkah saya membawakan air?"}]', 'Sangat umum dalam pelayanan restoran.'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '～でよろしいですか', 'Apakah ~ sudah sesuai? (konfirmasi sopan)', 'Mengonfirmasi pesanan/permintaan pelanggan.', 'Kata benda + でよろしいですか', '[{"jp":"ご注文はこちらでよろしいですか。","furigana":"ごちゅうもんはこちらでよろしいですか。","id":"Apakah pesanannya seperti ini?"}]', 'Wajib saat konfirmasi order di restoran.'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '～少々お待ちください', 'Mohon tunggu sebentar', 'Ungkapan sopan meminta pelanggan menunggu.', 'Ungkapan tetap', '[{"jp":"少々お待ちください。すぐにご用意いたします。","furigana":"しょうしょうおまちください。すぐにごよういいたします。","id":"Mohon tunggu sebentar. Akan segera saya siapkan."}]', 'Ungkapan standar layanan pelanggan.')
ON CONFLICT (category_id, pattern) DO NOTHING;

-- ============================================================
-- SSW — Listening (ssw_listening), 1 latihan × 14 bidang, @2 soal
-- ============================================================
INSERT INTO ssw_listening (category_id, title, audio_text, transcript, transcript_furigana, translation_id, questions) VALUES
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '朝の申し送り', '今日の担当は田中さんです。3号室の利用者は昨日から食欲がありません。体位変換は2時間ごとにお願いします。', '今日の担当は田中さんです。3号室の利用者は昨日から食欲がありません。体位変換は2時間ごとにお願いします。', 'きょうのたんとうはたなかさんです。3ごうしつのりようしゃはきのうからしょくよくがありません。たいいへんかんは2じかんごとにおねがいします。', 'Petugas hari ini adalah Tanaka. Pengguna kamar 3 sejak kemarin tidak nafsu makan. Tolong ubah posisi tubuh setiap 2 jam.', '[{"type":"choice","question":"3号室の利用者はどんな様子ですか。","choices":["元気です","食欲がありません","もう退院しました","熱があります"],"correct":1,"explanation":"「食欲がありません」＝tidak nafsu makan."},{"type":"choice","question":"体位変換はどのくらいの間隔で行いますか。","choices":["1時間ごと","2時間ごと","3時間ごと","4時間ごと"],"correct":1,"explanation":"「2時間ごとにお願いします」から2時間おき。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), '清掃作業の指示', '今日は3階のトイレと廊下を清掃してください。ワックスがけは午後からお願いします。洗剤は中性のものを使ってください。', '今日は3階のトイレと廊下を清掃してください。ワックスがけは午後からお願いします。洗剤は中性のものを使ってください。', 'きょうは3かいのトイレとろうかをせいそうしてください。ワックスがけはごごからおねがいします。せんざいはちゅうせいのものをつかってください。', 'Hari ini tolong bersihkan toilet dan koridor lantai 3. Pelapisan wax mohon dimulai sore hari. Gunakan deterjen netral.', '[{"type":"choice","question":"ワックスがけはいつからしますか。","choices":["朝から","午後から","夜から","明日から"],"correct":1,"explanation":"「午後からお願いします」＝mulai sore/siang hari."},{"type":"tf","question":"洗剤はアルカリ性のものを使う。","correct":false,"explanation":"「中性のものを使ってください」＝deterjen netral, bukan alkali."}]'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '検品ラインの説明', 'これから検品の説明をします。傷や汚れがある製品は不良品として分けてください。不良品を見つけたら、すぐに班長に報告してください。', 'これから検品の説明をします。傷や汚れがある製品は不良品として分けてください。不良品を見つけたら、すぐに班長に報告してください。', 'これからけんぴんのせつめいをします。きずやよごれがあるせいひんはふりょうひんとしてわけてください。ふりょうひんをみつけたら、すぐにはんちょうにほうこくしてください。', 'Mulai sekarang penjelasan pemeriksaan kualitas. Produk yang tergores atau kotor dipisahkan sebagai barang cacat. Jika menemukan barang cacat, segera lapor ke ketua regu.', '[{"type":"choice","question":"不良品を見つけたら、誰に報告しますか。","choices":["社長","班長","お客様","警察"],"correct":1,"explanation":"「班長に報告してください」＝lapor ke ketua regu."},{"type":"tf","question":"傷がある製品はそのまま出荷する。","correct":false,"explanation":"傷や汚れがある製品は不良品として分ける、出荷しない。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '現場の朝礼', 'おはようございます。今日は雨が降る予定なので、足場での作業は中止します。ヘルメットと安全帯の着用を忘れないでください。', 'おはようございます。今日は雨が降る予定なので、足場での作業は中止します。ヘルメットと安全帯の着用を忘れないでください。', 'おはようございます。きょうはあめがふるよていなので、あしばでのさぎょうはちゅうしします。ヘルメットとあんぜんたいのちゃくようをわすれないでください。', 'Selamat pagi. Hari ini rencananya hujan, jadi pekerjaan di perancah dihentikan. Jangan lupa memakai helm dan sabuk pengaman.', '[{"type":"choice","question":"今日、足場での作業はどうなりますか。","choices":["予定通り行う","中止する","午後だけ行う","延期する"],"correct":1,"explanation":"「作業は中止します」＝dihentikan."},{"type":"choice","question":"何を着用するように言われていますか。","choices":["マスクと手袋","ヘルメットと安全帯","長靴と眼鏡","制服とネクタイ"],"correct":1,"explanation":"「ヘルメットと安全帯の着用」が指示内容。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '溶接作業の注意', '溶接作業の前に、保護メガネと手袋を必ず着用してください。作業が終わったら、鋼材の周りを片付けてください。', '溶接作業の前に、保護メガネと手袋を必ず着用してください。作業が終わったら、鋼材の周りを片付けてください。', 'ようせつさぎょうのまえに、ほごメガネとてぶくろをかならずちゃくようしてください。さぎょうがおわったら、こうざいのまわりをかたづけてください。', 'Sebelum pengelasan, wajib memakai kacamata pelindung dan sarung tangan. Setelah selesai bekerja, rapikan area sekitar material baja.', '[{"type":"choice","question":"溶接作業の前に何を着用しますか。","choices":["制服だけ","保護メガネと手袋","帽子のみ","長靴だけ"],"correct":1,"explanation":"「保護メガネと手袋を必ず着用」が正解。"},{"type":"tf","question":"作業後は片付けをしなくてよい。","correct":false,"explanation":"「鋼材の周りを片付けてください」＝harus dirapikan."}]'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '整備工場での会話', 'このお車はオイル交換とブレーキの点検が必要です。ブレーキパッドはかなり減っていますので、交換をおすすめします。', 'このお車はオイル交換とブレーキの点検が必要です。ブレーキパッドはかなり減っていますので、交換をおすすめします。', 'このおくるまはオイルこうかんとブレーキのてんけんがひつようです。ブレーキパッドはかなりへっていますので、こうかんをおすすめします。', 'Mobil ini perlu ganti oli dan pemeriksaan rem. Kampas rem sudah cukup tipis, jadi disarankan diganti.', '[{"type":"choice","question":"何を交換した方がいいと言っていますか。","choices":["タイヤ","ブレーキパッド","バッテリー","エンジン"],"correct":1,"explanation":"「ブレーキパッドは...交換をおすすめします」が正解。"},{"type":"tf","question":"ブレーキパッドはまだ新しい。","correct":false,"explanation":"「かなり減っています」＝sudah tipis, bukan baru."}]'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '搭乗案内のアナウンス', 'まもなく搭乗を開始いたします。手荷物は指定の場所に置いてください。搭乗券とパスポートをご用意ください。', 'まもなく搭乗を開始いたします。手荷物は指定の場所に置いてください。搭乗券とパスポートをご用意ください。', 'まもなくとうじょうをかいしいたします。てにもつはしていのばしょにおいてください。とうじょうけんとパスポートをごよういください。', 'Sebentar lagi boarding akan dimulai. Letakkan bagasi di tempat yang ditentukan. Siapkan boarding pass dan paspor.', '[{"type":"choice","question":"乗客は何を用意しますか。","choices":["食べ物","搭乗券とパスポート","傘","現金だけ"],"correct":1,"explanation":"「搭乗券とパスポートをご用意ください」が正解。"},{"type":"tf","question":"手荷物はどこに置いてもよい。","correct":false,"explanation":"「指定の場所に置いてください」＝tempat yang ditentukan."}]'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), 'チェックインの会話', 'いらっしゃいませ。ご予約のお名前をお伺いしてもよろしいでしょうか。お部屋の準備ができましたので、ご案内いたします。', 'いらっしゃいませ。ご予約のお名前をお伺いしてもよろしいでしょうか。お部屋の準備ができましたので、ご案内いたします。', 'いらっしゃいませ。ごよやくのおなまえをおうかがいしてもよろしいでしょうか。おへやのじゅんびができましたので、ごあんないいたします。', 'Selamat datang. Bolehkah saya menanyakan nama reservasi Anda? Kamar sudah siap, akan saya antar.', '[{"type":"choice","question":"スタッフは最初に何を尋ねますか。","choices":["お荷物の数","予約の名前","支払い方法","滞在日数"],"correct":1,"explanation":"「ご予約のお名前をお伺いして」が正解。"},{"type":"tf","question":"部屋はまだ準備できていない。","correct":false,"explanation":"「お部屋の準備ができました」＝sudah siap."}]'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '出発前の点呼', 'これから点呼を始めます。免許証を確認しますので、見せてください。今日のルートは工事のため変更になります。', 'これから点呼を始めます。免許証を確認しますので、見せてください。今日のルートは工事のため変更になります。', 'これからてんこをはじめます。めんきょしょうをかくにんしますので、みせてください。きょうのルートはこうじのためへんこうになります。', 'Mulai sekarang absensi dimulai. Akan memeriksa SIM, tolong tunjukkan. Rute hari ini berubah karena ada perbaikan jalan.', '[{"type":"choice","question":"なぜ今日のルートが変わりますか。","choices":["雨だから","工事のため","事故のため","渋滞のため"],"correct":1,"explanation":"「工事のため変更」が正解。"},{"type":"tf","question":"免許証を見せる必要はない。","correct":false,"explanation":"「免許証を確認しますので、見せてください」＝perlu ditunjukkan."}]'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '駅員からのお知らせ', '大雨の影響で、電車に遅延が発生しています。ホームでは黄色い線の内側でお待ちください。ご迷惑をおかけして申し訳ございません。', '大雨の影響で、電車に遅延が発生しています。ホームでは黄色い線の内側でお待ちください。ご迷惑をおかけして申し訳ございません。', 'おおあめのえいきょうで、でんしゃにちえんがはっせいしています。ホームではきいろいせんのうちがわでおまちください。ごめいわくをおかけしてもうしわけございません。', 'Akibat hujan lebat, terjadi keterlambatan kereta. Mohon menunggu di dalam garis kuning di peron. Mohon maaf atas ketidaknyamanannya.', '[{"type":"choice","question":"なぜ電車が遅延していますか。","choices":["事故","大雨","停電","混雑"],"correct":1,"explanation":"「大雨の影響で」が正解。"},{"type":"choice","question":"ホームではどこで待ちますか。","choices":["線路のそば","黄色い線の内側","階段の上","改札の外"],"correct":1,"explanation":"「黄色い線の内側でお待ちください」が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '農場での指示', '今日はトマトの収穫をお願いします。赤くなったものだけ取ってください。収穫したら、すぐに日陰に置いてください。', '今日はトマトの収穫をお願いします。赤くなったものだけ取ってください。収穫したら、すぐに日陰に置いてください。', 'きょうはトマトのしゅうかくをおねがいします。あかくなったものだけとってください。しゅうかくしたら、すぐにひかげにおいてください。', 'Hari ini tolong panen tomat. Ambil hanya yang sudah merah. Setelah dipanen, segera letakkan di tempat teduh.', '[{"type":"choice","question":"どんなトマトを収穫しますか。","choices":["緑色のもの","赤くなったもの","全部","小さいもの"],"correct":1,"explanation":"「赤くなったものだけ取ってください」が正解。"},{"type":"tf","question":"収穫後は日なたに置く。","correct":false,"explanation":"「すぐに日陰に置いてください」＝tempat teduh, bukan terkena matahari."}]'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '出港前の確認', '今日は波が高いので、天候をよく確認してください。救命胴衣を必ず着用してから出港します。', '今日は波が高いので、天候をよく確認してください。救命胴衣を必ず着用してから出港します。', 'きょうはなみがたかいので、てんこうをよくかくにんしてください。きゅうめいどういをかならずちゃくようしてからしゅっこうします。', 'Hari ini ombak tinggi, jadi periksa baik-baik cuacanya. Wajib memakai jaket pelampung sebelum berangkat berlayar.', '[{"type":"choice","question":"今日の海の様子はどうですか。","choices":["波が穏やか","波が高い","風がない","霧が濃い"],"correct":1,"explanation":"「波が高いので」が正解。"},{"type":"tf","question":"救命胴衣は着用しなくてもよい。","correct":false,"explanation":"「必ず着用してから出港」＝wajib dipakai."}]'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '工場での衛生指導', '作業前には必ず手を洗って消毒してください。アクセサリーは外し、マスクと帽子を着用してください。', '作業前には必ず手を洗って消毒してください。アクセサリーは外し、マスクと帽子を着用してください。', 'さぎょうまえにはかならずてをあらってしょうどくしてください。アクセサリーははずし、マスクとぼうしをちゃくようしてください。', 'Sebelum bekerja wajib cuci tangan dan disinfeksi. Lepaskan aksesoris, pakai masker dan topi.', '[{"type":"choice","question":"作業前に何をしますか。","choices":["食事をする","手を洗って消毒する","休憩する","電話をする"],"correct":1,"explanation":"「手を洗って消毒してください」が正解。"},{"type":"tf","question":"アクセサリーはつけたままでよい。","correct":false,"explanation":"「アクセサリーは外し」＝harus dilepas."}]'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), '注文を受ける場面', 'いらっしゃいませ。ご注文はお決まりでしょうか。こちらのセットは大変人気がございます。少々お待ちください。', 'いらっしゃいませ。ご注文はお決まりでしょうか。こちらのセットは大変人気がございます。少々お待ちください。', 'いらっしゃいませ。ごちゅうもんはおきまりでしょうか。こちらのセットはたいへんにんきがございます。しょうしょうおまちください。', 'Selamat datang. Apakah pesanannya sudah ditentukan? Paket ini sangat populer. Mohon tunggu sebentar.', '[{"type":"choice","question":"スタッフは何について尋ねていますか。","choices":["支払い方法","注文が決まったか","席の希望","滞在時間"],"correct":1,"explanation":"「ご注文はお決まりでしょうか」が正解。"},{"type":"tf","question":"このセットはあまり人気がない。","correct":false,"explanation":"「大変人気がございます」＝sangat populer."}]')
ON CONFLICT (category_id, title) DO NOTHING;

-- ============================================================
-- SSW — Reading (ssw_reading), 1 bacaan × 14 bidang, @2 soal
-- ============================================================
INSERT INTO ssw_reading (category_id, title, text, furigana_text, translation_id, vocab, questions) VALUES
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), '介護の仕事について', '介護の仕事は、高齢者の日常生活をサポートする仕事です。食事や入浴、排泄の介助のほか、利用者と会話をして心のケアも行います。利用者一人一人の状態に合わせて、丁寧に対応することが大切です。', 'かいごのしごとは、こうれいしゃのにちじょうせいかつをサポートするしごとです。しょくじやにゅうよく、はいせつのかいじょのほか、りようしゃとかいわをしてこころのケアもおこないます。りようしゃひとりひとりのじょうたいにあわせて、ていねいにたいおうすることがたいせつです。', 'Pekerjaan perawatan lansia adalah pekerjaan mendukung kehidupan sehari-hari lansia. Selain bantuan makan, mandi, dan buang air, juga melakukan perawatan hati dengan berbincang dengan pengguna. Penting untuk menangani sesuai kondisi masing-masing pengguna dengan teliti.', '[{"term":"高齢者","reading":"こうれいしゃ","meaning_id":"lansia"},{"term":"心のケア","reading":"こころのケア","meaning_id":"perawatan hati/emosional"}]', '[{"type":"choice","question":"介護の仕事の内容ではないものはどれですか。","choices":["食事の介助","入浴の介助","給料の計算","会話をする"],"correct":2,"explanation":"給料の計算は本文に書かれていない。"},{"type":"tf","question":"利用者全員に同じ対応をすればよい。","correct":false,"explanation":"「一人一人の状態に合わせて」対応する、が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), 'ビルクリーニングの一日', 'ビルクリーニングの仕事は、朝早くから始まります。まずロビーと廊下を清掃し、その後トイレの清掃を行います。午後は床のワックスがけや窓ガラスの清掃をします。安全のため、必ず安全靴を履いて作業します。', 'ビルクリーニングのしごとは、あさはやくからはじまります。まずロビーとろうかをせいそうし、そのごトイレのせいそうをおこないます。ごごはゆかのワックスがけやまどガラスのせいそうをします。あんぜんのため、かならずあんぜんぐつをはいてさぎょうします。', 'Pekerjaan pembersihan gedung dimulai dari pagi hari. Pertama membersihkan lobi dan koridor, kemudian membersihkan toilet. Siang hari melapisi wax lantai dan membersihkan kaca jendela. Demi keselamatan, selalu memakai sepatu safety saat bekerja.', '[{"term":"ロビー","reading":"ロビー","meaning_id":"lobi"},{"term":"窓ガラス","reading":"まどガラス","meaning_id":"kaca jendela"}]', '[{"type":"choice","question":"午後にする作業はどれですか。","choices":["ロビーの清掃","トイレの清掃","床のワックスがけ","朝礼"],"correct":2,"explanation":"「午後は床のワックスがけ」が正解。"},{"type":"tf","question":"安全靴は履かなくてもよい。","correct":false,"explanation":"「必ず安全靴を履いて作業します」＝wajib dipakai."}]'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), '製品の検品について', '工場では、完成した製品を一つずつ検品します。傷や汚れ、寸法のずれがないかを確認し、問題があれば不良品として分けます。検品の記録は正確に残す必要があります。品質を守ることが会社の信頼につながります。', 'こうじょうでは、かんせいしたせいひんをひとつずつけんぴんします。きずやよごれ、すんぽうのずれがないかをかくにんし、もんだいがあればふりょうひんとしてわけます。けんぴんのきろくはせいかくにのこすひつようがあります。ひんしつをまもることがかいしゃのしんらいにつながります。', 'Di pabrik, produk jadi diperiksa satu per satu. Memeriksa apakah ada goresan, kotoran, atau penyimpangan ukuran, jika ada masalah dipisahkan sebagai barang cacat. Catatan pemeriksaan perlu disimpan dengan akurat. Menjaga kualitas berhubungan dengan kepercayaan perusahaan.', '[{"term":"寸法のずれ","reading":"すんぽうのずれ","meaning_id":"penyimpangan ukuran"},{"term":"信頼","reading":"しんらい","meaning_id":"kepercayaan"}]', '[{"type":"choice","question":"検品で確認しないことはどれですか。","choices":["傷","汚れ","寸法","給料"],"correct":3,"explanation":"給料は検品の内容に含まれない。"},{"type":"tf","question":"検品の記録は適当でよい。","correct":false,"explanation":"「正確に残す必要があります」が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), '建設現場の安全', '建設現場では、事故を防ぐために様々な安全対策があります。作業員は必ずヘルメットと安全帯を着用します。毎朝の朝礼で、その日の作業内容と注意点を確認します。重機の近くでは特に注意が必要です。', 'けんせつげんばでは、じこをふせぐためにさまざまなあんぜんたいさくがあります。さぎょういんはかならずヘルメットとあんぜんたいをちゃくようします。まいあさのちょうれいで、そのひのさぎょうないようとちゅういてんをかくにんします。じゅうきのちかくではとくにちゅういがひつようです。', 'Di lokasi konstruksi, ada berbagai tindakan keselamatan untuk mencegah kecelakaan. Pekerja wajib memakai helm dan sabuk pengaman. Setiap briefing pagi, memeriksa isi pekerjaan hari itu dan hal-hal yang perlu diperhatikan. Di sekitar alat berat perlu kehati-hatian khusus.', '[{"term":"安全対策","reading":"あんぜんたいさく","meaning_id":"tindakan keselamatan"},{"term":"作業員","reading":"さぎょういん","meaning_id":"pekerja"}]', '[{"type":"choice","question":"朝礼で何を確認しますか。","choices":["給料","作業内容と注意点","休憩時間","昼食のメニュー"],"correct":1,"explanation":"「作業内容と注意点を確認」が正解。"},{"type":"tf","question":"重機の近くは注意しなくてよい。","correct":false,"explanation":"「特に注意が必要」が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), '造船所での仕事', '造船所では、大きな船を組み立てる仕事をします。鋼材を切断し、溶接でつなぎ合わせて船体を作ります。その後、艤装工事で配管や電気設備を取り付けます。最後に塗装をして完成です。', 'ぞうせんじょでは、おおきなふねをくみたてるしごとをします。こうざいをせつだんし、ようせつでつなぎあわせてせんたいをつくります。そのご、ぎそうこうじではいかんやでんきせつびをとりつけます。さいごにとそうをしてかんせいです。', 'Di galangan kapal, bekerja merakit kapal besar. Memotong material baja, menyambungkannya dengan pengelasan untuk membuat badan kapal. Setelah itu, pada pekerjaan instalasi memasang pipa dan peralatan listrik. Terakhir dicat hingga selesai.', '[{"term":"組み立てる","reading":"くみたてる","meaning_id":"merakit"},{"term":"電気設備","reading":"でんきせつび","meaning_id":"peralatan listrik"}]', '[{"type":"choice","question":"船体を作る順番として正しいのはどれですか。","choices":["塗装→溶接→切断","切断→溶接→塗装","艤装→切断→塗装","塗装→切断→艤装"],"correct":1,"explanation":"切断してから溶接し、最後に塗装する流れ。"},{"type":"tf","question":"艤装工事では配管などを取り付ける。","correct":true,"explanation":"「艤装工事で配管や電気設備を取り付けます」が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), '自動車整備士の仕事', '自動車整備士は、車の点検や修理を行う仕事です。オイル交換やブレーキの点検など、日常的な整備のほか、故障の診断も行います。車検の準備をすることも大切な仕事の一つです。', 'じどうしゃせいびしは、くるまのてんけんやしゅうりをおこなうしごとです。オイルこうかんやブレーキのてんけんなど、にちじょうてきなせいびのほか、こしょうのしんだんもおこないます。しゃけんのじゅんびをすることもたいせつなしごとのひとつです。', 'Mekanik otomotif adalah pekerjaan melakukan pemeriksaan dan perbaikan mobil. Selain perawatan rutin seperti ganti oli dan pemeriksaan rem, juga melakukan diagnosis kerusakan. Menyiapkan inspeksi kendaraan berkala juga salah satu pekerjaan penting.', '[{"term":"日常的な整備","reading":"にちじょうてきなせいび","meaning_id":"perawatan rutin"},{"term":"故障の診断","reading":"こしょうのしんだん","meaning_id":"diagnosis kerusakan"}]', '[{"type":"choice","question":"自動車整備士の仕事に含まれないものはどれですか。","choices":["オイル交換","ブレーキの点検","故障の診断","運転免許の発行"],"correct":3,"explanation":"運転免許の発行は整備士の仕事ではない。"},{"type":"tf","question":"車検の準備も整備士の仕事の一つである。","correct":true,"explanation":"「車検の準備をすることも大切な仕事」が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), '空港での地上支援', '空港では、飛行機が安全に離着陸できるように様々な仕事があります。手荷物や貨物の積み込み、機内清掃、誘導灯を使った飛行機の誘導などです。時間に正確であることが求められます。', 'くうこうでは、ひこうきがあんぜんにりちゃくりくできるようにさまざまなしごとがあります。てにもつやかもつのつみこみ、きないせいそう、ゆうどうとうをつかったひこうきのゆうどうなどです。じかんにせいかくであることがもとめられます。', 'Di bandara, ada berbagai pekerjaan agar pesawat bisa lepas landas dan mendarat dengan aman. Seperti pemuatan bagasi dan kargo, pembersihan kabin, pemanduan pesawat dengan lampu pemandu. Dituntut ketepatan waktu.', '[{"term":"離着陸","reading":"りちゃくりく","meaning_id":"lepas landas dan mendarat"},{"term":"誘導灯","reading":"ゆうどうとう","meaning_id":"lampu pemandu"}]', '[{"type":"choice","question":"地上支援の仕事に含まれないものはどれですか。","choices":["手荷物の積み込み","機内清掃","飛行機の誘導","機内食の調理"],"correct":3,"explanation":"機内食の調理は別の仕事。"},{"type":"tf","question":"地上支援では時間の正確さが求められる。","correct":true,"explanation":"「時間に正確であることが求められます」が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), 'ホテルスタッフの仕事', 'ホテルのスタッフは、お客様が快適に過ごせるように様々な仕事をします。チェックインやチェックアウトの対応、客室清掃、レストランでの接客などです。丁寧な言葉遣いと笑顔が大切にされています。', 'ホテルのスタッフは、おきゃくさまがかいてきにすごせるようにさまざまなしごとをします。チェックインやチェックアウトのたいおう、きゃくしつせいそう、レストランでのせっきゃくなどです。ていねいなことばづかいとえがおがたいせつにされています。', 'Staf hotel melakukan berbagai pekerjaan agar tamu dapat menikmati kenyamanan. Seperti menangani check-in dan check-out, pembersihan kamar, pelayanan di restoran. Tutur kata yang sopan dan senyuman sangat dijunjung.', '[{"term":"快適に過ごす","reading":"かいてきにすごす","meaning_id":"menikmati kenyamanan"},{"term":"言葉遣い","reading":"ことばづかい","meaning_id":"tutur kata"}]', '[{"type":"choice","question":"ホテルスタッフの仕事に含まれないものはどれですか。","choices":["チェックイン対応","客室清掃","レストランでの接客","飛行機の操縦"],"correct":3,"explanation":"飛行機の操縦はホテルの仕事ではない。"},{"type":"tf","question":"ホテルでは丁寧な言葉遣いが大切にされている。","correct":true,"explanation":"「丁寧な言葉遣いと笑顔が大切」が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), '運転手の一日', 'バスやタクシーの運転手は、出発前に点呼を受け、車両点検を行います。運転中は乗客の安全を第一に考え、安全運転を心がけます。運行管理者の指示に従うことも大切です。', 'バスやタクシーのうんてんしゅは、しゅっぱつまえにてんこをうけ、しゃりょうてんけんをおこないます。うんてんちゅうはじょうきゃくのあんぜんをだいいちにかんがえ、あんぜんうんてんをこころがけます。うんこうかんりしゃのしじにしたがうこともたいせつです。', 'Pengemudi bus atau taksi menjalani absensi dan pemeriksaan kendaraan sebelum berangkat. Saat mengemudi, mengutamakan keselamatan penumpang dan mengusahakan mengemudi aman. Mengikuti instruksi manajer operasi juga penting.', '[{"term":"車両点検","reading":"しゃりょうてんけん","meaning_id":"pemeriksaan kendaraan"},{"term":"運行管理者","reading":"うんこうかんりしゃ","meaning_id":"manajer operasi"}]', '[{"type":"choice","question":"出発前に何をしますか。","choices":["昼食を食べる","点呼と車両点検","休憩する","洗車だけ"],"correct":1,"explanation":"「点呼を受け、車両点検を行います」が正解。"},{"type":"tf","question":"運転中は乗客の安全より速さが大切だ。","correct":false,"explanation":"「乗客の安全を第一に」が正解、速さではない。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), '駅員の仕事', '駅員の仕事は、切符の確認や改札業務、ホームでの安全確認など多岐にわたります。電車が遅延した場合は、お客様に丁寧に説明し、案内をします。安全を守ることが最も重要な役割です。', 'えきいんのしごとは、きっぷのかくにんやかいさつぎょうむ、ホームでのあんぜんかくにんなどたきにわたります。でんしゃがちえんしたばあいは、おきゃくさまにていねいにせつめいし、あんないをします。あんぜんをまもることがもっともじゅうようなやくわりです。', 'Pekerjaan petugas stasiun mencakup berbagai hal seperti pemeriksaan tiket, tugas gerbang tiket, pengecekan keselamatan di peron. Jika kereta terlambat, menjelaskan dengan sopan kepada penumpang dan memandu. Menjaga keselamatan adalah peran terpenting.', '[{"term":"多岐にわたる","reading":"たきにわたる","meaning_id":"mencakup berbagai hal"},{"term":"最も重要な役割","reading":"もっともじゅうようなやくわり","meaning_id":"peran terpenting"}]', '[{"type":"choice","question":"電車が遅延したとき、駅員は何をしますか。","choices":["何もしない","丁寧に説明し案内する","電車を止める","無視する"],"correct":1,"explanation":"「丁寧に説明し、案内をします」が正解。"},{"type":"tf","question":"駅員にとって最も重要なのは安全を守ることだ。","correct":true,"explanation":"「安全を守ることが最も重要な役割」が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), '農業の一年', '農業では、季節ごとに異なる作業があります。春には種まき、夏には水やりや農薬散布、秋には収穫を行います。天候によって作業内容が変わることも多く、柔軟な対応が求められます。', 'のうぎょうでは、きせつごとにことなるさぎょうがあります。はるにはたねまき、なつにはみずやりやのうやくさんぷ、あきにはしゅうかくをおこないます。てんこうによってさぎょうないようがかわることもおおく、じゅうなんなたいおうがもとめられます。', 'Dalam pertanian, ada pekerjaan berbeda tiap musim. Musim semi menyemai benih, musim panas menyiram dan menyemprot pestisida, musim gugur memanen. Isi pekerjaan sering berubah tergantung cuaca, dituntut respons yang fleksibel.', '[{"term":"季節ごと","reading":"きせつごと","meaning_id":"tiap musim"},{"term":"柔軟な対応","reading":"じゅうなんなたいおう","meaning_id":"respons yang fleksibel"}]', '[{"type":"choice","question":"秋に行う作業はどれですか。","choices":["種まき","水やり","収穫","農薬散布"],"correct":2,"explanation":"「秋には収穫を行います」が正解。"},{"type":"tf","question":"農業の作業内容は天候に関係なく毎日同じだ。","correct":false,"explanation":"「天候によって作業内容が変わる」が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), '漁業の仕事', '漁業の仕事は、漁船に乗って魚を獲ることです。出港前には必ず天候を確認し、安全に注意します。獲った魚はすぐに氷詰めにして、鮮度を保ちます。最近は養殖業も増えています。', 'ぎょぎょうのしごとは、ぎょせんにのってさかなをとることです。しゅっこうまえにはかならずてんこうをかくにんし、あんぜんにちゅういします。とったさかなはすぐにこおりづめにして、せんどをたもちます。さいきんはようしょくぎょうもふえています。', 'Pekerjaan perikanan adalah menangkap ikan dengan naik kapal ikan. Sebelum berangkat berlayar selalu memeriksa cuaca dan berhati-hati akan keselamatan. Ikan yang ditangkap segera dikemas es untuk menjaga kesegaran. Belakangan ini budidaya perikanan juga meningkat.', '[{"term":"鮮度を保つ","reading":"せんどをたもつ","meaning_id":"menjaga kesegaran"},{"term":"養殖業","reading":"ようしょくぎょう","meaning_id":"industri budidaya"}]', '[{"type":"choice","question":"獲った魚をどうしますか。","choices":["すぐに料理する","すぐに氷詰めにする","そのまま置いておく","海に戻す"],"correct":1,"explanation":"「すぐに氷詰めにして、鮮度を保ちます」が正解。"},{"type":"tf","question":"最近、養殖業は減っている。","correct":false,"explanation":"「養殖業も増えています」が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), '食品工場での衛生管理', '食品工場では、衛生管理が非常に重要です。作業員は作業前に手を洗い、消毒します。異物混入を防ぐため、髪の毛やアクセサリーにも注意が必要です。賞味期限の確認も欠かせません。', 'しょくひんこうじょうでは、えいせいかんりがひじょうにじゅうようです。さぎょういんはさぎょうまえにてをあらい、しょうどくします。いぶつこんにゅうをふせぐため、かみのけやアクセサリーにもちゅういがひつようです。しょうみきげんのかくにんもかかせません。', 'Di pabrik makanan, manajemen higiene sangat penting. Pekerja mencuci tangan dan disinfeksi sebelum bekerja. Untuk mencegah kontaminasi benda asing, perlu perhatian pada rambut dan aksesoris juga. Pemeriksaan tanggal kedaluwarsa juga tidak boleh terlewat.', '[{"term":"衛生管理","reading":"えいせいかんり","meaning_id":"manajemen higiene"},{"term":"欠かせない","reading":"かかせない","meaning_id":"tidak boleh terlewat"}]', '[{"type":"choice","question":"異物混入を防ぐために注意することは何ですか。","choices":["給料","髪の毛やアクセサリー","出勤時間","休憩時間"],"correct":1,"explanation":"「髪の毛やアクセサリーにも注意が必要」が正解。"},{"type":"tf","question":"賞味期限の確認は必要ない。","correct":false,"explanation":"「賞味期限の確認も欠かせません」が正解。"}]'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), 'レストランでの接客', 'レストランのスタッフは、お客様に気持ちよく食事をしていただけるよう心がけます。注文を正確に受け、料理を丁寧に盛り付けます。アレルギーの確認も忘れてはいけません。', 'レストランのスタッフは、おきゃくさまにきもちよくしょくじをしていただけるようこころがけます。ちゅうもんをせいかくにうけ、りょうりをていねいにもりつけます。アレルギーのかくにんもわすれてはいけません。', 'Staf restoran mengusahakan agar pelanggan dapat makan dengan nyaman. Menerima pesanan dengan akurat, menata hidangan dengan teliti. Konfirmasi alergi juga tidak boleh dilupakan.', '[{"term":"気持ちよく","reading":"きもちよく","meaning_id":"dengan nyaman"},{"term":"アレルギーの確認","reading":"アレルギーのかくにん","meaning_id":"konfirmasi alergi"}]', '[{"type":"choice","question":"レストランスタッフが忘れてはいけないことは何ですか。","choices":["席の掃除","アレルギーの確認","看板の掃除","駐車場の管理"],"correct":1,"explanation":"「アレルギーの確認も忘れてはいけません」が正解。"},{"type":"tf","question":"料理の盛り付けは適当でよい。","correct":false,"explanation":"「丁寧に盛り付けます」が正解。"}]')
ON CONFLICT (category_id, title) DO NOTHING;

-- ============================================================
-- SSW — Quiz latihan (ssw_quizzes) + soal (ssw_questions), 14 bidang
-- source='practice' (generated) -- BUKAN soal resmi OTIT, sesuai aturan
-- schema: label source WAJIB akurat, jangan pernah 'official' tanpa
-- source_url sungguhan.
-- ============================================================
INSERT INTO ssw_quizzes (category_id, kind, title, description, pass_score, time_limit_min, question_count, randomize, source, source_name) VALUES
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), 'practice', 'Latihan Dasar — Kaigo', 'Latihan kosakata dan pemahaman dasar bidang perawatan lansia.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), 'practice', 'Latihan Dasar — Building Cleaning', 'Latihan kosakata dan pemahaman dasar bidang pembersihan gedung.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), 'practice', 'Latihan Dasar — Manufaktur', 'Latihan kosakata dan pemahaman dasar bidang manufaktur produk industri.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), 'practice', 'Latihan Dasar — Konstruksi', 'Latihan kosakata dan pemahaman dasar bidang konstruksi.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), 'practice', 'Latihan Dasar — Perkapalan', 'Latihan kosakata dan pemahaman dasar bidang perkapalan.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), 'practice', 'Latihan Dasar — Servis Otomotif', 'Latihan kosakata dan pemahaman dasar bidang servis otomotif.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), 'practice', 'Latihan Dasar — Penerbangan', 'Latihan kosakata dan pemahaman dasar bidang penerbangan.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), 'practice', 'Latihan Dasar — Perhotelan', 'Latihan kosakata dan pemahaman dasar bidang perhotelan.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), 'practice', 'Latihan Dasar — Transportasi Kendaraan', 'Latihan kosakata dan pemahaman dasar bidang transportasi kendaraan.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), 'practice', 'Latihan Dasar — Kereta Api', 'Latihan kosakata dan pemahaman dasar bidang kereta api.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), 'practice', 'Latihan Dasar — Pertanian', 'Latihan kosakata dan pemahaman dasar bidang pertanian.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), 'practice', 'Latihan Dasar — Perikanan', 'Latihan kosakata dan pemahaman dasar bidang perikanan.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), 'practice', 'Latihan Dasar — Manufaktur Makanan', 'Latihan kosakata dan pemahaman dasar bidang manufaktur makanan.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy'),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), 'practice', 'Latihan Dasar — Restoran', 'Latihan kosakata dan pemahaman dasar bidang restoran.', 60, 10, 5, true, 'practice', 'Nihongo Pro Academy')
ON CONFLICT (category_id, title) DO NOTHING;

-- ── Soal, 5 per quiz, semua type='mc' (payload{question,choices} + answer{index}, sesuai validasi ssw-cms.js) ──
INSERT INTO ssw_questions (quiz_id, type, payload, answer, explanation, sort) VALUES
  -- kaigo
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Kaigo'), 'mc', '{"question": "「移乗」の意味は何ですか。", "choices": ["食べること", "寝ること", "利用者を移動させること", "話すこと"]}', '{"index": 2}', '「移乗」＝pemindahan/transfer pengguna.', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Kaigo'), 'mc', '{"question": "体位変換は何のために行いますか。", "choices": ["褥瘡を予防するため", "食欲を出すため", "眠るため", "運動のため"]}', '{"index": 0}', '体位変換は褥瘡（luka tekan）予防のため。', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Kaigo'), 'mc', '{"question": "「認知症」の読み方はどれですか。", "choices": ["にんちしょう", "にんじしょう", "にんちしょ", "にんじょう"]}', '{"index": 0}', '「認知症」＝にんちしょう (demensia).', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Kaigo'), 'mc', '{"question": "利用者を__なければなりません。（丁寧に世話をする）", "choices": ["介助し", "介助する", "介助して", "介助した"]}', '{"index": 0}', '～なければなりません の前は動詞のます形（ない形の語幹）。', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Kaigo'), 'mc', '{"question": "バイタルサインに含まれないものはどれですか。", "choices": ["血圧", "体温", "脈拍", "給料"]}', '{"index": 3}', '給料はバイタルサインではない。', 5),

  -- building-clean
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Building Cleaning'), 'mc', '{"question": "「清掃」の意味は何ですか。", "choices": ["料理する", "掃除する", "運転する", "販売する"]}', '{"index": 1}', '「清掃」＝pembersihan.', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Building Cleaning'), 'mc', '{"question": "高所作業をするとき、何を着用しますか。", "choices": ["帽子だけ", "安全帯", "サンダル", "マスクだけ"]}', '{"index": 1}', '高所作業では安全帯（sabuk pengaman）を着用する。', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Building Cleaning'), 'mc', '{"question": "洗剤を混ぜて__。（禁止）", "choices": ["はいけません", "ください", "おきます", "みます"]}', '{"index": 0}', '～てはいけません＝larangan.', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Building Cleaning'), 'mc', '{"question": "「ワックスがけ」とは何ですか。", "choices": ["窓を拭くこと", "床にワックスを塗ること", "ゴミを捨てること", "電気をつけること"]}', '{"index": 1}', '「ワックスがけ」＝pelapisan wax lantai.', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Building Cleaning'), 'mc', '{"question": "作業する__に手袋をはめます。", "choices": ["前", "後", "中", "間"]}', '{"index": 0}', '～前に＝sebelum.', 5),

  -- manufaktur
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Manufaktur'), 'mc', '{"question": "「検品」の意味は何ですか。", "choices": ["製品を作ること", "製品を検査すること", "製品を売ること", "製品を運ぶこと"]}', '{"index": 1}', '「検品」＝pemeriksaan kualitas produk.', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Manufaktur'), 'mc', '{"question": "不良品を見つけたら、まず何をしますか。", "choices": ["捨てる", "報告する", "隠す", "持ち帰る"]}', '{"index": 1}', '不良品を見つけたら班長に報告する。', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Manufaktur'), 'mc', '{"question": "「寸法」の読み方はどれですか。", "choices": ["すんぽう", "そんぽう", "すんぼう", "しゃくほう"]}', '{"index": 0}', '「寸法」＝すんぽう (dimensi/ukuran).', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Manufaktur'), 'mc', '{"question": "検品は二人で行う__になっています。", "choices": ["こと", "もの", "ところ", "ため"]}', '{"index": 0}', '～ことになっている＝aturan yang sudah ditetapkan.', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Manufaktur'), 'mc', '{"question": "「組立」の意味は何ですか。", "choices": ["分解すること", "組み合わせて作ること", "洗うこと", "測ること"]}', '{"index": 1}', '「組立」＝perakitan.', 5),

  -- kensetsu
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Konstruksi'), 'mc', '{"question": "「足場」の意味は何ですか。", "choices": ["靴", "perancah", "車", "道具箱"]}', '{"index": 1}', '「足場」＝perancah/scaffolding.', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Konstruksi'), 'mc', '{"question": "重機に__でください。（禁止）", "choices": ["近づかない", "近づく", "近づいて", "近づけ"]}', '{"index": 0}', '～ないでください＝larangan sopan, kata kerja bentuk nai.', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Konstruksi'), 'mc', '{"question": "「鉄筋」とは何ですか。", "choices": ["木材", "besi tulangan", "塗料", "ガラス"]}', '{"index": 1}', '「鉄筋」＝besi tulangan (rebar).', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Konstruksi'), 'mc', '{"question": "型枠ができ__、コンクリートを流します。", "choices": ["たら", "れば", "なら", "と"]}', '{"index": 0}', '～たら＝kalau/setelah (urutan kejadian).', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Konstruksi'), 'mc', '{"question": "現場での朝の集まりを何と言いますか。", "choices": ["夕礼", "朝礼", "昼礼", "夜礼"]}', '{"index": 1}', '「朝礼」＝briefing pagi.', 5),

  -- zousen
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perkapalan'), 'mc', '{"question": "「船体」の意味は何ですか。", "choices": ["badan kapal", "エンジン", "荷物", "乗組員"]}', '{"index": 0}', '「船体」＝badan kapal (hull).', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perkapalan'), 'mc', '{"question": "溶接をする__、保護メガネを使います。", "choices": ["際に", "はずに", "ように", "ためで"]}', '{"index": 0}', '～際に＝pada saat (formal).', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perkapalan'), 'mc', '{"question": "「艤装」とは何ですか。", "choices": ["塗装すること", "perlengkapan kapal dipasang", "鋼材を切ること", "船を洗うこと"]}', '{"index": 1}', '「艤装」＝instalasi perlengkapan kapal.', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perkapalan'), 'mc', '{"question": "「鋼材」の読み方はどれですか。", "choices": ["こうざい", "こうさい", "ごうざい", "こざい"]}', '{"index": 0}', '「鋼材」＝こうざい (material baja).', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perkapalan'), 'mc', '{"question": "作業が終わり__、報告します。", "choices": ["次第", "ばかり", "あげく", "うえで"]}', '{"index": 0}', '～次第＝segera setelah.', 5),

  -- jidousha-seibi
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Servis Otomotif'), 'mc', '{"question": "「点検」の意味は何ですか。", "choices": ["pemeriksaan", "修理費", "販売", "製造"]}', '{"index": 0}', '「点検」＝pemeriksaan/inspeksi.', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Servis Otomotif'), 'mc', '{"question": "ブレーキが正常__確認します。", "choices": ["かどうか", "かもしれない", "からには", "からこそ"]}', '{"index": 0}', '～かどうか＝apakah ~ atau tidak.', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Servis Otomotif'), 'mc', '{"question": "「故障」の読み方はどれですか。", "choices": ["こしょう", "こじょう", "こそう", "こぞう"]}', '{"index": 0}', '「故障」＝こしょう (kerusakan).', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Servis Otomotif'), 'mc', '{"question": "オイルを交換した__です。（たった今）", "choices": ["ばかり", "ところ", "つもり", "はず"]}', '{"index": 0}', '～たばかり＝baru saja.', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Servis Otomotif'), 'mc', '{"question": "車の定期的な検査を何と言いますか。", "choices": ["車検", "免許", "保険", "事故"]}', '{"index": 0}', '「車検」＝inspeksi kendaraan berkala.', 5),

  -- koukuu
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Penerbangan'), 'mc', '{"question": "「手荷物」の意味は何ですか。", "choices": ["bagasi", "乗客", "切符", "出発"]}', '{"index": 0}', '「手荷物」＝bagasi.', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Penerbangan'), 'mc', '{"question": "出発時刻__に搭乗を終えてください。", "choices": ["までに", "までは", "のまえ", "のあと"]}', '{"index": 0}', '～までに＝sebelum batas waktu.', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Penerbangan'), 'mc', '{"question": "「搭乗」の読み方はどれですか。", "choices": ["とうじょう", "とじょう", "とうしょう", "とうそう"]}', '{"index": 0}', '「搭乗」＝とうじょう (boarding).', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Penerbangan'), 'mc', '{"question": "「誘導灯」は何のために使いますか。", "choices": ["memandu pesawat", "荷物を運ぶため", "乗客を数えるため", "機内食のため"]}', '{"index": 0}', '「誘導灯」＝lampu pemandu untuk memandu pesawat.', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Penerbangan'), 'mc', '{"question": "天候により、フライトが遅れる__があります。", "choices": ["こと", "もの", "はず", "つもり"]}', '{"index": 0}', '～ことがあります＝terkadang terjadi.', 5),

  -- shukuhaku
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perhotelan'), 'mc', '{"question": "「客室清掃」の意味は何ですか。", "choices": ["pembersihan kamar tamu", "予約受付", "会計", "料理"]}', '{"index": 0}', '「客室清掃」＝pembersihan kamar tamu.', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perhotelan'), 'mc', '{"question": "お荷物をお部屋まで運ば__いただきます。（謙譲・許可）", "choices": ["せて", "れて", "させ", "され"]}', '{"index": 0}', '～させていただきます＝bentuk kausatif sangat sopan.', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perhotelan'), 'mc', '{"question": "チェックインは15時から__。（丁寧語）", "choices": ["でございます", "だです", "でいます", "でおります"]}', '{"index": 0}', '～でございます＝bentuk sopan dari です.', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perhotelan'), 'mc', '{"question": "「予約」の読み方はどれですか。", "choices": ["よやく", "よやき", "ようやく", "よあく"]}', '{"index": 0}', '「予約」＝よやく (reservasi).', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perhotelan'), 'mc', '{"question": "お客様の依頼に対する丁寧な返事はどれですか。", "choices": ["わかった", "かしこまりました", "OK", "了解"]}', '{"index": 1}', '「かしこまりました」＝ungkapan sopan menerima permintaan.', 5),

  -- unten
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Transportasi Kendaraan'), 'mc', '{"question": "「点呼」の意味は何ですか。", "choices": ["absensi sebelum kerja", "給料の計算", "車の修理", "客の予約"]}', '{"index": 0}', '「点呼」＝absensi/pemeriksaan sebelum kerja.', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Transportasi Kendaraan'), 'mc', '{"question": "乗車の__は、シートベルトを締めてください。", "choices": ["際", "もの", "はず", "ため"]}', '{"index": 0}', '～際は＝pada saat (formal).', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Transportasi Kendaraan'), 'mc', '{"question": "「運行管理」の読み方はどれですか。", "choices": ["うんこうかんり", "うんぎょうかんり", "うんこうかんに", "うんこかんり"]}', '{"index": 0}', '「運行管理」＝うんこうかんり (manajemen operasi).', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Transportasi Kendaraan'), 'mc', '{"question": "スピードを出しすぎると事故の__があります。", "choices": ["おそれ", "つもり", "はず", "わけ"]}', '{"index": 0}', '～おそれがあります＝ada risiko (hal negatif).', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Transportasi Kendaraan'), 'mc', '{"question": "「運賃」とは何ですか。", "choices": ["tarif angkutan", "運転免許", "車両の重さ", "経路"]}', '{"index": 0}', '「運賃」＝tarif angkutan (fare).', 5),

  -- tetsudou
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Kereta Api'), 'mc', '{"question": "「改札」の意味は何ですか。", "choices": ["gerbang tiket", "線路", "車掌", "運転士"]}', '{"index": 0}', '「改札」＝gerbang tiket.', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Kereta Api'), 'mc', '{"question": "券売機を__ください。（丁寧な勧め）", "choices": ["ご利用", "お利用", "利用して", "利用され"]}', '{"index": 0}', '～ご利用ください＝ajakan sopan menggunakan sesuatu.', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Kereta Api'), 'mc', '{"question": "「遅延」の読み方はどれですか。", "choices": ["ちえん", "ちおくれ", "おくれ", "ちねん"]}', '{"index": 0}', '「遅延」＝ちえん (keterlambatan).', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Kereta Api'), 'mc', '{"question": "踏切内に立ち入ると危険な__があります。", "choices": ["恐れ", "つもり", "はず", "わけ"]}', '{"index": 0}', '～恐れがあります＝ada risiko/potensi bahaya.', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Kereta Api'), 'mc', '{"question": "「車掌」の仕事は何ですか。", "choices": ["mengumumkan di dalam kereta", "線路を作る", "切符を印刷する", "電車を洗う"]}', '{"index": 0}', '「車掌」＝kondektur, mengumumkan di dalam kereta.', 5),

  -- nougyou
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Pertanian'), 'mc', '{"question": "「収穫」の意味は何ですか。", "choices": ["panen", "種まき", "水やり", "施肥"]}', '{"index": 0}', '「収穫」＝panen (harvest).', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Pertanian'), 'mc', '{"question": "天気を見__灌水の時間を決めます。", "choices": ["ながら", "てから", "たあとで", "たまま"]}', '{"index": 0}', '～ながら＝sambil (dua tindakan bersamaan).', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Pertanian'), 'mc', '{"question": "「施肥」の読み方はどれですか。", "choices": ["せひ", "しひ", "せび", "しび"]}', '{"index": 0}', '「施肥」＝せひ (pemupukan).', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Pertanian'), 'mc', '{"question": "農薬がかからない__気をつけます。", "choices": ["ように", "ために", "ところ", "もの"]}', '{"index": 0}', '～ように気をつける＝berhati-hati agar ~.', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Pertanian'), 'mc', '{"question": "「ビニールハウス」とは何ですか。", "choices": ["rumah kaca", "トラクター", "倉庫", "市場"]}', '{"index": 0}', '「ビニールハウス」＝rumah kaca (greenhouse).', 5),

  -- gyogyou
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perikanan'), 'mc', '{"question": "「養殖」の意味は何ですか。", "choices": ["budidaya", "漁獲", "運搬", "販売"]}', '{"index": 0}', '「養殖」＝budidaya (aquaculture).', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perikanan'), 'mc', '{"question": "出港する__に天候を確認します。", "choices": ["前", "後", "中", "間"]}', '{"index": 0}', '～前に＝sebelum.', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perikanan'), 'mc', '{"question": "「水揚げ」の読み方はどれですか。", "choices": ["みずあげ", "すいあげ", "みずげ", "すいげ"]}', '{"index": 0}', '「水揚げ」＝みずあげ (pendaratan hasil tangkapan).', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perikanan'), 'mc', '{"question": "天候__漁に出られないことがあります。", "choices": ["によって", "にとって", "について", "にたいして"]}', '{"index": 0}', '～によって＝tergantung pada/karena.', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Perikanan'), 'mc', '{"question": "乗船中に必ず着用するものは何ですか。", "choices": ["救命胴衣", "帽子", "手袋だけ", "サングラス"]}', '{"index": 0}', '「救命胴衣」＝jaket pelampung, wajib dipakai.', 5),

  -- shokuhin
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Manufaktur Makanan'), 'mc', '{"question": "「殺菌」の意味は何ですか。", "choices": ["sterilisasi", "包装", "計量", "出荷"]}', '{"index": 0}', '「殺菌」＝sterilisasi.', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Manufaktur Makanan'), 'mc', '{"question": "手を洗っ__作業を始めます。", "choices": ["てから", "ている", "てあった", "ておいた"]}', '{"index": 0}', '～てから＝setelah.', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Manufaktur Makanan'), 'mc', '{"question": "「異物混入」の読み方はどれですか。", "choices": ["いぶつこんにゅう", "いぶつこんにゅ", "いもつこんにゅう", "いぶつこんにょう"]}', '{"index": 0}', '「異物混入」＝いぶつこんにゅう (kontaminasi benda asing).', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Manufaktur Makanan'), 'mc', '{"question": "異物が混入する__があります。", "choices": ["おそれ", "つもり", "はず", "こと"]}', '{"index": 0}', '～おそれがある＝berisiko (hal negatif).', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Manufaktur Makanan'), 'mc', '{"question": "「賞味期限」とは何ですか。", "choices": ["tanggal kedaluwarsa", "製造日", "出荷日", "価格"]}', '{"index": 0}', '「賞味期限」＝tanggal kedaluwarsa.', 5),

  -- gaishoku
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Restoran'), 'mc', '{"question": "「盛り付け」の意味は何ですか。", "choices": ["penataan hidangan", "洗い物", "会計", "予約"]}', '{"index": 0}', '「盛り付け」＝penataan hidangan (plating).', 1),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Restoran'), 'mc', '{"question": "お水をお持ちし__か。（丁寧な申し出）", "choices": ["ましょう", "ます", "ました", "ません"]}', '{"index": 0}', '～ましょうか＝menawarkan bantuan dengan sopan.', 2),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Restoran'), 'mc', '{"question": "「仕込み」の読み方はどれですか。", "choices": ["しこみ", "しごみ", "しくみ", "じこみ"]}', '{"index": 0}', '「仕込み」＝しこみ (persiapan bahan).', 3),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Restoran'), 'mc', '{"question": "ご注文はこちら__よろしいですか。", "choices": ["で", "に", "を", "が"]}', '{"index": 0}', '～でよろしいですか＝konfirmasi sopan.', 4),
  ((SELECT id FROM ssw_quizzes WHERE title='Latihan Dasar — Restoran'), 'mc', '{"question": "「アレルギー対応」とは何ですか。", "choices": ["penanganan alergi makanan", "予約管理", "在庫管理", "清掃"]}', '{"index": 0}', '「アレルギー対応」＝penanganan alergi makanan.', 5)
ON CONFLICT (quiz_id, sort) DO NOTHING;

-- ============================================================
-- SSW — Modul (ssw_modules) + Lesson (ssw_lessons), 14 bidang
-- 1 modul dasar + 2 lesson per bidang. vocab_ids dihubungkan ke
-- baris ssw_vocabulary yang sudah disisipkan di atas (subquery),
-- jadi lesson benar-benar terhubung ke kosakata, bukan sekadar teks.
-- ============================================================
INSERT INTO ssw_modules (category_id, title, title_jp, description, sort) VALUES
  ((SELECT id FROM ssw_categories WHERE slug='kaigo'), 'Dasar Perawatan Lansia', '介護の基礎', 'Kosakata dan sikap dasar saat menemani pengguna di fasilitas perawatan.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='building-clean'), 'Dasar Pembersihan Gedung', 'ビルクリーニングの基礎', 'Istilah dan prosedur dasar pembersihan gedung bertingkat.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='manufaktur'), 'Dasar Manufaktur', '工業製品製造業の基礎', 'Istilah dasar lini produksi, pemeriksaan kualitas, dan keselamatan pabrik.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='kensetsu'), 'Dasar Konstruksi', '建設の基礎', 'Istilah dasar di lokasi proyek konstruksi dan keselamatan kerja.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='zousen'), 'Dasar Perkapalan', '造船・舶用工業の基礎', 'Istilah dasar pembangunan dan perawatan kapal di galangan.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='jidousha-seibi'), 'Dasar Servis Otomotif', '自動車整備の基礎', 'Istilah dasar pemeriksaan dan perawatan kendaraan bermotor.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='koukuu'), 'Dasar Ground Handling Penerbangan', '航空の基礎', 'Istilah dasar operasional darat bandara — bagasi, boarding, dan keselamatan apron.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='shukuhaku'), 'Dasar Layanan Perhotelan', '宿泊の基礎', 'Istilah dasar front desk dan housekeeping di hotel/penginapan.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='unten'), 'Dasar Transportasi Kendaraan', '自動車運送業の基礎', 'Istilah dasar keselamatan dan operasional pengemudi profesional.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='tetsudou'), 'Dasar Operasional Kereta Api', '鉄道の基礎', 'Istilah dasar stasiun, peron, dan keselamatan perkeretaapian.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='nougyou'), 'Dasar Pertanian', '農業の基礎', 'Istilah dasar budidaya tanaman dan pekerjaan lahan sehari-hari.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='gyogyou'), 'Dasar Perikanan', '漁業の基礎', 'Istilah dasar kerja di kapal ikan dan penanganan hasil tangkapan.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='shokuhin'), 'Dasar Manufaktur Makanan', '飲食料品製造業の基礎', 'Istilah dasar higiene dan proses produksi di pabrik makanan.', 10),
  ((SELECT id FROM ssw_categories WHERE slug='gaishoku'), 'Dasar Layanan Restoran', '外食業の基礎', 'Istilah dasar dapur dan pelayanan pelanggan di restoran.', 10)
ON CONFLICT (category_id, title) DO NOTHING;

-- ── kaigo ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Perawatan Lansia'), 'l1-menyapa-dan-transfer', 'Menyapa dan memindahkan pengguna', '挨拶と移乗', 'Sapaan kerja dasar, sebutan ご利用者, dan langkah aman memindahkan pengguna.',
   '## Ringkasan
Caregiver (介護士) berinteraksi dengan ご利用者 (sebutan hormat untuk pengguna layanan) setiap hari. Bagian ini fokus pada kosakata dasar bantuan fisik: 移乗、食事介助、入浴介助、排泄.

## Kosakata Kunci
- **移乗（いじょう）** — Pemindahan/transfer pengguna
- **食事介助（しょくじかいじょ）** — Bantuan makan
- **入浴介助（にゅうよくかいじょ）** — Bantuan mandi
- **排泄（はいせつ）** — Buang air (besar/kecil)

## Contoh Kalimat
利用者をベッドから車いすへ移乗させます。
（Memindahkan pengguna dari tempat tidur ke kursi roda.）

## Catatan
Selalu jelaskan tindakan ke pengguna sebelum melakukannya ("〜させていただきますね") — ini bagian dari standar layanan kaigo, bukan basa-basi.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='kaigo') AND term IN ('移乗','食事介助','入浴介助','排泄')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Perawatan Lansia'), 'l2-kesehatan-dan-observasi', 'Kesehatan & observasi harian', '健康と観察', 'Istilah kondisi tubuh dan pengamatan harian yang wajib dicatat/dilaporkan caregiver.',
   '## Ringkasan
Caregiver bukan hanya membantu fisik, tapi juga mengamati kondisi kesehatan pengguna dan melapor ke perawat (看護師) bila ada perubahan.

## Kosakata Kunci
- **認知症（にんちしょう）** — Demensia
- **体位変換（たいいへんかん）** — Pengubahan posisi tubuh
- **褥瘡（じょくそう）** — Luka tekan (dekubitus)
- **バイタルサイン** — Tanda vital

## Contoh Kalimat
2時間ごとに体位変換をして、褥瘡を予防します。
（Mengubah posisi tubuh setiap dua jam untuk mencegah luka tekan.）

## Catatan
Jika bertemu ご利用者 dengan 認知症, bicara pelan, tenang, dan jangan mengoreksi secara langsung — validasi perasaannya dulu.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='kaigo') AND term IN ('認知症','体位変換','褥瘡','バイタルサイン')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── building-clean ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Pembersihan Gedung'), 'l1-alat-dan-bahan', 'Alat dan bahan pembersih', '清掃道具と洗剤', 'Kosakata dasar pembersihan lantai dan kerja di tempat tinggi.',
   '## Ringkasan
清掃 (pembersihan) gedung mencakup lantai, kaca, dan area publik. Beberapa area butuh alat dan izin khusus.

## Kosakata Kunci
- **清掃（せいそう）** — Pembersihan
- **床磨き（ゆかみがき）** — Poles lantai
- **洗剤（せんざい）** — Deterjen/bahan pembersih
- **高所作業（こうしょさぎょう）** — Kerja di tempat tinggi

## Contoh Kalimat
高所作業では安全帯を着用してから作業します。
（Memakai sabuk pengaman dulu sebelum kerja di tempat tinggi.）

## Catatan
Jangan mencampur 洗剤 jenis berbeda — beberapa kombinasi bahan kimia berbahaya (mis. pemutih + asam).',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='building-clean') AND term IN ('清掃','床磨き','洗剤','高所作業')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Pembersihan Gedung'), 'l2-perawatan-lantai-dan-keselamatan', 'Perawatan lantai & keselamatan', '床のメンテナンスと安全', 'Wax lantai, kaca, pemilahan sampah, dan alat pelindung diri.',
   '## Ringkasan
Selain membersihkan, staf juga merawat permukaan (ワックスがけ) dan memilah sampah sesuai aturan gedung.

## Kosakata Kunci
- **ワックスがけ** — Pelapisan wax lantai
- **ガラス清掃（ガラスせいそう）** — Pembersihan kaca
- **ゴミ分別（ゴミぶんべつ）** — Pemilahan sampah
- **安全靴（あんぜんぐつ）** — Sepatu safety

## Contoh Kalimat
ゴミ分別のルールを守って、安全靴を履いて作業します。
（Mematuhi aturan pemilahan sampah, bekerja dengan sepatu safety.）

## Catatan
Lantai yang baru diberi ワックス licin — pasang tanda "licin" (濡れ床注意) agar pengunjung tidak terpeleset.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='building-clean') AND term IN ('ワックスがけ','ガラス清掃','ゴミ分別','安全靴')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── manufaktur ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Manufaktur'), 'l1-lini-produksi-dan-qc', 'Lini produksi & pemeriksaan kualitas', '生産ラインと検品', 'Kosakata dasar perakitan, pengelasan, dan pemeriksaan produk.',
   '## Ringkasan
工場 (pabrik) menjalankan lini produksi (ライン作業) yang merakit komponen lalu memeriksa hasilnya sebelum dikirim.

## Kosakata Kunci
- **検品（けんぴん）** — Pemeriksaan kualitas produk
- **組立（くみたて）** — Perakitan
- **不良品（ふりょうひん）** — Barang cacat/reject
- **溶接（ようせつ）** — Pengelasan

## Contoh Kalimat
製品を一つずつ検品して、不良品を見つけたら報告します。
（Memeriksa produk satu per satu, melapor jika menemukan barang cacat.）

## Catatan
不良品 jangan dibuang sendiri — selalu dipisahkan dan dilaporkan ke 班長 (kepala regu) untuk dicatat penyebabnya.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='manufaktur') AND term IN ('検品','組立','不良品','溶接')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Manufaktur'), 'l2-proses-dan-keselamatan-kerja', 'Proses produksi & keselamatan kerja', '加工工程と安全教育', 'Proses press, pengukuran dimensi, SOP, dan pelatihan keselamatan.',
   '## Ringkasan
Setiap proses (プレス加工) punya 作業手順書 (SOP) yang wajib diikuti, dan pekerja baru menerima 安全教育 sebelum masuk lini.

## Kosakata Kunci
- **プレス加工（プレスかこう）** — Proses press/stamping
- **安全教育（あんぜんきょういく）** — Pelatihan keselamatan kerja
- **寸法（すんぽう）** — Ukuran/dimensi
- **作業手順書（さぎょうてじゅんしょ）** — Instruksi kerja/SOP

## Contoh Kalimat
作業手順書の通りに、ノギスで寸法を測ります。
（Mengukur dimensi dengan jangka sorong sesuai instruksi kerja.）

## Catatan
Menyimpang dari 作業手順書 tanpa izin — meski terasa lebih cepat — adalah pelanggaran serius di banyak pabrik Jepang.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='manufaktur') AND term IN ('プレス加工','安全教育','寸法','作業手順書')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── kensetsu ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Konstruksi'), 'l1-struktur-dan-apd', 'Struktur dasar & alat pelindung diri', '足場と保護具', 'Perancah, bekisting, besi tulangan, dan wajib pakai helm.',
   '## Ringkasan
Sebelum pekerjaan struktur dimulai, 足場 (perancah) dipasang, dan setiap pekerja wajib ヘルメット着用 (memakai helm) di area proyek.

## Kosakata Kunci
- **足場（あしば）** — Perancah/scaffolding
- **型枠（かたわく）** — Bekisting cor
- **鉄筋（てっきん）** — Besi tulangan
- **ヘルメット着用（ヘルメットちゃくよう）** — Memakai helm

## Contoh Kalimat
足場を組んでから、型枠に鉄筋を組み込みます。
（Setelah memasang perancah, memasang besi tulangan ke dalam bekisting.）

## Catatan
現場では必ずヘルメット着用です — ini bukan saran, tapi aturan wajib tanpa pengecualian di hampir semua proyek.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='kensetsu') AND term IN ('足場','型枠','鉄筋','ヘルメット着用')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Konstruksi'), 'l2-rutinitas-lokasi-proyek', 'Rutinitas harian di lokasi proyek', '現場のルーティン', 'Alat berat, penandaan garis, briefing pagi, dan curing beton.',
   '## Ringkasan
Hari kerja di 現場 (lokasi proyek) dimulai dengan 朝礼 (briefing pagi) untuk cek keselamatan sebelum alat berat (重機) dijalankan.

## Kosakata Kunci
- **重機（じゅうき）** — Alat berat
- **墨出し（すみだし）** — Penandaan garis konstruksi
- **朝礼（ちょうれい）** — Briefing pagi
- **養生（ようじょう）** — Perlindungan/curing material

## Contoh Kalimat
毎朝、朝礼で安全確認をしてから、重機の周りに近づかないよう注意します。
（Cek keselamatan tiap pagi saat briefing, lalu berhati-hati tidak mendekati alat berat.）

## Catatan
養生期間 beton belum boleh dibebani — melanggar jadwal curing bisa merusak kekuatan struktur.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='kensetsu') AND term IN ('重機','墨出し','朝礼','養生')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── zousen ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Perkapalan'), 'l1-badan-kapal-dan-material', 'Badan kapal & material', '船体と鋼材', 'Kosakata dasar konstruksi badan kapal, pengecatan, dan material baja.',
   '## Ringkasan
Pembangunan 船体 (badan kapal) memakai 鋼材 (material baja) yang dipotong, dilas, lalu diberi 塗装 (pengecatan) pelindung karat.

## Kosakata Kunci
- **船体（せんたい）** — Badan kapal
- **艤装（ぎそう）** — Instalasi perlengkapan kapal
- **塗装（とそう）** — Pengecatan
- **鋼材（こうざい）** — Material baja

## Contoh Kalimat
鋼材を所定の寸法に切断してから、船体の溶接作業をします。
（Memotong material baja sesuai ukuran, lalu mengelas badan kapal.）

## Catatan
艤装 (instalasi pipa, kabel, mesin) baru dikerjakan setelah struktur 船体 selesai — urutan ini tidak boleh dibalik.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='zousen') AND term IN ('船体','艤装','塗装','鋼材')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Perkapalan'), 'l2-kerja-di-dok-dan-sertifikasi', 'Kerja di dok & sertifikasi las', 'ドック作業と溶接資格', 'Perancah di dok, perpipaan, dan sertifikasi pengelasan.',
   '## Ringkasan
Sebagian besar pekerjaan perkapalan dilakukan di ドック (dok kapal), termasuk 足場作業 (kerja di perancah) dan pemasangan 配管 (pipa).

## Kosakata Kunci
- **足場作業（あしばさぎょう）** — Kerja di perancah
- **配管（はいかん）** — Perpipaan
- **溶接資格（ようせつしかく）** — Sertifikasi las
- **ドック** — Dok kapal

## Contoh Kalimat
ドック内で足場作業をしながら、配管のつなぎ目を確認します。
（Bekerja di perancah dalam dok sambil memeriksa sambungan pipa.）

## Catatan
Banyak posisi las di zousen mensyaratkan 溶接資格 resmi — sertifikat ini sering jadi syarat wajib, bukan sekadar nilai tambah.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='zousen') AND term IN ('足場作業','配管','溶接資格','ドック')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── jidousha-seibi ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Servis Otomotif'), 'l1-pemeriksaan-dan-komponen-dasar', 'Pemeriksaan & komponen dasar', '点検と基本部品', 'Kosakata dasar inspeksi kendaraan, oli, rem, dan mesin.',
   '## Ringkasan
点検 (pemeriksaan) rutin mencakup cek オイル交換 (ganti oli), ブレーキ (rem), dan エンジン (mesin).

## Kosakata Kunci
- **点検（てんけん）** — Pemeriksaan/inspeksi
- **オイル交換（オイルこうかん）** — Ganti oli
- **ブレーキ** — Rem
- **エンジン** — Mesin

## Contoh Kalimat
車の点検を行い、エンジンの異音を確認します。
（Melakukan pemeriksaan mobil, mengecek suara aneh dari mesin.）

## Catatan
ブレーキパッド yang sudah tipis harus segera diganti — jangan menunda meski pelanggan minta cepat.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='jidousha-seibi') AND term IN ('点検','オイル交換','ブレーキ','エンジン')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Servis Otomotif'), 'l2-perawatan-lanjut-dan-diagnosis', 'Perawatan lanjut & diagnosis kerusakan', '整備と故障診断', 'Ganti ban, inspeksi berkala (shaken), profesi mekanik, dan diagnosis kerusakan.',
   '## Ringkasan
整備士 (mekanik) juga menangani タイヤ交換 (ganti ban) dan menyiapkan kendaraan untuk 車検 (inspeksi berkala wajib di Jepang).

## Kosakata Kunci
- **タイヤ交換（タイヤこうかん）** — Ganti ban
- **車検（しゃけん）** — Inspeksi kendaraan berkala
- **整備士（せいびし）** — Mekanik/teknisi servis
- **故障診断（こしょうしんだん）** — Diagnosis kerusakan

## Contoh Kalimat
整備士として、機械で故障診断をしてから車検の準備をします。
（Sebagai mekanik, mendiagnosis kerusakan dengan alat sebelum menyiapkan inspeksi berkala.）

## Catatan
車検 punya jadwal hukum yang ketat di Jepang — keterlambatan bisa membuat kendaraan pelanggan tidak boleh dipakai di jalan.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='jidousha-seibi') AND term IN ('タイヤ交換','車検','整備士','故障診断')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── koukuu ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Ground Handling Penerbangan'), 'l1-bagasi-dan-boarding', 'Bagasi & prosedur boarding', '手荷物と搭乗手続き', 'Kosakata dasar penanganan bagasi, kargo, dan pembersihan kabin.',
   '## Ringkasan
Staf ground handling menangani 手荷物 (bagasi) dan 貨物 (kargo) penumpang, serta memandu 搭乗手続き (prosedur boarding).

## Kosakata Kunci
- **手荷物（てにもつ）** — Bagasi
- **搭乗手続き（とうじょうてつづき）** — Prosedur boarding
- **貨物（かもつ）** — Kargo
- **機内清掃（きないせいそう）** — Pembersihan kabin pesawat

## Contoh Kalimat
手荷物をベルトコンベアに載せてから、貨物を航空機に積み込みます。
（Meletakkan bagasi di ban berjalan, lalu memuat kargo ke pesawat.）

## Catatan
着陸後の機内清掃には batas waktu ketat (turnaround time) — kecepatan dan ketelitian sama pentingnya.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='koukuu') AND term IN ('手荷物','搭乗手続き','貨物','機内清掃')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Ground Handling Penerbangan'), 'l2-keselamatan-apron', 'Keselamatan di area apron', 'エプロンでの安全', 'Lampu pemandu pesawat, ground support, konfirmasi keselamatan, dan landasan pacu.',
   '## Ringkasan
Area apron dan 滑走路 (landasan pacu) punya aturan keselamatan ketat — hanya petugas berizin yang boleh masuk.

## Kosakata Kunci
- **誘導灯（ゆうどうとう）** — Lampu pemandu (marshalling)
- **地上支援（ちじょうしえん）** — Ground support
- **安全確認（あんぜんかくにん）** — Konfirmasi keselamatan
- **滑走路（かっそうろ）** — Landasan pacu

## Contoh Kalimat
誘導灯を使って飛行機を誘導する前に、出発前の安全確認をします。
（Melakukan konfirmasi keselamatan sebelum memandu pesawat dengan lampu pemandu.）

## Catatan
滑走路には許可なく入れません — pelanggaran area ini adalah salah satu insiden paling serius di bandara.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='koukuu') AND term IN ('誘導灯','地上支援','安全確認','滑走路')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── shukuhaku ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Layanan Perhotelan'), 'l1-front-desk-dan-housekeeping', 'Front desk & housekeeping dasar', 'フロントとハウスキーピング', 'Check-in, pembersihan kamar, reservasi, dan pelayanan tamu.',
   '## Ringkasan
Tamu bertemu staf pertama kali saat チェックイン, sementara housekeeping menjaga 客室清掃 (kebersihan kamar) tetap rapi.

## Kosakata Kunci
- **チェックイン** — Check-in
- **客室清掃（きゃくしつせいそう）** — Pembersihan kamar tamu
- **予約（よやく）** — Reservasi
- **接客（せっきゃく）** — Pelayanan tamu

## Contoh Kalimat
電話で予約を受け付けてから、丁寧な接客を心がけます。
（Menerima reservasi lewat telepon, lalu mengutamakan pelayanan yang sopan.）

## Catatan
客室清掃 dilakukan sesudah tamu check-out atau saat tamu keluar kamar — jangan pernah masuk kamar berpenghuni tanpa izin/pemberitahuan.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='shukuhaku') AND term IN ('チェックイン','客室清掃','予約','接客')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Layanan Perhotelan'), 'l2-layanan-dan-penanganan-keluhan', 'Layanan lanjutan & penanganan keluhan', 'サービスとクレーム対応', 'Merapikan tempat tidur, area sarapan, keluhan tamu, dan check-out.',
   '## Ringkasan
Selain kebersihan, staf juga menangani hal detail seperti ベッドメイキング dan situasi sulit seperti クレーム対応 (penanganan keluhan).

## Kosakata Kunci
- **ベッドメイキング** — Merapikan tempat tidur
- **朝食会場（ちょうしょくかいじょう）** — Area sarapan
- **クレーム対応（クレームたいおう）** — Penanganan keluhan
- **チェックアウト** — Check-out

## Contoh Kalimat
朝食会場のご案内をしてから、クレーム対応は丁寧に行います。
（Mengarahkan ke area sarapan, lalu menangani keluhan dengan sopan.）

## Catatan
Saat クレーム対応, dengarkan dulu sampai selesai sebelum menjelaskan — memotong pembicaraan tamu memperburuk situasi.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='shukuhaku') AND term IN ('ベッドメイキング','朝食会場','クレーム対応','チェックアウト')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── unten ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Transportasi Kendaraan'), 'l1-sebelum-berangkat', 'Prosedur sebelum berangkat', '出発前の手続き', 'SIM, manajemen operasi, absensi, dan mengemudi aman.',
   '## Ringkasan
Sebelum bertugas, pengemudi profesional menjalani 点呼 (absensi/pemeriksaan) dan wajib punya 運転免許 (SIM) sesuai jenis kendaraan.

## Kosakata Kunci
- **運転免許（うんてんめんきょ）** — SIM/lisensi mengemudi
- **運行管理（うんこうかんり）** — Manajemen operasi armada
- **点呼（てんこ）** — Absensi/pemeriksaan sebelum kerja
- **安全運転（あんぜんうんてん）** — Mengemudi aman

## Contoh Kalimat
出発前に点呼を受けてから、常に安全運転を心がけます。
（Menjalani pemeriksaan sebelum berangkat, lalu selalu mengutamakan mengemudi aman.）

## Catatan
二種運転免許 (SIM kelas dua) diperlukan untuk mengangkut penumpang berbayar — beda dengan SIM pribadi biasa.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='unten') AND term IN ('運転免許','運行管理','点呼','安全運転')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Transportasi Kendaraan'), 'l2-selama-bertugas', 'Selama bertugas mengangkut penumpang', '乗務中の業務', 'Penumpang, tarif, rute, dan pemeriksaan kendaraan.',
   '## Ringkasan
Selama bertugas, pengemudi menjaga keselamatan 乗客 (penumpang), mengecek 運賃 (tarif), dan memilih 経路 (rute) terbaik.

## Kosakata Kunci
- **乗客（じょうきゃく）** — Penumpang
- **運賃（うんちん）** — Tarif angkutan
- **経路（けいろ）** — Rute perjalanan
- **車両点検（しゃりょうてんけん）** — Pemeriksaan kendaraan

## Contoh Kalimat
乗務前に車両点検をしてから、乗客の安全を確認します。
（Memeriksa kendaraan sebelum bertugas, lalu memastikan keselamatan penumpang.）

## Catatan
車両点検 harian bukan formalitas — ban, rem, dan lampu yang tidak dicek bisa jadi penyebab kecelakaan fatal.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='unten') AND term IN ('乗客','運賃','経路','車両点検')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── tetsudou ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Operasional Kereta Api'), 'l1-stasiun-dan-peron', 'Stasiun & peron', '駅とホーム', 'Gerbang tiket, peron, keberangkatan, dan perawatan sarana.',
   '## Ringkasan
Penumpang masuk lewat 改札 (gerbang tiket) menuju ホーム (peron) sebelum kereta 発車 (berangkat) tepat waktu.

## Kosakata Kunci
- **改札（かいさつ）** — Gerbang tiket
- **ホーム** — Peron stasiun
- **発車（はっしゃ）** — Keberangkatan (kereta)
- **保守点検（ほしゅてんけん）** — Perawatan & inspeksi sarana

## Contoh Kalimat
改札でチケットを確認してから、ホームで安全確認をします。
（Memeriksa tiket di gerbang tiket, lalu cek keselamatan di peron.）

## Catatan
Ketepatan waktu 発車 adalah standar budaya kerja perkeretaapian Jepang — keterlambatan bahkan hitungan detik dianggap serius.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='tetsudou') AND term IN ('改札','ホーム','発車','保守点検')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Operasional Kereta Api'), 'l2-keselamatan-perlintasan', 'Keselamatan & keterlambatan', '踏切と遅延対応', 'Keterlambatan, mesin tiket, perlintasan sebidang, dan tugas kondektur.',
   '## Ringkasan
Saat terjadi 遅延 (keterlambatan), staf tetap harus menjaga keselamatan di 踏切 (perlintasan sebidang) dan memberi info yang jelas.

## Kosakata Kunci
- **遅延（ちえん）** — Keterlambatan
- **券売機（けんばいき）** — Mesin tiket otomatis
- **踏切（ふみきり）** — Perlintasan sebidang
- **車掌（しゃしょう）** — Kondektur

## Contoh Kalimat
大雨により遅延が発生したので、車掌がアナウンスをします。
（Terjadi keterlambatan karena hujan lebat, kondektur melakukan pengumuman.）

## Catatan
踏切の安全確認 dilakukan berkali-kali — area ini adalah salah satu titik kecelakaan paling umum di jalur kereta.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='tetsudou') AND term IN ('遅延','券売機','踏切','車掌')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── nougyou ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Pertanian'), 'l1-tanam-dan-rawat', 'Menanam dan merawat tanaman', '種まきと管理', 'Panen, penyemaian, pemupukan, dan penyemprotan pestisida.',
   '## Ringkasan
Siklus tanam dimulai dari 種まき (penyemaian), dirawat dengan 施肥 (pemupukan), hingga 収穫 (panen).

## Kosakata Kunci
- **収穫（しゅうかく）** — Panen
- **種まき（たねまき）** — Penyemaian benih
- **施肥（せひ）** — Pemupukan
- **農薬散布（のうやくさんぷ）** — Penyemprotan pestisida

## Contoh Kalimat
畑に種まきをしてから、定期的に施肥を行います。
（Menyemai benih di ladang, lalu memupuk secara berkala.）

## Catatan
農薬散布の前に防護服を必ず着ます — paparan pestisida tanpa pelindung berisiko kesehatan serius.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='nougyou') AND term IN ('収穫','種まき','施肥','農薬散布')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Pertanian'), 'l2-fasilitas-dan-alat', 'Fasilitas & alat pertanian', '施設と農機具', 'Rumah kaca, sortasi, irigasi, dan traktor.',
   '## Ringkasan
Banyak pertanian modern memakai ビニールハウス (rumah kaca) dan トラクター (traktor) untuk efisiensi kerja.

## Kosakata Kunci
- **ビニールハウス** — Rumah kaca (greenhouse)
- **選別（せんべつ）** — Sortasi hasil panen
- **灌水（かんすい）** — Penyiraman/irigasi
- **トラクター** — Traktor

## Contoh Kalimat
朝と夕方に灌水をしてから、サイズごとに選別します。
（Menyiram pagi dan sore, lalu menyortir berdasarkan ukuran.）

## Catatan
トラクター hanya boleh dioperasikan setelah pelatihan resmi — banyak kecelakaan pertanian melibatkan alat berat ini.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='nougyou') AND term IN ('ビニールハウス','選別','灌水','トラクター')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── gyogyou ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Perikanan'), 'l1-melaut-dan-menangkap', 'Melaut dan menangkap ikan', '出港と漁', 'Kapal ikan, jaring, budidaya, dan pendaratan hasil tangkapan.',
   '## Ringkasan
Awak 漁船 (kapal ikan) menggunakan 網 (jaring) untuk menangkap ikan, lalu melakukan 水揚げ (pendaratan hasil tangkapan) di pelabuhan.

## Kosakata Kunci
- **漁船（ぎょせん）** — Kapal ikan
- **網（あみ）** — Jaring
- **養殖（ようしょく）** — Budidaya (akuakultur)
- **水揚げ（みずあげ）** — Pendaratan hasil tangkapan

## Contoh Kalimat
漁船に乗って出港し、網を海に投げ入れます。
（Naik kapal ikan lalu berangkat berlayar, melempar jaring ke laut.）

## Catatan
養殖 berbeda dari penangkapan liar — ikan dibudidayakan di kolam/keramba dengan jadwal panen terkontrol.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='gyogyou') AND term IN ('漁船','網','養殖','水揚げ')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Perikanan'), 'l2-keselamatan-di-laut', 'Keselamatan di atas kapal', '船上の安全', 'Pengemasan es, jaket pelampung, pemeriksaan cuaca, dan sortasi hasil tangkapan.',
   '## Ringkasan
Keselamatan di laut sangat bergantung pada 天候確認 (cek cuaca) sebelum berangkat dan memakai 救命胴衣 (jaket pelampung) selalu.

## Kosakata Kunci
- **氷詰め（こおりづめ）** — Pengemasan dengan es
- **救命胴衣（きゅうめいどうい）** — Jaket pelampung
- **天候確認（てんこうかくにん）** — Pemeriksaan cuaca
- **選別作業（せんべつさぎょう）** — Sortasi hasil tangkapan

## Contoh Kalimat
出港前に天候確認をしてから、乗船中は救命胴衣を着用します。
（Memeriksa cuaca sebelum berangkat, lalu memakai jaket pelampung selama di kapal.）

## Catatan
魚を氷詰めにして保存するタイミングが遅れると鮮度が落ちる — kesegaran ikan sangat bergantung pada kecepatan pengemasan es.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='gyogyou') AND term IN ('氷詰め','救命胴衣','天候確認','選別作業')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── shokuhin ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Manufaktur Makanan'), 'l1-higiene-dan-proses-dasar', 'Higiene & proses produksi dasar', '衛生管理と基本工程', 'Manajemen higiene, penimbangan, sterilisasi, dan pengemasan.',
   '## Ringkasan
Pabrik makanan sangat menekankan 衛生管理 (manajemen higiene) di setiap tahap: 計量、殺菌、hingga 包装.

## Kosakata Kunci
- **衛生管理（えいせいかんり）** — Manajemen higiene
- **計量（けいりょう）** — Penimbangan/pengukuran
- **殺菌（さっきん）** — Sterilisasi
- **包装（ほうそう）** — Pengemasan

## Contoh Kalimat
材料を正確に計量してから、加熱して殺菌を行います。
（Menimbang bahan dengan akurat, lalu mensterilkan dengan pemanasan.）

## Catatan
食品工場では衛生管理が最優先 — kelalaian higiene bisa berujung penarikan produk (recall) skala besar.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='shokuhin') AND term IN ('衛生管理','計量','殺菌','包装')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Manufaktur Makanan'), 'l2-pencegahan-kontaminasi', 'Pencegahan kontaminasi & penyimpanan', '異物混入防止と保存', 'Kontaminasi benda asing, tanggal kedaluwarsa, cuci tangan, dan penyimpanan beku.',
   '## Ringkasan
Salah satu risiko terbesar di pabrik makanan adalah 異物混入 (kontaminasi benda asing) — dicegah lewat kedisiplinan 手洗い消毒.

## Kosakata Kunci
- **異物混入（いぶつこんにゅう）** — Kontaminasi benda asing
- **賞味期限（しょうみきげん）** — Tanggal kedaluwarsa
- **手洗い消毒（てあらいしょうどく）** — Cuci tangan & disinfeksi
- **冷凍保存（れいとうほぞん）** — Penyimpanan beku

## Contoh Kalimat
作業前に手洗い消毒をして、異物混入を防ぎます。
（Cuci tangan dan disinfeksi sebelum bekerja, mencegah kontaminasi benda asing.）

## Catatan
賞味期限 harus diperiksa dan dicantumkan dengan benar di setiap kemasan — kesalahan label adalah pelanggaran hukum pangan.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='shokuhin') AND term IN ('異物混入','賞味期限','手洗い消毒','冷凍保存')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- ── gaishoku ──
INSERT INTO ssw_lessons (module_id, slug, title, title_jp, description, body_md, vocab_ids, sort) VALUES
  ((SELECT id FROM ssw_modules WHERE title='Dasar Layanan Restoran'), 'l1-dapur-dasar', 'Dasar kerja dapur', '調理場の基本', 'Menerima pesanan, menata hidangan, memasak, dan mencuci peralatan.',
   '## Ringkasan
Alur dasar restoran: menerima 注文 (pesanan), 調理 (memasak) sesuai resep, lalu 盛り付け (menata hidangan) sebelum disajikan.

## Kosakata Kunci
- **注文（ちゅうもん）** — Pesanan
- **盛り付け（もりつけ）** — Penataan hidangan
- **調理（ちょうり）** — Memasak
- **食器洗浄（しょっきせんじょう）** — Pencucian peralatan makan

## Contoh Kalimat
お客様の注文を取ってから、レシピ通りに調理します。
（Menerima pesanan pelanggan, lalu memasak sesuai resep.）

## Catatan
盛り付け memengaruhi kesan pertama pelanggan terhadap hidangan — kerapian dianggap sama pentingnya dengan rasa.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='gaishoku') AND term IN ('注文','盛り付け','調理','食器洗浄')), 1),
  ((SELECT id FROM ssw_modules WHERE title='Dasar Layanan Restoran'), 'l2-layanan-pelanggan', 'Layanan pelanggan di restoran', '接客サービス', 'Penanganan alergi, kasir, penataan meja, dan persiapan bahan.',
   '## Ringkasan
Selain memasak, staf restoran juga menangani hal sensitif seperti アレルギー対応 (penanganan alergi) dan persiapan harian (仕込み).

## Kosakata Kunci
- **アレルギー対応（アレルギーたいおう）** — Penanganan alergi makanan
- **レジ会計（レジかいけい）** — Pembayaran di kasir
- **テーブルセッティング** — Penataan meja
- **仕込み（しこみ）** — Persiapan bahan sebelum buka

## Contoh Kalimat
開店前に仕込みをしてから、テーブルセッティングを整えます。
（Menyiapkan bahan sebelum buka, lalu merapikan penataan meja.）

## Catatan
アレルギー対応のメニュー harus dicatat dan dikomunikasikan akurat ke dapur — kesalahan di sini bisa berakibat fatal bagi pelanggan.',
   ARRAY(SELECT id FROM ssw_vocabulary WHERE category_id=(SELECT id FROM ssw_categories WHERE slug='gaishoku') AND term IN ('アレルギー対応','レジ会計','テーブルセッティング','仕込み')), 2)
ON CONFLICT (module_id, slug) DO NOTHING;

-- Reminder bila Run ulang schema tidak dilakukan setelah update ini:
-- lihat .github/workflows/schema-reminder.yml — pengingat otomatis di PR.
