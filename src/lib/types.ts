export type Role = 'reader' | 'author' | 'admin';

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  role: Role;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
}

export interface Story {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  tags: string[];
  cover_image_url: string | null;
  status: 'draft' | 'published';
  total_views: number;
  total_likes: number;
  total_favorites: number;
  latest_chapter_at: string | null;
  created_at: string;
  updated_at: string;
  author?: Profile;
}

export interface Chapter {
  id: string;
  story_id: string;
  author_id: string;
  title: string;
  content: string;
  chapter_number: number;
  status: 'draft' | 'published';
  views: number;
  likes: number;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  story_id: string;
  author_id: string;
  name: string;
  role: string | null;
  bio: string | null;
  image_url: string | null;
  created_at: string;
}

export interface Comment {
  id: string;
  chapter_id: string;
  user_id: string;
  content: string;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  author?: Profile;
}

export interface RegistrationCode {
  id: string;
  code: string;
  used: boolean;
  used_by: string | null;
  created_at: string;
  used_at: string | null;
}

export interface ReportedComment {
  comment_id: string;
  chapter_id: string;
  content: string;
  created_at: string;
  author_user_id: string;
  author_username: string | null;
  author_avatar: string | null;
  reasons: string | null;
  report_count: number;
}
