import os
import json
from datetime import date, timedelta

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


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

youtube_analytics = build(
    "youtubeAnalytics",
    "v2",
    credentials=credentials
)


# =========================================================
# TEST QUERY
# まずは直近7日間の日別データを取得
# =========================================================

end_date = date.today() - timedelta(days=1)
start_date = end_date - timedelta(days=6)

print("========================================")
print("YouTube Analytics API TEST")
print(f"期間: {start_date} ～ {end_date}")
print("========================================")


response = youtube_analytics.reports().query(
    ids="channel==MINE",
    startDate=str(start_date),
    endDate=str(end_date),

    metrics=(
        "views,"
        "estimatedMinutesWatched,"
        "averageViewDuration,"
        "subscribersGained"
    ),

    dimensions="day",
    sort="day"
).execute()


# =========================================================
# RESULT
# =========================================================

print("\nAPI RESPONSE:")
print(json.dumps(
    response,
    ensure_ascii=False,
    indent=2
))


print("\n========================================")
print("取得結果")
print("========================================")

headers = [
    column["name"]
    for column in response.get("columnHeaders", [])
]

print(" | ".join(headers))

for row in response.get("rows", []):
    print(" | ".join(map(str, row)))


print("\n========================================")
print("SUCCESS")
print("YouTube Analytics APIへの接続に成功しました")
print("========================================")
