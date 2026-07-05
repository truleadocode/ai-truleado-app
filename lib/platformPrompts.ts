// Shared Gemini prompts for reading creator analytics screenshots.
// Used by both app/api/parse-screenshots and app/api/reparse-screenshots.
// Keep the platform key set in sync with ALL_PLATFORMS in
// app/onboarding/OnboardingClient.tsx and app/profile/edit/ProfileEditClient.tsx.

const PLATFORM_PROMPTS: Record<string, string> = {
  instagram: `You are reading Instagram screenshots from a creator's account. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Total followers count
- Total following count
- Total posts count
- Average likes per post (look at recent post metrics)
- Average comments per post
- Average views per reel or video
- Engagement rate (if shown, or calculate: (likes + comments) / followers * 100)
- Audience age breakdown — report the DOMINANT age range (e.g. "25-34")
- Audience gender split — report both percentages (e.g. "68.5% male, 31.5% female")
- Top countries where followers are from — extract country names as an array
- Top cities where followers are from — extract city names as an array

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear in the screenshots.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": number or null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": ["City1", "City2"] or null,
  "audience_age_range": "e.g. 25-34" or null,
  "audience_gender_split": "e.g. 68.5% male, 31.5% female" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,

  tiktok: `You are reading TikTok screenshots from a creator's account. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Total followers count
- Total following count
- Total videos/posts count
- Average video views
- Average likes per video
- Average comments per video
- Engagement rate (if shown, or calculate from available data)
- Audience age breakdown — report the DOMINANT age range
- Audience gender split — report both percentages (e.g. "55% female, 45% male")
- Top countries or territories where followers are from — extract as an array
- TikTok rarely shows cities — set audience_top_cities to null unless clearly visible

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": number or null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": null,
  "audience_age_range": "e.g. 18-24" or null,
  "audience_gender_split": "e.g. 55% female, 45% male" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,

  youtube: `You are reading YouTube Studio screenshots from a creator's channel. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Subscriber count (= followers)
- Total videos count (= total_posts)
- Average video views
- Average likes per video
- Average comments per video
- Engagement rate (if shown)
- Audience age breakdown — report the DOMINANT age range
- Audience gender split — report both percentages
- Top countries where viewers are from — extract as an array
- YouTube rarely shows cities — set audience_top_cities to null unless clearly visible
- following = null (YouTube does not show this)

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": null,
  "audience_age_range": "e.g. 25-34" or null,
  "audience_gender_split": "e.g. 55% female, 45% male" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,

  pinterest: `You are reading Pinterest analytics screenshots from a creator's account. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Follower count (= followers)
- Total pins or posts count (= total_posts)
- Monthly impressions or views (= avg_views)
- Saves, clicks, or engagement metrics (= avg_likes proxy)
- Engagement rate (if shown)
- Audience age breakdown — report the DOMINANT age range
- Audience gender split — report both percentages (Pinterest skews heavily female)
- Top countries where audience is from — extract as an array
- Top cities where audience is from — extract as an array if visible
- following = null if not visible

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": ["City1", "City2"] or null,
  "audience_age_range": "e.g. 25-34" or null,
  "audience_gender_split": "e.g. 78% female, 22% male" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,

  twitter: `You are reading Twitter/X screenshots from a creator's account. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Total followers count
- Total following count
- Total posts (tweets) count
- Average likes per post
- Average comments (replies) per post
- Average views per post (impressions, if shown)
- Engagement rate (if shown, or calculate from available data)
- Audience age breakdown — report the DOMINANT age range
- Audience gender split — report both percentages
- Top countries where followers are from — extract as an array
- Twitter/X rarely shows cities — set audience_top_cities to null unless clearly visible

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": number or null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": null,
  "audience_age_range": "e.g. 25-34" or null,
  "audience_gender_split": "e.g. 55% female, 45% male" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,

  facebook: `You are reading Facebook Page screenshots (Meta Business Suite Insights) from a creator's account. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Total Page followers/likes count (= followers)
- Total posts count
- Average reach or views per post (= avg_views)
- Average reactions/likes per post
- Average comments per post
- Engagement rate (if shown)
- Audience age breakdown — report the DOMINANT age range
- Audience gender split — report both percentages
- Top countries where the audience is from — extract as an array
- Top cities where the audience is from — extract as an array if visible
- following = null (Pages don't show this)

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": ["City1", "City2"] or null,
  "audience_age_range": "e.g. 25-34" or null,
  "audience_gender_split": "e.g. 55% female, 45% male" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,

  linkedin: `You are reading LinkedIn screenshots (profile or Page analytics) from a creator's account. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Total followers/connections count
- Total posts count
- Average impressions per post (= avg_views)
- Average reactions/likes per post
- Average comments per post
- Engagement rate (if shown)
- Audience age breakdown — report the DOMINANT age range if visible
- Audience gender split — report both percentages if visible
- Top countries where the audience is from — extract as an array if visible
- LinkedIn rarely shows cities or gender — set to null unless clearly visible
- following = null unless clearly shown

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": null,
  "audience_age_range": "e.g. 25-34" or null,
  "audience_gender_split": null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,

  twitch: `You are reading Twitch Creator Dashboard screenshots (Channel Analytics) from a creator's account. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Total followers count
- Average concurrent/average viewers per stream (= avg_views)
- Average chat messages or engagement per stream (= avg_comments proxy)
- Total streams or videos count (= total_posts)
- Engagement rate (if shown)
- Audience age breakdown — report the DOMINANT age range if visible
- Audience gender split — report both percentages if visible
- Top countries where the audience is from — extract as an array if visible
- Twitch rarely shows cities — set audience_top_cities to null unless clearly visible
- following = null (not shown for creators)

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": null,
  "total_posts": number or null,
  "avg_likes": null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": null,
  "audience_age_range": "e.g. 18-24" or null,
  "audience_gender_split": "e.g. 60% male, 40% female" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,

  snapchat: `You are reading Snapchat Insights screenshots from a creator's account. Extract every piece of analytics data visible across all the screenshots provided.

Find and extract:
- Total subscribers/followers count (= followers)
- Total posts/stories count
- Average views per story or Spotlight post (= avg_views)
- Engagement metrics if shown (= avg_likes proxy)
- Engagement rate (if shown)
- Audience age breakdown — report the DOMINANT age range if visible
- Audience gender split — report both percentages if visible
- Top countries where the audience is from — extract as an array if visible
- Snapchat rarely shows cities — set audience_top_cities to null unless clearly visible
- following = null (not shown)

The UI may look different depending on the app version. Do not look for specific button or tab names — just find the numbers and data wherever they appear.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": null,
  "audience_age_range": "e.g. 13-17" or null,
  "audience_gender_split": "e.g. 55% female, 45% male" or null,
  "confidence": "high" | "medium" | "low"
}

confidence = "high" if you found most fields, "medium" if partial, "low" if very little data visible.
Only use null if the data is genuinely not visible anywhere in the screenshots. Extract everything you can see.`,
}

const FALLBACK_PARSE_PROMPT = `You are reading social media screenshots from a creator's account. Extract every piece of analytics data visible.

Return ONLY valid JSON, no markdown, no explanation:
{
  "followers": number or null,
  "following": number or null,
  "total_posts": number or null,
  "avg_likes": number or null,
  "avg_comments": number or null,
  "avg_views": number or null,
  "engagement_rate": number or null,
  "audience_top_countries": ["Country1", "Country2"] or null,
  "audience_top_cities": ["City1", "City2"] or null,
  "audience_age_range": "e.g. 25-34" or null,
  "audience_gender_split": "e.g. 55% female, 45% male" or null,
  "confidence": "high" | "medium" | "low"
}

Only use null if the data is genuinely not visible. Extract everything you can see.`

export { PLATFORM_PROMPTS, FALLBACK_PARSE_PROMPT }
