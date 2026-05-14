export const ACTIVITY_CATEGORIES = [
  "sport",
  "study",
  "food",
  "hobby",
  "other",
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const CATEGORY_EMOJI: Record<ActivityCategory, string> = {
  sport: "⚽️",
  study: "📚",
  food: "☕️",
  hobby: "🎨",
  other: "✨",
};

export const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  sport: "Sport",
  study: "Study",
  food: "Food & Coffee",
  hobby: "Hobby",
  other: "Other",
};

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  age: number | null;
  gender: string | null;
  college_email: string | null;
  college_email_verified: boolean;
  college_name: string | null;
  onboarding_complete: boolean;
  created_at: string;
};

export type Participant = {
  activity_id: string;
  user_id: string;
  display_name: string | null;
  joined_at: string;
};

export type ParticipantWithProfile = Participant & {
  profile: Pick<Profile, "email" | "display_name" | "avatar_url"> | null;
};

export type Activity = {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  category: ActivityCategory;
  lat: number;
  lng: number;
  location_name: string | null;
  start_time: string;
  max_participants: number;
  created_at: string;
};

export type ActivityWithCount = Activity & {
  participant_count: number;
  host?: Pick<Profile, "id" | "display_name" | "avatar_url"> | null;
};

export type JoinResult = "ok" | "full" | "not_found" | "already_joined";
