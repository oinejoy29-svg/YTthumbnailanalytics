import os
import json
import time
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from pathlib import Path

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


# =========================================================
# SETTINGS
# =========================================================

PACIFIC = ZoneInfo("America/Los_Angeles")
UTC = timezone.utc

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
            "views": raw.get("views"),
            "engagedViews": raw.get("engagedViews"),
            "watchMinutes": raw.get(
                "estimatedMinutesWatched"
            ),
            "averageViewDuration": raw.get(
                "averageViewDuration"
            ),
            "averageViewPercentage": raw.get(
                "averageViewPercentage"
            ),
            "likes": raw.get("likes"),
            "comments": raw.get("comments"),
            "shares": raw.get("shares"),
            "subscribersGained": raw.get(
                "subscribersGained"
            ),
            "subscribersLost": raw.get(
                "subscribersLost"
            ),
        })

    return result

def number_or_none(value):

    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def sum_metric(rows, metric):

    values = [
        number_or_none(row.get(metric))
        for row in rows
    ]

    values = [
        value
        for value in values
        if value is not None
    ]

    if not values:
        return None

    return sum(values)


def weighted_average(rows, metric, weight_metric):

    pairs = []

    for row in rows:

        value = number_or_none(
            row.get(metric)
        )

        weight = number_or_none(
            row.get(weight_metric)
        )

        if (
            value is None
            or weight is None
            or weight <= 0
        ):
            continue

        pairs.append(
            (value, weight)
        )

    if not pairs:
        return None

    total_weight = sum(
        weight
        for _, weight in pairs
    )

    if total_weight <= 0:
        return None

    return (
        sum(
            value * weight
            for value, weight in pairs
        )
        / total_weight
    )


def parse_published_at(value):

    if not value:
        return None

    try:

        text = str(value)

        if text.endswith("Z"):
            text = (
                text[:-1]
                + "+00:00"
            )

        parsed = datetime.fromisoformat(
            text
        )

        if parsed.tzinfo is None:
            parsed = parsed.replace(
                tzinfo=UTC
            )

        return parsed

    except (TypeError, ValueError):
        return None


def get_pacific_publish_date(
    published_at,
    fallback_date=None
):

    parsed = parse_published_at(
        published_at
    )

    if parsed is not None:

        return (
            parsed
            .astimezone(PACIFIC)
            .date()
        )

    if fallback_date:

        try:
            return date.fromisoformat(
                str(fallback_date)[:10]
            )
        except (TypeError, ValueError):
            pass

    return None


def create_summary(rows):

    total_views = sum_metric(
        rows,
        "views"
    )

    total_engaged = sum_metric(
        rows,
        "engagedViews"
    )

    total_watch = sum_metric(
        rows,
        "watchMinutes"
    )

    total_likes = sum_metric(
        rows,
        "likes"
    )

    total_comments = sum_metric(
        rows,
        "comments"
    )

    total_shares = sum_metric(
        rows,
        "shares"
    )

    subscribers_gained = sum_metric(
        rows,
        "subscribersGained"
    )

    subscribers_lost = sum_metric(
        rows,
        "subscribersLost"
    )

    average_duration = weighted_average(
        rows,
        "averageViewDuration",
        "views"
    )

    average_percentage = weighted_average(
        rows,
        "averageViewPercentage",
        "views"
    )

    return {
        "views": (
            int(total_views)
            if total_views is not None
            else None
        ),
        "engagedViews": (
            int(total_engaged)
            if total_engaged is not None
            else None
        ),
        "watchMinutes": (
            round(total_watch, 2)
            if total_watch is not None
            else None
        ),
        "averageViewDuration": (
            round(average_duration, 2)
            if average_duration is not None
            else None
        ),
        "averageViewPercentage": (
            round(average_percentage, 2)
            if average_percentage is not None
            else None
        ),
        "likes": (
            int(total_likes)
            if total_likes is not None
            else None
        ),
        "comments": (
            int(total_comments)
            if total_comments is not None
            else None
        ),
        "shares": (
            int(total_shares)
            if total_shares is not None
            else None
        ),
        "subscribersGained": (
            int(subscribers_gained)
            if subscribers_gained is not None
            else None
        ),
        "subscribersLost": (
            int(subscribers_lost)
            if subscribers_lost is not None
            else None
        ),
    }
    
def create_milestones(
    rows,
    published_at,
    fallback_date=None
):
    """
    DAY1 / DAY3 / DAY7 を作成。

    YouTube Analyticsの日次データに合わせて、
    publishedAtをPacific Timeの日付へ変換し、
    その暦日をDAY1として扱う。
    """

    published = get_pacific_publish_date(
        published_at,
        fallback_date
    )

    if published is None:
        return {
            "day1": None,
            "day3": None,
            "day7": None,
        }

    milestones = {}

    analytics_end_date = (
        date.fromisoformat(
            END_DATE
        )
    )

    for days in [1, 3, 7]:

        cutoff = (
            published
            + timedelta(
                days=days - 1
            )
        )

        if analytics_end_date < cutoff:

            milestones[
                f"day{days}"
            ] = None

            continue

        target_rows = []

        for row in rows:

            row_date = row.get(
                "date"
            )

            if not row_date:
                continue

            try:
                parsed_row_date = (
                    date.fromisoformat(
                        row_date
                    )
                )
            except (
                TypeError,
                ValueError
            ):
                continue

            if (
                published
                <= parsed_row_date
                <= cutoff
            ):
                target_rows.append(
                    row
                )

        summary = create_summary(
            target_rows
        )

        milestones[
            f"day{days}"
        ] = {
            "throughDate":
                cutoff.isoformat(),

            "publishedPacificDate":
                published.isoformat(),

            "views":
                summary["views"],

            "engagedViews":
                summary["engagedViews"],

            "watchMinutes":
                summary["watchMinutes"],

            "averageViewDuration":
                summary[
                    "averageViewDuration"
                ],

            "averageViewPercentage":
                summary[
                    "averageViewPercentage"
                ],

            "likes":
                summary["likes"],

            "comments":
                summary["comments"],

            "shares":
                summary["shares"],

            "subscribersGained":
                summary[
                    "subscribersGained"
                ],
        }

    return milestones

def get_video_retention(video_id, start_date, end_date):
    """
    動画の視聴維持率カーブを取得する。

    elapsedVideoTimeRatio:
        動画の0.0～1.0の位置

    audienceWatchRatio:
        その位置での相対的な視聴量
    """

    try:

        response = analytics.reports().query(
            ids="channel==MINE",
            startDate=start_date,
            endDate=end_date,
            metrics="audienceWatchRatio",
            dimensions="elapsedVideoTimeRatio",
            filters=f"video=={video_id}",
            sort="elapsedVideoTimeRatio"
        ).execute()

        headers = [
            column["name"]
            for column in response.get(
                "columnHeaders",
                []
            )
        ]

        result = []

        for row in response.get(
            "rows",
            []
        ):

            raw = dict(
                zip(headers, row)
            )

            position = raw.get(
                "elapsedVideoTimeRatio"
            )

            ratio = raw.get(
                "audienceWatchRatio"
            )

            if (
                position is None or
                ratio is None
            ):
                continue

            result.append({
                "position": round(
                    float(position) * 100,
                    2
                ),
                "watchRatio": round(
                    float(ratio) * 100,
                    2
                )
            })

        return result

    except HttpError as error:

        print(
            f"  RETENTION ERROR: {error}"
        )

        return []

def get_video_traffic_sources(
    video_id,
    start_date,
    end_date
):
    """
    動画の流入元を取得する。
    """

    try:

        response = analytics.reports().query(
            ids="channel==MINE",
            startDate=start_date,
            endDate=end_date,
            metrics="views,engagedViews,estimatedMinutesWatched",
            dimensions="insightTrafficSourceType",
            filters=f"video=={video_id}",
            sort="-views"
        ).execute()

        headers = [
            column["name"]
            for column in response.get(
                "columnHeaders",
                []
            )
        ]

        rows = []

        for row in response.get(
            "rows",
            []
        ):

            raw = dict(
                zip(headers, row)
            )

            source = raw.get(
                "insightTrafficSourceType"
            )

            views = raw.get(
                "views"
            )

            if source is None:
                continue

            rows.append({
                "source": source,
                "views": (
                    int(views)
                    if views is not None
                    else 0
                ),
                "engagedViews": (
                    int(
                        raw.get(
                            "engagedViews",
                            0
                        )
                    )
                ),
                "watchMinutes": round(
                    float(
                        raw.get(
                            "estimatedMinutesWatched",
                            0
                        )
                    ),
                    2
                )
            })


        total_views = sum(
            row["views"]
            for row in rows
        )


        for row in rows:

            row["percentage"] = (
                round(
                    (
                        row["views"] /
                        total_views
                    ) * 100,
                    2
                )
                if total_views > 0
                else 0
            )


        return rows


    except HttpError as error:

        print(
            f"  TRAFFIC SOURCE ERROR: {error}"
        )

        return []


def get_video_traffic_detail(
    video_id,
    start_date,
    end_date,
    source_type
):
    """
    指定した流入元の詳細を取得する。

    YT_SEARCH:
        YouTube検索語

    EXT_URL:
        外部サイト / 外部URL
    """

    try:

        response = analytics.reports().query(
            ids="channel==MINE",
            startDate=start_date,
            endDate=end_date,
            metrics="views,engagedViews,estimatedMinutesWatched",
            dimensions="insightTrafficSourceDetail",
            filters=(
                f"video=={video_id};"
                f"insightTrafficSourceType=={source_type}"
            ),
            sort="-views",
            maxResults=25
        ).execute()


        headers = [
            column["name"]
            for column in response.get(
                "columnHeaders",
                []
            )
        ]


        rows = []

        for row in response.get(
            "rows",
            []
        ):

            raw = dict(
                zip(headers, row)
            )

            detail = raw.get(
                "insightTrafficSourceDetail"
            )

            views = raw.get(
                "views"
            )

            if detail is None:
                continue


            rows.append({
                "detail": str(detail),
                "views": (
                    int(views)
                    if views is not None
                    else 0
                ),
                "engagedViews": int(
                    raw.get(
                        "engagedViews",
                        0
                    )
                ),
                "watchMinutes": round(
                    float(
                        raw.get(
                            "estimatedMinutesWatched",
                            0
                        )
                    ),
                    2
                )
            })


        total_views = sum(
            row["views"]
            for row in rows
        )


        for row in rows:

            row["percentage"] = (
                round(
                    (
                        row["views"] /
                        total_views
                    ) * 100,
                    2
                )
                if total_views > 0
                else 0
            )


        return rows


    except HttpError as error:

        print(
            f"  {source_type} DETAIL ERROR: "
            f"{error}"
        )

        return []


def get_video_traffic(
    video_id,
    start_date,
    end_date
):
    """
    流入元・検索語・外部サイトを
    一括取得する。
    """

    sources = get_video_traffic_sources(
        video_id,
        start_date,
        end_date
    )


    search_terms = (
        get_video_traffic_detail(
            video_id,
            start_date,
            end_date,
            "YT_SEARCH"
        )
    )


    external_sites = (
        get_video_traffic_detail(
            video_id,
            start_date,
            end_date,
            "EXT_URL"
        )
    )


    return {
        "sources": sources,
        "searchTerms": search_terms,
        "externalSites": external_sites
    }

def get_video_sharing_services(
    video_id,
    start_date,
    end_date
):
    """
    動画のシェア先を取得する。

    sharingService:
        シェアされたサービス

    shares:
        シェア回数
    """

    try:

        response = analytics.reports().query(
            ids="channel==MINE",
            startDate=start_date,
            endDate=end_date,
            metrics="shares",
            dimensions="sharingService",
            filters=f"video=={video_id}",
            sort="-shares"
        ).execute()

        headers = [
            column["name"]
            for column in response.get(
                "columnHeaders",
                []
            )
        ]

        result = []

        for row in response.get(
            "rows",
            []
        ):

            raw = dict(
                zip(headers, row)
            )

            service = raw.get(
                "sharingService"
            )

            shares = raw.get(
                "shares"
            )

            if service is None:
                continue

            try:
                share_count = int(shares)
            except (TypeError, ValueError):
                continue

            result.append({
                "service": str(service),
                "shares": share_count
            })


        total_shares = sum(
            row["shares"]
            for row in result
        )


        for row in result:

            row["percentage"] = (
                round(
                    (
                        row["shares"]
                        / total_shares
                    ) * 100,
                    2
                )
                if total_shares > 0
                else None
            )


        return result


    except HttpError as error:

        print(
            f"  SHARING SERVICE ERROR: {error}"
        )

        return []

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

    published_at = video.get(
        "publishedAt"
    )

    published_pacific_date = (
        get_pacific_publish_date(
            published_at,
            upload_date
        )
    )

    video_start_date = (
        published_pacific_date.isoformat()
        if published_pacific_date
        else max(
            upload_date,
            START_DATE
        )
    )

    video_start_date = max(
        video_start_date,
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

        retention = get_video_retention(
            video_id,
            video_start_date,
            END_DATE
        )

        print(
            f"  → 視聴維持率 {len(retention)} 点取得"
        )

        time.sleep(0.1)

        traffic = get_video_traffic(
            video_id,
            video_start_date,
            END_DATE
        )

        print(
            f"  → 流入元 "
            f"{len(traffic['sources'])} 件取得"
        )

        print(
            f"  → 検索語 "
            f"{len(traffic['searchTerms'])} 件取得"
        )

        print(
            f"  → 外部サイト "
            f"{len(traffic['externalSites'])} 件取得"
        )

        time.sleep(0.1)
        
        sharing_services = (
            get_video_sharing_services(
                video_id,
                video_start_date,
                END_DATE
            )
        )

        print(
            f"  → シェア先 "
            f"{len(sharing_services)} 件取得"
        )

        time.sleep(0.1)

videos[video_id] = {
    "title": title,
    "publishedDate": upload_date,
    "publishedAt": published_at,
    "publishedPacificDate": (
        published_pacific_date.isoformat()
        if published_pacific_date
        else None
    ),
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
        published_at,
        upload_date
    ),
    "daily": daily,
    "retention": retention,
    "traffic": traffic,
    "sharingServices": sharing_services
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
