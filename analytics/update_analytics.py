import os
import json
from datetime import date, timedelta
from pathlib import Path
from collections import defaultdict

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


# =========================================================
# SETTINGS
# =========================================================

START_DATE = "2026-04-03"

BASE_DIR = Path(__file__).resolve().parent
OUTPUT_FILE = BASE_DIR / "analytics_data.json"


# =========================================================
# OAuth
# =========================================================

CLIENT_ID = os.environ["YT_ANALYTICS_CLIENT_ID"]
CLIENT_SECRET = os.environ["YT_ANALYTICS_CLIENT_SECRET"]
REFRESH_TOKEN = os.environ["YT_ANALYTICS_REFRESH_TOKEN"]

SCOPES = [
    "https://www.googleapis.com/auth/yt-analytics.readonly"
]

credentials = Credentials(
    token=None,
    refresh_token=REFRESH_TOKEN,
    token_uri="https://oauth2.googleapis.com/token",
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    scopes=SCOPES,
)


# =========================================================
# YouTube Analytics API
# =========================================================

analytics = build(
    "youtubeAnalytics",
    "v2",
    credentials=credentials,
    cache_discovery=False
)


# =========================================================
# DATE RANGE
# =========================================================

end_date = str(date.today() - timedelta(days=1))

print("========================================")
print("YouTube Analytics DATA UPDATE")
print(f"期間: {START_DATE} ～ {end_date}")
print("========================================")


# =========================================================
# METRICS
# =========================================================

METRICS = ",".join([
    "views",
    "engagedViews",
    "estimatedMinutesWatched",
    "averageViewDuration",
    "averageViewPercentage",
    "likes",
    "comments",
    "shares",
    "subscribersGained",
    "subscribersLost",
])


# =========================================================
# 1. CHANNEL DAILY
# =========================================================

print()
print("[1/2] チャンネル全体の日別データを取得中...")

channel_response = analytics.reports().query(
    ids="channel==MINE",
    startDate=START_DATE,
    endDate=end_date,
    metrics=METRICS,
    dimensions="day",
    sort="day"
).execute()

channel_headers = [
    column["name"]
    for column in channel_response.get("columnHeaders", [])
]

channel_daily = []

for row in channel_response.get("rows", []):

    raw = dict(zip(channel_headers, row))

    channel_daily.append({
        "date": raw.get("day"),
        "views": raw.get("views", 0),
        "engagedViews": raw.get("engagedViews", 0),
        "watchMinutes": raw.get("estimatedMinutesWatched", 0),
        "averageViewDuration": raw.get("averageViewDuration", 0),
        "averageViewPercentage": raw.get("averageViewPercentage", 0),
        "likes": raw.get("likes", 0),
        "comments": raw.get("comments", 0),
        "shares": raw.get("shares", 0),
        "subscribersGained": raw.get("subscribersGained", 0),
        "subscribersLost": raw.get("subscribersLost", 0),
    })


print(f"→ {len(channel_daily)} 日取得")


# =========================================================
# 2. VIDEO × DAY
# =========================================================

print()
print("[2/2] 動画別の日別データを取得中...")

video_response = analytics.reports().query(
    ids="channel==MINE",
    startDate=START_DATE,
    endDate=end_date,
    metrics=METRICS,
    dimensions="day,video",
    sort="day"
).execute()

video_headers = [
    column["name"]
    for column in video_response.get("columnHeaders", [])
]

video_rows = video_response.get("rows", [])

print(f"→ {len(video_rows)} 行取得")


# =========================================================
# VIDEO DATA
# =========================================================

video_daily_map = defaultdict(list)

for row in video_rows:

    raw = dict(zip(video_headers, row))

    video_id = raw.get("video")

    if not video_id:
        continue

    video_daily_map[video_id].append({
        "date": raw.get("day"),
        "views": raw.get("views", 0),
        "engagedViews": raw.get("engagedViews", 0),
        "watchMinutes": raw.get("estimatedMinutesWatched", 0),
        "averageViewDuration": raw.get("averageViewDuration", 0),
        "averageViewPercentage": raw.get("averageViewPercentage", 0),
        "likes": raw.get("likes", 0),
        "comments": raw.get("comments", 0),
        "shares": raw.get("shares", 0),
        "subscribersGained": raw.get("subscribersGained", 0),
        "subscribersLost": raw.get("subscribersLost", 0),
    })


# =========================================================
# SUMMARY FUNCTION
# =========================================================

def create_summary(rows):

    total_views = sum(
        row["views"]
        for row in rows
    )

    total_engaged_views = sum(
        row["engagedViews"]
        for row in rows
    )

    total_watch_minutes = sum(
        row["watchMinutes"]
        for row in rows
    )

    total_likes = sum(
        row["likes"]
        for row in rows
    )

    total_comments = sum(
        row["comments"]
        for row in rows
    )

    total_shares = sum(
        row["shares"]
        for row in rows
    )

    total_subscribers_gained = sum(
        row["subscribersGained"]
        for row in rows
    )

    total_subscribers_lost = sum(
        row["subscribersLost"]
        for row in rows
    )

    # 平均再生時間・平均再生率は
    # 日別平均の単純平均ではなく再生数で加重
    if total_views > 0:

        average_view_duration = (
            sum(
                row["averageViewDuration"] * row["views"]
                for row in rows
            )
            / total_views
        )

        average_view_percentage = (
            sum(
                row["averageViewPercentage"] * row["views"]
                for row in rows
            )
            / total_views
        )

    else:

        average_view_duration = 0
        average_view_percentage = 0

    return {
        "views": total_views,
        "engagedViews": total_engaged_views,
        "watchMinutes": round(total_watch_minutes, 2),
        "averageViewDuration": round(average_view_duration, 2),
        "averageViewPercentage": round(average_view_percentage, 2),
        "likes": total_likes,
        "comments": total_comments,
        "shares": total_shares,
        "subscribersGained": total_subscribers_gained,
        "subscribersLost": total_subscribers_lost,
    }


# =========================================================
# CHANNEL SUMMARY
# =========================================================

channel_summary = create_summary(channel_daily)


# =========================================================
# BUILD VIDEO OBJECT
# =========================================================

videos = {}

for video_id, rows in video_daily_map.items():

    rows.sort(
        key=lambda item: item["date"]
    )

    videos[video_id] = {
        "summary": create_summary(rows),
        "daily": rows
    }


# =========================================================
# FINAL JSON
# =========================================================

output = {

    "meta": {
        "generatedAt": date.today().isoformat(),
        "startDate": START_DATE,
        "endDate": end_date,
        "videoCount": len(videos)
    },

    "summary": channel_summary,

    "channelDaily": channel_daily,

    "videos": videos
}


# =========================================================
# SAVE
# =========================================================

with open(
    OUTPUT_FILE,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        output,
        f,
        ensure_ascii=False,
        indent=2
    )


# =========================================================
# LOG
# =========================================================

print()
print("========================================")
print("取得結果")
print("========================================")

print(f"チャンネル日別データ : {len(channel_daily)} 日")
print(f"動画数                 : {len(videos)} 本")
print(f"動画×日データ          : {len(video_rows)} 行")

print()
print(f"総再生数               : {channel_summary['views']}")
print(f"Engaged Views          : {channel_summary['engagedViews']}")
print(f"総再生時間             : {channel_summary['watchMinutes']} 分")
print(f"平均再生時間           : {channel_summary['averageViewDuration']} 秒")
print(f"平均再生率             : {channel_summary['averageViewPercentage']} %")
print(f"高評価                 : {channel_summary['likes']}")
print(f"コメント               : {channel_summary['comments']}")
print(f"シェア                 : {channel_summary['shares']}")
print(f"登録者獲得             : {channel_summary['subscribersGained']}")

print()
print(f"保存先: {OUTPUT_FILE}")

print()
print("========================================")
print("SUCCESS")
print("動画別Analyticsデータの生成に成功しました")
print("========================================")
