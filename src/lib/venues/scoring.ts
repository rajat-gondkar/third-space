import type { SupabaseClient } from "@supabase/supabase-js";
import type { Pool } from "pg";

type ActivityRow = {
  id: string;
  lat: number;
  lng: number;
};

type VenueScoreRow = {
  id: string;
  lat: string | number;
  lng: string | number;
  osm_tags: Record<string, string> | null;
  tag_vote_count: string | number | null;
  avg_rating: string | number | null;
  rating_count: string | number | null;
};

export type ScoreRefreshResult = {
  updated: number;
};

function distanceMetres(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
) {
  const earthRadius = 6371000;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const deltaLat = ((to.lat - from.lat) * Math.PI) / 180;
  const deltaLng = ((to.lng - from.lng) * Math.PI) / 180;
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function osmQualityScore(tags: Record<string, string>) {
  let points = 0;

  if (tags.opening_hours) points += 1;
  if (tags.phone || tags["contact:phone"] || tags.website || tags["contact:website"]) {
    points += 1;
  }
  if (tags.wheelchair === "yes") points += 0.5;
  if (Object.keys(tags).length > 3) points += 1;

  return Math.min(points / 3.5, 1);
}

export function activityDensityScore(count: number) {
  return Math.min(count / 5, 1);
}

export function tagEngagementScore(votes: number) {
  return Math.min(votes / 20, 1);
}

export function ratingScore(avgRating: number, ratingCount: number) {
  if (ratingCount === 0) return 0;
  // Weighted so venues with few ratings don't get max score.
  // A perfect 5.0 with 10+ ratings = ~1.0.  
  const confidence = Math.min(ratingCount / 10, 1);
  return (avgRating / 5) * confidence;
}

export function combinedPopularityScore({
  osmQuality,
  activityDensity,
  tagEngagement,
  rating,
}: {
  osmQuality: number;
  activityDensity: number;
  tagEngagement: number;
  rating: number;
}) {
  return Number(
    (
      (osmQuality * 0.25 + activityDensity * 0.35 + tagEngagement * 0.25 + rating * 0.15) *
      10
    ).toFixed(2),
  );
}

async function getRecentActivities(supabase: SupabaseClient) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("activities")
    .select("id,lat,lng")
    .gte("start_time", since)
    .limit(1000);

  if (error) throw error;

  return (data as ActivityRow[] | null) ?? [];
}

export async function refreshVenueScores({
  pool,
  supabase,
}: {
  pool: Pool;
  supabase: SupabaseClient;
}): Promise<ScoreRefreshResult> {
  const [venuesResult, activities] = await Promise.all([
    pool.query<VenueScoreRow>(
      `SELECT
        v.id,
        v.osm_tags,
        ST_Y(v.location::geometry) AS lat,
        ST_X(v.location::geometry) AS lng,
        COALESCE(SUM(vt.count), 0) AS tag_vote_count,
        v.avg_rating,
        v.rating_count
      FROM venues v
      LEFT JOIN venue_tags vt ON vt.venue_id = v.id
      GROUP BY v.id`,
    ),
    getRecentActivities(supabase),
  ]);

  for (const venue of venuesResult.rows) {
    const venueCoords = {
      lat: Number(venue.lat),
      lng: Number(venue.lng),
    };
    const nearbyActivityCount = activities.filter(
      (activity) =>
        distanceMetres(venueCoords, {
          lat: activity.lat,
          lng: activity.lng,
        }) <= 100,
    ).length;
    const score = combinedPopularityScore({
      osmQuality: osmQualityScore(venue.osm_tags ?? {}),
      activityDensity: activityDensityScore(nearbyActivityCount),
      tagEngagement: tagEngagementScore(Number(venue.tag_vote_count ?? 0)),
      rating: ratingScore(
        Number(venue.avg_rating ?? 0),
        Number(venue.rating_count ?? 0),
      ),
    });

    await pool.query(
      `UPDATE venues
       SET popularity_score = $2,
           score_updated_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [venue.id, score],
    );
  }

  return { updated: venuesResult.rowCount ?? venuesResult.rows.length };
}
