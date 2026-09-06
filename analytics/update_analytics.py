import os
import json
from datetime import date, timedelta
from pathlib import Path

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
# YouTube Analyticsはデータ確定に少し時間がかかるため
# まず昨日までを問い合わせる
# =========================================================

end_date = str(date.today() - timedelta(days=1))

print("========================================")
print("YouTube Analytics DATA UPDATE")
print(f"期間: {START_DATE} ～ {end_date}")
print("========================================")


# =========================================================
# CHANNEL DAILY DATA
# =========================================================

metrics = ",".join([
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

response = analytics.reports().query(
    ids="channel==MINE",
    startDate=START_DATE,
    endDate=end_date,
    metrics=metrics,
    dimensions="day",
    sort="day"
).execute()


# =========================================================
# CONVERT RESPONSE
# =========================================================

headers = [
    column["name"]
    for column in response.get("columnHeaders", [])
]

channel_daily = []

for row in response.get("rows", []):
    raw = dict(zip(headers, row))

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


# =========================================================
# SUMMARY
# =========================================================

total_views = sum(
    row["views"]
    for row in channel_daily
)

total_engaged_views = sum(
    row["engagedViews"]
    for row in channel_daily
)

total_watch_minutes = sum(
    row["watchMinutes"]
    for row in channel_daily
)

total_likes = sum(
    row["likes"]
    for row in channel_daily
)

total_comments = sum(
    row["comments"]
    for row in channel_daily
)

total_shares = sum(
    row["shares"]
    for row in channel_daily
)

total_subscribers_gained = sum(
    row["subscribersGained"]
    for row in channel_daily
)

total_subscribers_lost = sum(
    row["subscribersLost"]
    for row in channel_daily
)


# 加重平均
if total_views > 0:

    average_view_duration = (
        sum(
            row["averageViewDuration"] * row["views"]
            for row in channel_daily
        )
        / total_views
    )

    average_view_percentage = (
        sum(
            row["averageViewPercentage"] * row["views"]
            for row in channel_daily
        )
        / total_views
    )

else:

    average_view_duration = 0
    average_view_percentage = 0


# =========================================================
# FINAL JSON
# =========================================================

output = {

    "meta": {
        "generatedAt": date.today().isoformat(),
        "startDate": START_DATE,
        "endDate": end_date
    },

    "summary": {
        "views": total_views,
        "engagedViews": total_engaged_views,
        "watchMinutes": round(total_watch_minutes, 2),
        "averageViewDuration": round(average_view_duration, 2),
        "averageViewPercentage": round(average_view_percentage, 2),
        "likes": total_likes,
        "comments": total_comments,
        "shares": total_shares,
        "subscribersGained": total_subscribers_gained,
        "subscribersLost": total_subscribers_lost
    },

    "channelDaily": channel_daily,

    # 次の段階でここに動画別データを入れる
    "videos": {}
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


print()
print(f"日別データ: {len(channel_daily)} 日")
print(f"総再生数: {total_views}")
print(f"Engaged Views: {total_engaged_views}")
print(f"総再生時間: {round(total_watch_minutes, 2)} 分")
print(f"平均再生時間: {round(average_view_duration, 2)} 秒")
print(f"平均再生率: {round(average_view_percentage, 2)} %")
print(f"登録者獲得: {total_subscribers_gained}")

print()
print(f"保存先: {OUTPUT_FILE}")

print()
print("========================================")
print("SUCCESS")
print("analytics_data.json を生成しました")
print("========================================")
