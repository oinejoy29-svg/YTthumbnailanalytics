import os
import json
import time
from datetime import date, timedelta
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


# =========================================================
# SETTINGS
# =========================================================

START_DATE = "2026-04-03"

ANALYTICS_DIR = Path(__file__).resolve().parent
ROOT_DIR = ANALYTICS_DIR.parent

OUTPUT_FILE = ANALYTICS_DIR / "analytics_data.json"
DATA_FILE = ROOT_DIR / "data.json"


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
# API
# =========================================================

analytics = build(
    "youtubeAnalytics",
    "v2",
    credentials=credentials,
    cache_discovery=False
)


# =========================================================
# DATE
# =========================================================

END_DATE = str(date.today() - timedelta(days=1))


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
# HELPERS
# =========================================================

def response_to_rows(response):

    headers = [
        column["name"]
        for column in response.get("columnHeaders", [])
    ]

    result = []

    for row in response.get("rows", []):

        raw = dict(zip(headers, row))

        result.append({
            "date": raw.get("day"),
            "views": raw.get("views", 0),
            "engagedViews": raw.get("engagedViews", 0),
            "watchMinutes": raw.get(
                "estimatedMinutesWatched", 0
            ),
            "averageViewDuration": raw.get(
                "averageViewDuration", 0
            ),
            "averageViewPercentage": raw.get(
                "averageViewPercentage", 0
            ),
            "likes": raw.get("likes", 0),
            "comments": raw.get("comments", 0),
            "shares": raw.get("shares", 0),
            "subscribersGained": raw.get(
                "subscribersGained", 0
            ),
            "subscribersLost": raw.get(
                "subscribersLost", 0
            ),
        })

    return result


def create_summary(rows):

    total_views = sum(
        row["views"]
        for row in rows
    )

    total_engaged = sum(
        row["engagedViews"]
        for row in rows
    )

    total_watch = sum(
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

    subscribers_gained = sum(
        row["subscribersGained"]
        for row in rows
    )

    subscribers_lost = sum(
        row["subscribersLost"]
        for row in rows
    )

    if total_views > 0:

        average_duration = (
            sum(
                row["averageViewDuration"]
                * row["views"]
                for row in rows
            )
            / total_views
        )

        average_percentage = (
            sum(
                row["averageViewPercentage"]
                * row["views"]
                for row in rows
            )
            / total_views
        )

    else:

        average_duration = 0
        average_percentage = 0

    return {
        "views": total_views,
        "engagedViews": total_engaged,
        "watchMinutes": round(total_watch, 2),
        "averageViewDuration": round(
            average_duration, 2
        ),
        "averageViewPercentage": round(
            average_percentage, 2
        ),
        "likes": total_likes,
        "comments": total_comments,
        "shares": total_shares,
        "subscribersGained": subscribers_gained,
        "subscribersLost": subscribers_lost,
    }
 def create_milestones(rows, published_date):
    """
    DAY1 / DAY3 / DAY7 を作成
    """

    published = date.fromisoformat(published_date)

    milestones = {}

    for days in [1, 3, 7]:

        cutoff = published + timedelta(days=days - 1)

        target_rows = [
            row
            for row in rows
            if date.fromisoformat(row["date"]) <= cutoff
        ]

        # まだその日数に到達していない動画
        if date.fromisoformat(END_DATE) < cutoff:
            milestones[f"day{days}"] = None
            continue

        summary = create_summary(target_rows)

        milestones[f"day{days}"] = {
            "throughDate": cutoff.isoformat(),
            "views": summary["views"],
            "engagedViews": summary["engagedViews"],
            "watchMinutes": summary["watchMinutes"],
            "averageViewDuration": summary["averageViewDuration"],
            "averageViewPercentage": summary["averageViewPercentage"],
            "likes": summary["likes"],
            "comments": summary["comments"],
            "shares": summary["shares"],
            "subscribersGained": summary["subscribersGained"]
        }

    return milestones


# =========================================================
# LOAD data.json
# =========================================================

print("========================================")
print("YouTube Analytics DATA UPDATE")
print(f"期間: {START_DATE} ～ {END_DATE}")
print("========================================")

with open(
    DATA_FILE,
    "r",
    encoding="utf-8"
) as f:

    public_data = json.load(f)


source_videos = public_data.get("videos", [])

print()
print(
    f"data.jsonから動画を {len(source_videos)} 本読み込み"
)


# =========================================================
# 1. CHANNEL DAILY
# =========================================================

print()
print("[1/2] チャンネル全体の日別データを取得中...")

channel_response = analytics.reports().query(
    ids="channel==MINE",
    startDate=START_DATE,
    endDate=END_DATE,
    metrics=METRICS,
    dimensions="day",
    sort="day"
).execute()

channel_daily = response_to_rows(
    channel_response
)

print(
    f"→ {len(channel_daily)} 日取得"
)


# =========================================================
# 2. EACH VIDEO DAILY
# =========================================================

print()
print("[2/2] 動画別の日別データを取得中...")

videos = {}

success_count = 0
error_count = 0


for index, video in enumerate(
    source_videos,
    start=1
):

    video_id = video.get("id")

    if not video_id:
        continue

    title = video.get("title", "")
    upload_date = video.get(
        "date",
        START_DATE
    )

    # 動画公開前の日付を問い合わせる必要はない
    video_start_date = max(
        upload_date,
        START_DATE
    )

    print()
    print(
        f"[{index}/{len(source_videos)}] "
        f"{video_id}"
    )

    print(
        f"  {title[:60]}"
    )

    try:

        response = analytics.reports().query(
            ids="channel==MINE",
            startDate=video_start_date,
            endDate=END_DATE,
            metrics=METRICS,
            dimensions="day",
            filters=f"video=={video_id}",
            sort="day"
        ).execute()

        daily = response_to_rows(
            response
        )

   videos[video_id] = {
    "title": title,
    "publishedDate": upload_date,
    "thumbnail": video.get(
        "thumbnail"
    ),
    "duration": video.get(
        "duration"
    ),
    "summary": create_summary(
        daily
    ),
    "milestones": create_milestones(
        daily,
        upload_date
    ),
    "daily": daily
}

        success_count += 1

        print(
            f"  → {len(daily)} 日取得"
        )

        # APIへ連続アクセスしすぎないよう少し待つ
        time.sleep(0.1)

    except HttpError as error:

        error_count += 1

        print(
            f"  ERROR: {error}"
        )


# =========================================================
# FINAL JSON
# =========================================================

output = {

    "meta": {
        "generatedAt": date.today().isoformat(),
        "startDate": START_DATE,
        "endDate": END_DATE,
        "videoCount": len(videos),
        "videoSuccessCount": success_count,
        "videoErrorCount": error_count
    },

    "summary": create_summary(
        channel_daily
    ),

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

print(
    f"チャンネル日別 : {len(channel_daily)} 日"
)

print(
    f"動画取得成功   : {success_count} 本"
)

print(
    f"動画取得失敗   : {error_count} 本"
)

print(
    f"保存動画数     : {len(videos)} 本"
)

print()
print(
    f"総再生数       : "
    f"{output['summary']['views']}"
)

print(
    f"Engaged Views  : "
    f"{output['summary']['engagedViews']}"
)

print(
    f"平均再生率     : "
    f"{output['summary']['averageViewPercentage']} %"
)

print(
    f"登録者獲得     : "
    f"{output['summary']['subscribersGained']}"
)

print()
print(
    f"保存先: {OUTPUT_FILE}"
)

print()
print("========================================")
print("SUCCESS")
print(
    "動画別Analyticsデータを生成しました"
)
print("========================================")
