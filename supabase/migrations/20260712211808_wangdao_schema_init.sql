/*
# Wangdao Platform — Initial Schema

## Overview
Full schema for the Wangdao story-sharing literary platform. Multi-user app with sign-in.
Three account tiers: Reader, Author, Admin. Authors need a single-use registration code to sign up.

## Tables
1. `profiles` — extends auth.users with username, role (reader/author/admin), avatar_url, bio.
2. `registration_codes` — single-use tokens author must present at sign-up. Has code (unique), used (bool), used_by, created_at, used_at.
3. `stories` — title, description, tags (text[]), cover_image_url, status, author_id. Author-owned.
4. `chapters` — belongs to story. title, content, status (draft/published), chapter_number, views count. Author-owned via parent story.
5. `characters` — character profiles linked to a story. name, role/faction, bio, image_url. Author-owned via parent story.
6. `favorites` — (user_id, story_id) unique pair; a reader's saved-to-library.
7. `chapter_likes` — (user_id, chapter_id) unique pair; a reader's like on a chapter.
8. `chapter_views` — append-only log of chapter opens by user; feeds the view counter on chapters.
9. `comments` — on a chapter. user_id, content, created_at, is_flagged, flag_reason.
10. `reports` — a report on a comment. reporter_id, comment_id, reason, status (pending/approved/deleted), created_at.

## Security (RLS)
- Public-readable (anon + authenticated) SELECT: stories (published only via published-chapter gating is app-enforced; we expose published stories), characters, published chapters, comments, profiles (for usernames/avatars), favorites+likes counts.
- Authenticated-only writes for favorites, likes, views, comments, reports.
- Authors own their stories/chapters/characters and can CRUD them.
- Admins (role = 'admin' in profiles) manage registration_codes and moderate reports/comments via SECURITY DEFINER RPCs (bypass RLS safely with role checks).

## Notes
- `profiles.user_id` defaults to `auth.uid()` and references auth.users.
- `chapters.views` denormalized counter kept in sync by `chapter_views` insert trigger for accurate per-open counting.
- `stories.total_views` and `stories.total_likes` are denormalized rollups maintained by triggers for cheap sorting on the home page.
- `handle_new_user` trigger auto-creates a profile row when a user signs up; role defaults to 'reader' unless an admin sets otherwise.
- Idempotent: uses IF NOT EXISTS for tables; drops policies before re-creating.
*/

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  role text NOT NULL DEFAULT 'reader' CHECK (role IN ('reader','author','admin')),
  avatar_url text,
  bio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can read profile display info (usernames, avatars) for community features
DROP POLICY IF EXISTS "profiles_select_all" ON profiles;
CREATE POLICY "profiles_select_all" ON profiles FOR SELECT
  TO anon, authenticated USING (true);

-- Owner can update own profile
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Inserts handled by trigger (SECURITY DEFINER), but allow owner insert too
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- REGISTRATION CODES (author single-use tokens)
-- ============================================================
CREATE TABLE IF NOT EXISTS registration_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  used boolean NOT NULL DEFAULT false,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
ALTER TABLE registration_codes ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write codes directly. App validates via RPC.
DROP POLICY IF EXISTS "codes_select_admin" ON registration_codes;
CREATE POLICY "codes_select_admin" ON registration_codes FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "codes_insert_admin" ON registration_codes;
CREATE POLICY "codes_insert_admin" ON registration_codes FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );
DROP POLICY IF EXISTS "codes_update_admin" ON registration_codes;
CREATE POLICY "codes_update_admin" ON registration_codes FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- STORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  cover_image_url text,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
  total_views integer NOT NULL DEFAULT 0,
  total_likes integer NOT NULL DEFAULT 0,
  total_favorites integer NOT NULL DEFAULT 0,
  latest_chapter_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS stories_total_views_idx ON stories(total_views DESC);
CREATE INDEX IF NOT EXISTS stories_total_likes_idx ON stories(total_likes DESC);
CREATE INDEX IF NOT EXISTS stories_latest_chapter_idx ON stories(latest_chapter_at DESC);
CREATE INDEX IF NOT EXISTS stories_tags_gin_idx ON stories USING gin(tags);

-- Public can read published stories; authors read their own (incl. drafts)
DROP POLICY IF EXISTS "stories_select_public_own" ON stories;
CREATE POLICY "stories_select_public_own" ON stories FOR SELECT
  TO anon, authenticated USING (status = 'published' OR author_id = auth.uid());

DROP POLICY IF EXISTS "stories_insert_own" ON stories;
CREATE POLICY "stories_insert_own" ON stories FOR INSERT
  TO authenticated WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "stories_update_own" ON stories;
CREATE POLICY "stories_update_own" ON stories FOR UPDATE
  TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "stories_delete_own" ON stories;
CREATE POLICY "stories_delete_own" ON stories FOR DELETE
  TO authenticated USING (author_id = auth.uid());

-- ============================================================
-- CHAPTERS
-- ============================================================
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  chapter_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  views integer NOT NULL DEFAULT 0,
  likes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id, chapter_number)
);
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS chapters_story_idx ON chapters(story_id, chapter_number);
CREATE INDEX IF NOT EXISTS chapters_published_idx ON chapters(story_id) WHERE status = 'published';

-- Public can read published chapters; author reads own drafts
DROP POLICY IF EXISTS "chapters_select_public_own" ON chapters;
CREATE POLICY "chapters_select_public_own" ON chapters FOR SELECT
  TO anon, authenticated USING (status = 'published' OR author_id = auth.uid());

DROP POLICY IF EXISTS "chapters_insert_own" ON chapters;
CREATE POLICY "chapters_insert_own" ON chapters FOR INSERT
  TO authenticated WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "chapters_update_own" ON chapters;
CREATE POLICY "chapters_update_own" ON chapters FOR UPDATE
  TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "chapters_delete_own" ON chapters;
CREATE POLICY "chapters_delete_own" ON chapters FOR DELETE
  TO authenticated USING (author_id = auth.uid());

-- ============================================================
-- CHARACTERS (chara-design)
-- ============================================================
CREATE TABLE IF NOT EXISTS characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  bio text,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS characters_story_idx ON characters(story_id);

-- Public can read characters (registered readers can view full details; app gates anon)
DROP POLICY IF EXISTS "characters_select_all" ON characters;
CREATE POLICY "characters_select_all" ON characters FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "characters_insert_own" ON characters;
CREATE POLICY "characters_insert_own" ON characters FOR INSERT
  TO authenticated WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "characters_update_own" ON characters;
CREATE POLICY "characters_update_own" ON characters FOR UPDATE
  TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

DROP POLICY IF EXISTS "characters_delete_own" ON characters;
CREATE POLICY "characters_delete_own" ON characters FOR DELETE
  TO authenticated USING (author_id = auth.uid());

-- ============================================================
-- FAVORITES (save to library)
-- ============================================================
CREATE TABLE IF NOT EXISTS favorites (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, story_id)
);
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- A user can read their own favorites; counts are public via aggregate (RLS allows count)
DROP POLICY IF EXISTS "favorites_select_own" ON favorites;
CREATE POLICY "favorites_select_own" ON favorites FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_insert_own" ON favorites;
CREATE POLICY "favorites_insert_own" ON favorites FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "favorites_delete_own" ON favorites;
CREATE POLICY "favorites_delete_own" ON favorites FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- CHAPTER LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS chapter_likes (
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, chapter_id)
);
ALTER TABLE chapter_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "likes_select_own" ON chapter_likes;
CREATE POLICY "likes_select_own" ON chapter_likes FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "likes_insert_own" ON chapter_likes;
CREATE POLICY "likes_insert_own" ON chapter_likes FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "likes_delete_own" ON chapter_likes;
CREATE POLICY "likes_delete_own" ON chapter_likes FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- CHAPTER VIEWS (append-only log -> drives counter)
-- ============================================================
CREATE TABLE IF NOT EXISTS chapter_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE chapter_views ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS chapter_views_chapter_idx ON chapter_views(chapter_id);

-- Any authenticated reader can record a view for themselves
DROP POLICY IF EXISTS "views_insert_own" ON chapter_views;
CREATE POLICY "views_insert_own" ON chapter_views FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "views_select_own" ON chapter_views;
CREATE POLICY "views_select_own" ON chapter_views FOR SELECT
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS comments_chapter_idx ON comments(chapter_id, created_at);
CREATE INDEX IF NOT EXISTS comments_flagged_idx ON comments(id) WHERE is_flagged = true;

-- Comments are public-readable (so readers can see discussion)
DROP POLICY IF EXISTS "comments_select_all" ON comments;
CREATE POLICY "comments_select_all" ON comments FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own" ON comments FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- Owner can delete own comment; admins via RPC
DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own" ON comments FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ============================================================
-- REPORTS (flagged comments)
-- ============================================================
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','deleted')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reports_pending_idx ON reports(id) WHERE status = 'pending';

-- A reporter can see their own reports; admins via RPC
DROP POLICY IF EXISTS "reports_select_own_admin" ON reports;
CREATE POLICY "reports_select_own_admin" ON reports FOR SELECT
  TO authenticated USING (
    reporter_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.user_id = auth.uid() AND p.role = 'admin')
  );

DROP POLICY IF EXISTS "reports_insert_own" ON reports;
CREATE POLICY "reports_insert_own" ON reports FOR INSERT
  TO authenticated WITH CHECK (reporter_id = auth.uid());

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'reader')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Increment chapter.views and story.total_views on chapter_views insert
CREATE OR REPLACE FUNCTION public.on_chapter_viewed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE chapters SET views = views + 1, updated_at = now() WHERE id = NEW.chapter_id;
  UPDATE stories SET total_views = total_views + 1, updated_at = now()
    WHERE id = (SELECT story_id FROM chapters WHERE id = NEW.chapter_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_chapter_viewed ON chapter_views;
CREATE TRIGGER trg_chapter_viewed
  AFTER INSERT ON chapter_views
  FOR EACH ROW EXECUTE FUNCTION public.on_chapter_viewed();

-- Update story.latest_chapter_at when a chapter is inserted/updated to published
CREATE OR REPLACE FUNCTION public.on_chapter_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sid uuid;
BEGIN
  sid := COALESCE(NEW.story_id, OLD.story_id);
  IF sid IS NOT NULL THEN
    UPDATE stories s
      SET latest_chapter_at = (
        SELECT MAX(updated_at) FROM chapters c
        WHERE c.story_id = sid AND c.status = 'published'
      ),
      updated_at = now()
      WHERE s.id = sid;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_chapter_change ON chapters;
CREATE TRIGGER trg_chapter_change
  AFTER INSERT OR UPDATE OF status, updated_at ON chapters
  FOR EACH ROW EXECUTE FUNCTION public.on_chapter_change();

-- Sync chapter.likes and story.total_likes on chapter_likes insert/delete
CREATE OR REPLACE FUNCTION public.on_chapter_like_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  cid uuid;
  sid uuid;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    cid := NEW.chapter_id;
    UPDATE chapters SET likes = likes + 1 WHERE id = cid;
    SELECT story_id INTO sid FROM chapters WHERE id = cid;
    UPDATE stories SET total_likes = total_likes + 1 WHERE id = sid;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    cid := OLD.chapter_id;
    UPDATE chapters SET likes = GREATEST(likes - 1, 0) WHERE id = cid;
    SELECT story_id INTO sid FROM chapters WHERE id = cid;
    UPDATE stories SET total_likes = GREATEST(total_likes - 1, 0) WHERE id = sid;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_chapter_like_insert ON chapter_likes;
CREATE TRIGGER trg_chapter_like_insert
  AFTER INSERT ON chapter_likes
  FOR EACH ROW EXECUTE FUNCTION public.on_chapter_like_change();

DROP TRIGGER IF EXISTS trg_chapter_like_delete ON chapter_likes;
CREATE TRIGGER trg_chapter_like_delete
  AFTER DELETE ON chapter_likes
  FOR EACH ROW EXECUTE FUNCTION public.on_chapter_like_change();

-- Sync story.total_favorites on favorites insert/delete
CREATE OR REPLACE FUNCTION public.on_favorite_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE stories SET total_favorites = total_favorites + 1 WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE stories SET total_favorites = GREATEST(total_favorites - 1, 0) WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_favorite_insert ON favorites;
CREATE TRIGGER trg_favorite_insert
  AFTER INSERT ON favorites
  FOR EACH ROW EXECUTE FUNCTION public.on_favorite_change();

DROP TRIGGER IF EXISTS trg_favorite_delete ON favorites;
CREATE TRIGGER trg_favorite_delete
  AFTER DELETE ON favorites
  FOR EACH ROW EXECUTE FUNCTION public.on_favorite_change();

-- ============================================================
-- RPCs (SECURITY DEFINER) — code validation, admin ops, moderation
-- ============================================================

-- Validate author registration code (single-use). Returns the code row id if valid.
CREATE OR REPLACE FUNCTION public.validate_author_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec registration_codes%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM registration_codes WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;
  IF rec.used THEN
    RAISE EXCEPTION 'CODE_ALREADY_USED';
  END IF;
  RETURN rec.id;
END;
$$;

-- Consume a code: mark used by the calling user. Called after successful author signup.
CREATE OR REPLACE FUNCTION public.consume_author_code(p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  rec registration_codes%ROWTYPE;
BEGIN
  SELECT * INTO rec FROM registration_codes WHERE code = p_code;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_CODE';
  END IF;
  IF rec.used THEN
    RAISE EXCEPTION 'CODE_ALREADY_USED';
  END IF;
  UPDATE registration_codes
    SET used = true, used_by = auth.uid(), used_at = now()
    WHERE id = rec.id;
  -- Promote the caller's profile to author
  UPDATE profiles SET role = 'author' WHERE user_id = auth.uid() AND role = 'reader';
END;
$$;

-- Generate N new single-use codes (admin only)
CREATE OR REPLACE FUNCTION public.admin_generate_codes(p_count integer DEFAULT 1)
RETURNS TABLE(code text, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  i integer;
  new_code text;
BEGIN
  SELECT EXISTS(SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') INTO is_admin;
  IF NOT is_admin THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  FOR i IN 1..GREATEST(1, LEAST(p_count, 50)) LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 4))
                || '-' || upper(substring(md5(random()::text) from 1 for 4))
                || '-' || upper(substring(md5(random()::text) from 1 for 4));
    INSERT INTO registration_codes (code) VALUES (new_code);
    code := new_code;
    created_at := now();
    RETURN NEXT;
  END LOOP;
END;
$$;

-- List all codes (admin only)
CREATE OR REPLACE FUNCTION public.admin_list_codes()
RETURNS TABLE(id uuid, code text, used boolean, used_by uuid, created_at timestamptz, used_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  RETURN QUERY SELECT * FROM registration_codes ORDER BY created_at DESC;
END;
$$;

-- List reported comments (admin only): flagged or reported
CREATE OR REPLACE FUNCTION public.admin_list_reported_comments()
RETURNS TABLE(
  comment_id uuid, chapter_id uuid, content text, created_at timestamptz,
  author_user_id uuid, author_username text, author_avatar text,
  reasons text, report_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  RETURN QUERY
    SELECT
      c.id AS comment_id, c.chapter_id, c.content, c.created_at,
      c.user_id AS author_user_id,
      p.username AS author_username,
      p.avatar_url AS author_avatar,
      STRING_AGG(DISTINCT r.reason, ' | ') AS reasons,
      COUNT(r.id) AS report_count
    FROM comments c
    JOIN reports r ON r.comment_id = c.id AND r.status = 'pending'
    LEFT JOIN profiles p ON p.user_id = c.user_id
    GROUP BY c.id, c.chapter_id, c.content, c.created_at, c.user_id, p.username, p.avatar_url
    ORDER BY report_count DESC, c.created_at DESC;
END;
$$;

-- Approve a comment: clear flag + mark reports approved (admin only)
CREATE OR REPLACE FUNCTION public.admin_approve_comment(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  UPDATE comments SET is_flagged = false, flag_reason = null WHERE id = p_comment_id;
  UPDATE reports SET status = 'approved' WHERE comment_id = p_comment_id;
END;
$$;

-- Delete a comment (admin only): marks reports deleted and removes comment
CREATE OR REPLACE FUNCTION public.admin_delete_comment(p_comment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'NOT_ADMIN';
  END IF;
  UPDATE reports SET status = 'deleted' WHERE comment_id = p_comment_id;
  DELETE FROM comments WHERE id = p_comment_id;
END;
$$;

-- Grant granular usage to anon + authenticated on the public RPCs
GRANT EXECUTE ON FUNCTION public.validate_author_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_author_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_generate_codes(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_codes() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_reported_comments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_comment(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_comment(uuid) TO authenticated;
