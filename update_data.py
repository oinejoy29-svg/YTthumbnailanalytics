import json
import os
import re
import statistics
from datetime import datetime, timedelta, timezone

import requests


# =========================================================
# Basic settings
# =========================================================

API_KEY = os.environ["YOUTUBE_API_KEY"]
CHANNEL_ID = os.environ["YOUTUBE_CHANNEL_ID"]

DATA_FILE = "data.json"

JST = timezone(
    timedelta(hours=9)
)

UTC = timezone.utc

FORECAST_MODEL_VERSION = "v1"


MEMBERS = [
    "逢田珠里依",
    "天野香乃愛",
    "市原愛弓",
    "江角怜音",
    "大信田美月",
    "大西葵",
    "小澤愛実",
    "髙橋舞",
    "藤沢莉子",
    "村山結香",
    "山田杏佳",
    "山野愛月",
]


# =========================================================
# Historical 7-day data
#
# Excelから提供された確定済み20本
# =========================================================

LEGACY_SEVEN_DAY_VIEWS = {
    "K4mQYWHpcUI": 3051,
    "PmD_nggctn4": 107,
    "a1tQY33iFmM": 50,
    "2b_XBGYqJVU": 23,
    "LMDZec3o3-g": 41,
    "lcTtcqjTLlI": 3155,
    "DdvR0LbYUjQ": 2404,
    "JVNpkPsotMU": 1183,
    "3AQw6eUmK58": 1480,
    "_l7l5BH4h_s": 3072,
    "dhys8ycR5Iw": 4400,
    "EvoV01i7fRw": 11349,
    "HgCgwKqeJBI": 4199,
    "g1GPX8SlOmU": 5022,
    "S4tXGHeKBHs": 4259,
    "D88Zd_OvaSs": 7521,
    "pE6Pi35mojw": 7635,
    "rSNhDgGJvPU": 9710,
    "a9U4uap71ME": 2952,
    "B75t0LqJUSg": 3416,
}


# =========================================================
# YouTube API
# =========================================================

def api(
    url,
    params,
):
    response = requests.get(
        url,
        params={
            **params,
            "key": API_KEY,
        },
        timeout=30,
    )

    response.raise_for_status()

    return response.json()


# =========================================================
# Datetime helpers
# =========================================================

def parse_youtube_datetime(
    value,
):
    """
    YouTubeの

    2026-09-01T03:00:00Z

    のような日時を
    timezone-aware datetimeへ変換。
    """

    if not value:
        return None

    try:
        if value.endswith("Z"):
            value = (
                value[:-1]
                + "+00:00"
            )

        parsed = (
            datetime.fromisoformat(
                value
            )
        )

        if parsed.tzinfo is None:
            parsed = (
                parsed.replace(
                    tzinfo=UTC
                )
            )

        return parsed

    except (
        ValueError,
        TypeError,
    ):
        return None


def to_iso_jst(
    value,
):
    if not value:
        return None

    return (
        value
        .astimezone(JST)
        .isoformat()
    )


# =========================================================
# Duration
# =========================================================

def iso_duration_seconds(
    value,
):
    match = re.fullmatch(
        r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?",
        value or "",
    )

    if not match:
        return 0

    hours, minutes, seconds = [
        int(x or 0)
        for x in match.groups()
    ]

    return (
        hours * 3600
        + minutes * 60
        + seconds
    )


def pretty_duration(
    seconds,
):
    seconds = int(
        seconds
    )

    hours = (
        seconds // 3600
    )

    minutes = (
        (seconds % 3600)
        // 60
    )

    secs = (
        seconds % 60
    )

    if hours:
        return (
            f"{hours}:"
            f"{minutes:02d}:"
            f"{secs:02d}"
        )

    return (
        f"{minutes}:"
        f"{secs:02d}"
    )


# =========================================================
# Channel
# =========================================================

def get_channel():
    data = api(
        "https://www.googleapis.com/youtube/v3/channels",
        {
            "part":
                "statistics,snippet,contentDetails",

            "id":
                CHANNEL_ID,
        },
    )

    if not data.get(
        "items"
    ):
        raise RuntimeError(
            f"Channel not found: "
            f"{CHANNEL_ID}"
        )

    return data[
        "items"
    ][0]


# =========================================================
# Video IDs
# =========================================================

def get_all_video_ids(
    uploads_playlist_id,
):
    ids = []
    token = None

    while True:
        params = {
            "part":
                "contentDetails",

            "playlistId":
                uploads_playlist_id,

            "maxResults":
                50,
        }

        if token:
            params[
                "pageToken"
            ] = token

        data = api(
            "https://www.googleapis.com/youtube/v3/playlistItems",
            params,
        )

        ids.extend(
            item[
                "contentDetails"
            ][
                "videoId"
            ]
            for item
            in data.get(
                "items",
                [],
            )
        )

        token = (
            data.get(
                "nextPageToken"
            )
        )

        if not token:
            break

    return ids


# =========================================================
# Videos
# =========================================================

def get_all_videos(
    uploads_playlist_id,
):
    ids = (
        get_all_video_ids(
            uploads_playlist_id
        )
    )

    videos = []

    for start in range(
        0,
        len(ids),
        50,
    ):
        batch_ids = ids[
            start:start + 50
        ]

        data = api(
            "https://www.googleapis.com/youtube/v3/videos",
            {
                "part":
                    "snippet,contentDetails,statistics",

                "id":
                    ",".join(
                        batch_ids
                    ),
            },
        )

        for item in data.get(
            "items",
            [],
        ):
            snippet = (
                item[
                    "snippet"
                ]
            )

            seconds = (
                iso_duration_seconds(
                    item[
                        "contentDetails"
                    ][
                        "duration"
                    ]
                )
            )

            title = (
                snippet.get(
                    "title",
                    "",
                )
            )

            description = (
                snippet.get(
                    "description",
                    "",
                )
            )

            text_for_tags = (
                f"{title} "
                f"{description}"
            )

            thumbnails = (
                snippet.get(
                    "thumbnails",
                    {},
                )
            )

            thumbnail = (
                thumbnails
                .get(
                    "high",
                    thumbnails.get(
                        "default",
                        {},
                    ),
                )
                .get(
                    "url",
                    "",
                )
            )

            published_at = (
                snippet.get(
                    "publishedAt",
                    "",
                )
            )

            videos.append({
                "id":
                    item["id"],

                "title":
                    title,

                "date":
                    published_at[:10],

                "thumbnail":
                    thumbnail,

                "duration":
                    pretty_duration(
                        seconds
                    ),

                "durationSeconds":
                    seconds,

                "viewCount":
                    int(
                        item[
                            "statistics"
                        ].get(
                            "viewCount",
                            0,
                        )
                    ),

                "tags": [
                    member
                    for member
                    in MEMBERS
                    if member
                    in text_for_tags
                ],

                # 7日判定用
                "publishedAt":
                    published_at,
            })

    return sorted(
        videos,
        key=lambda video: (
            video.get(
                "publishedAt",
                "",
            ),
            video["id"],
        ),
    )


# =========================================================
# Existing data
# =========================================================

def load_existing_data():
    if not os.path.exists(
        DATA_FILE
    ):
        return {
            "subscribers": [],
            "videos": [],
        }

    with open(
        DATA_FILE,
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(
            file
        )


# =========================================================
# Subscriber history
# =========================================================

def update_subscriber_history(
    data,
    current,
    now,
):
    today = (
        now.date()
        .isoformat()
    )

    history = {}

    for row in data.get(
        "subscribers",
        [],
    ):
        if not row.get(
            "date"
        ):
            continue

        history[
            row["date"]
        ] = {
            "date":
                row["date"],

            "count":
                int(
                    row.get(
                        "count",
                        0,
                    )
                ),
        }

    history[
        today
    ] = {
        "date":
            today,

        "count":
            current,
    }

    return sorted(
        history.values(),
        key=lambda row:
            row["date"],
    )


# =========================================================
# Forecast helpers
# =========================================================

def median(
    values,
):
    values = [
        float(value)
        for value
        in values
        if value is not None
    ]

    if not values:
        return None

    return float(
        statistics.median(
            values
        )
    )


def clamp(
    value,
    minimum,
    maximum,
):
    return max(
        minimum,
        min(
            maximum,
            value,
        ),
    )


def historical_videos(
    videos,
    before_published_at=None,
):
    result = []

    for video in videos:
        seven_day = (
            video.get(
                "sevenDayViews"
            )
        )

        if not isinstance(
            seven_day,
            (int, float),
        ):
            continue

        if (
            before_published_at
            and
            video.get(
                "publishedAt",
                ""
            )
            >= before_published_at
        ):
            continue

        result.append(
            video
        )

    return sorted(
        result,
        key=lambda video: (
            video.get(
                "publishedAt",
                "",
            ),
            video["id"],
        ),
    )


# =========================================================
# Base
# =========================================================

def calculate_base(
    history,
):
    recent = (
        history[-5:]
    )

    values = [
        video[
            "sevenDayViews"
        ]
        for video
        in recent
    ]

    base = (
        median(
            values
        )
    )

    if base is None:
        return 0.0

    return base


# =========================================================
# Momentum
# =========================================================

def calculate_momentum(
    history,
):
    if len(
        history
    ) < 10:
        return {
            "recentMedian":
                calculate_base(
                    history
                ),

            "previousMedian":
                None,

            "rawRate":
                1.0,

            "factor":
                1.0,
        }

    recent = (
        history[-5:]
    )

    previous = (
        history[-10:-5]
    )

    recent_median = median([
        video[
            "sevenDayViews"
        ]
        for video
        in recent
    ])

    previous_median = median([
        video[
            "sevenDayViews"
        ]
        for video
        in previous
    ])

    if (
        not previous_median
        or
        previous_median <= 0
    ):
        return {
            "recentMedian":
                recent_median,

            "previousMedian":
                previous_median,

            "rawRate":
                1.0,

            "factor":
                1.0,
        }

    raw_rate = (
        recent_median
        / previous_median
    )

    factor = (
        1
        +
        (
            raw_rate
            - 1
        )
        * 0.30
    )

    factor = clamp(
        factor,
        0.80,
        1.20,
    )

    return {
        "recentMedian":
            recent_median,

        "previousMedian":
            previous_median,

        "rawRate":
            raw_rate,

        "factor":
            factor,
    }


# =========================================================
# Member correction
# =========================================================

def member_strength_samples(
    history,
    member,
):
    samples = []

    for index, video in enumerate(
        history
    ):
        if member not in (
            video.get(
                "tags",
                []
            )
        ):
            continue

        previous = (
            history[
                max(
                    0,
                    index - 5,
                ):
                index
            ]
        )

        if len(
            previous
        ) < 3:
            continue

        previous_base = median([
            item[
                "sevenDayViews"
            ]
            for item
            in previous
        ])

        if (
            previous_base is None
            or
            previous_base <= 0
        ):
            continue

        ratio = (
            video[
                "sevenDayViews"
            ]
            / previous_base
        )

        ratio = clamp(
            ratio,
            0.50,
            2.00,
        )

        samples.append(
            ratio
        )

    return samples


def calculate_single_member_factor(
    history,
    member,
):
    samples = (
        member_strength_samples(
            history,
            member,
        )
    )

    count = len(
        samples
    )

    if count == 0:
        return {
            "member":
                member,

            "sampleCount":
                0,

            "rawStrength":
                1.0,

            "confidence":
                0.0,

            "factor":
                1.0,
        }

    raw_strength = (
        median(
            samples
        )
    )

    if count == 1:
        confidence = 0.25

    elif count == 2:
        confidence = 0.50

    else:
        confidence = 0.75

    factor = (
        1
        +
        (
            raw_strength
            - 1
        )
        * confidence
    )

    factor = clamp(
        factor,
        0.85,
        1.15,
    )

    return {
        "member":
            member,

        "sampleCount":
            count,

        "rawStrength":
            raw_strength,

        "confidence":
            confidence,

        "factor":
            factor,
    }


def calculate_member_factor(
    history,
    tags,
):
    members = [
        tag
        for tag
        in tags
        if tag in MEMBERS
    ]

    if not members:
        return {
            "factor":
                1.0,

            "members":
                [],
        }

    details = [
        calculate_single_member_factor(
            history,
            member,
        )
        for member
        in members
    ]

    factors = [
        detail[
            "factor"
        ]
        for detail
        in details
    ]

    factor = (
        sum(
            factors
        )
        / len(
            factors
        )
    )

    factor = clamp(
        factor,
        0.85,
        1.15,
    )

    return {
        "factor":
            factor,

        "members":
            details,
    }


# =========================================================
# Duration correction
# =========================================================

def calculate_duration_factor(
    seconds,
):
    seconds = int(
        seconds or 0
    )

    if seconds <= 0:
        return {
            "bucket":
                "unknown",

            "factor":
                1.0,
        }

    if seconds <= 300:
        return {
            "bucket":
                "0-5min",

            "factor":
                0.90,
        }

    if seconds <= 600:
        return {
            "bucket":
                "5-10min",

            "factor":
                1.07,
        }

    if seconds <= 1200:
        return {
            "bucket":
                "10-20min",

            "factor":
                1.00,
        }

    if seconds <= 1800:
        return {
            "bucket":
                "20-30min",

            "factor":
                1.00,
        }

    return {
        "bucket":
            "30min+",

        "factor":
            1.00,
    }


# =========================================================
# Forecast Model v1
# =========================================================

def create_forecast(
    video,
    all_videos,
    now,
):
    history = (
        historical_videos(
            all_videos,
            before_published_at=(
                video.get(
                    "publishedAt"
                )
            ),
        )
    )

    if not history:
        return None

    base = (
        calculate_base(
            history
        )
    )

    if base <= 0:
        return None

    momentum = (
        calculate_momentum(
            history
        )
    )

    member = (
        calculate_member_factor(
            history,
            video.get(
                "tags",
                [],
            ),
        )
    )

    duration = (
        calculate_duration_factor(
            video.get(
                "durationSeconds",
                0,
            )
        )
    )

    raw_prediction = (
        base
        * momentum[
            "factor"
        ]
        * member[
            "factor"
        ]
        * duration[
            "factor"
        ]
    )

    raw_prediction = max(
        0,
        raw_prediction,
    )

    predicted = int(
        round(
            raw_prediction
            / 100
        )
        * 100
    )

    if (
        raw_prediction > 0
        and
        predicted == 0
    ):
        predicted = 100

    published = (
        parse_youtube_datetime(
            video.get(
                "publishedAt"
            )
        )
    )

    seven_day_target = None

    if published:
        seven_day_target = (
            published
            + timedelta(
                hours=168
            )
        )

    return {
        "modelVersion":
            FORECAST_MODEL_VERSION,

        "createdAt":
            now.isoformat(),

        "locked":
            True,

        "status":
            "active",

        "predictedViews":
            predicted,

        "rawPredictedViews":
            round(
                raw_prediction,
                2,
            ),

        # 7日経過予定時刻
        "targetAt":
            (
                to_iso_jst(
                    seven_day_target
                )
                if seven_day_target
                else None
            ),

        # 内部検証用
        "basis": {
            "historicalSampleSize":
                len(
                    history
                ),

            "baseMedian":
                round(
                    base,
                    2,
                ),

            "recentMedian":
                (
                    round(
                        momentum[
                            "recentMedian"
                        ],
                        2,
                    )
                    if momentum[
                        "recentMedian"
                    ] is not None
                    else None
                ),

            "previousMedian":
                (
                    round(
                        momentum[
                            "previousMedian"
                        ],
                        2,
                    )
                    if momentum[
                        "previousMedian"
                    ] is not None
                    else None
                ),

            "momentumRate":
                round(
                    momentum[
                        "rawRate"
                    ],
                    4,
                ),

            "momentumFactor":
                round(
                    momentum[
                        "factor"
                    ],
                    4,
                ),

            "memberFactor":
                round(
                    member[
                        "factor"
                    ],
                    4,
                ),

            "memberDetails":
                member[
                    "members"
                ],

            "durationBucket":
                duration[
                    "bucket"
                ],

            "durationFactor":
                duration[
                    "factor"
                ],
        },
    }


# =========================================================
# Legacy data
# =========================================================

def apply_legacy_seven_day_data(
    videos,
):
    for video in videos:
        video_id = (
            video.get(
                "id"
            )
        )

        if (
            video_id
            in LEGACY_SEVEN_DAY_VIEWS
        ):
            video[
                "sevenDayViews"
            ] = int(
                LEGACY_SEVEN_DAY_VIEWS[
                    video_id
                ]
            )

            video[
                "sevenDaySource"
            ] = "legacy_excel"

    return videos


# =========================================================
# STEP 4
# 7-day result finalization
# =========================================================

def finalize_seven_day_results(
    videos,
    now,
):
    """
    今後の予測対象動画について、

    publishedAt + 168時間

    を超えた最初のActions実行時に
    その時点のviewCountを7日実績として固定。

    一度sevenDayViewsを保存したら
    以降は絶対に上書きしない。
    """

    for video in videos:

        forecast = (
            video.get(
                "sevenDayForecast"
            )
        )

        # 予測対象ではない動画は無視
        if not isinstance(
            forecast,
            dict,
        ):
            continue

        # 既に確定済みなら
        # 実績を上書きしない
        if isinstance(
            video.get(
                "sevenDayViews"
            ),
            (int, float),
        ):
            # statusだけ念のため揃える
            forecast[
                "status"
            ] = "completed"

            video[
                "sevenDayForecast"
            ] = forecast

            continue

        published = (
            parse_youtube_datetime(
                video.get(
                    "publishedAt"
                )
            )
        )

        if not published:
            continue

        target_time = (
            published
            + timedelta(
                hours=168
            )
        )

        now_utc = (
            now.astimezone(
                UTC
            )
        )

        # まだ168時間経っていない
        if now_utc < target_time:
            continue

        actual_views = int(
            video.get(
                "viewCount",
                0,
            )
        )

        predicted_views = int(
            forecast.get(
                "predictedViews",
                0,
            )
            or 0
        )

        difference = (
            actual_views
            - predicted_views
        )

        if predicted_views > 0:
            difference_percent = (
                difference
                / predicted_views
                * 100
            )

        else:
            difference_percent = None

        # -----------------------------------------
        # ここで7日実績を永久保存
        # -----------------------------------------

        video[
            "sevenDayViews"
        ] = actual_views

        video[
            "sevenDaySource"
        ] = "automatic"

        video[
            "sevenDayCompletedAt"
        ] = now.isoformat()

        video[
            "sevenDayTargetAt"
        ] = (
            to_iso_jst(
                target_time
            )
        )

        # -----------------------------------------
        # Forecast側もcompletedへ
        # -----------------------------------------

        forecast[
            "status"
        ] = "completed"

        forecast[
            "completedAt"
        ] = now.isoformat()

        forecast[
            "actualViews"
        ] = actual_views

        forecast[
            "differenceViews"
        ] = difference

        forecast[
            "differencePercent"
        ] = (
            round(
                difference_percent,
                2,
            )
            if difference_percent
            is not None
            else None
        )

        video[
            "sevenDayForecast"
        ] = forecast

        print(
            "FORECAST COMPLETED / "
            f"{video['id']} / "
            f"predicted={predicted_views} / "
            f"actual={actual_views} / "
            f"difference={difference:+d}"
        )

    return videos


# =========================================================
# Merge fetched + existing
# =========================================================

def merge_video_data(
    fetched_videos,
    existing_data,
    now,
):
    existing_videos = (
        existing_data.get(
            "videos",
            [],
        )
    )

    existing_by_id = {
        video.get(
            "id"
        ):
            video

        for video
        in existing_videos

        if video.get(
            "id"
        )
    }

    existing_ids = set(
        existing_by_id.keys()
    )

    merged = []

    for fetched in fetched_videos:
        video_id = (
            fetched[
                "id"
            ]
        )

        old = (
            existing_by_id.get(
                video_id,
                {},
            )
        )

        # APIの最新値を基本にしつつ
        # 保存済み独自データも保持
        video = {
            **old,
            **fetched,
        }

        # -----------------------------------------
        # 予測を永久保持
        # -----------------------------------------

        if old.get(
            "sevenDayForecast"
        ):
            video[
                "sevenDayForecast"
            ] = old[
                "sevenDayForecast"
            ]

        # -----------------------------------------
        # 確定済み7日実績を永久保持
        # -----------------------------------------

        if isinstance(
            old.get(
                "sevenDayViews"
            ),
            (int, float),
        ):
            video[
                "sevenDayViews"
            ] = int(
                old[
                    "sevenDayViews"
                ]
            )

        if old.get(
            "sevenDaySource"
        ):
            video[
                "sevenDaySource"
            ] = old[
                "sevenDaySource"
            ]

        if old.get(
            "sevenDayCompletedAt"
        ):
            video[
                "sevenDayCompletedAt"
            ] = old[
                "sevenDayCompletedAt"
            ]

        if old.get(
            "sevenDayTargetAt"
        ):
            video[
                "sevenDayTargetAt"
            ] = old[
                "sevenDayTargetAt"
            ]

        merged.append(
            video
        )

    # -----------------------------------------
    # 過去20本のExcel実績
    # -----------------------------------------

    merged = (
        apply_legacy_seven_day_data(
            merged
        )
    )

    merged = sorted(
        merged,
        key=lambda video: (
            video.get(
                "publishedAt",
                "",
            ),
            video["id"],
        ),
    )

    # =====================================================
    # 新規動画検知
    #
    # data.jsonに既に存在している動画には
    # 後付け予測をしない。
    # =====================================================

    for video in merged:

        video_id = (
            video[
                "id"
            ]
        )

        is_new_video = (
            video_id
            not in existing_ids
        )

        if not is_new_video:
            continue

        if video.get(
            "sevenDayForecast"
        ):
            continue

        forecast = (
            create_forecast(
                video,
                merged,
                now,
            )
        )

        if forecast:
            video[
                "sevenDayForecast"
            ] = forecast

            print(
                "NEW FORECAST / "
                f"{video['id']} / "
                f"{video['title']} / "
                f"{forecast['predictedViews']} views"
            )

    # =====================================================
    # STEP 4
    #
    # 168時間経過済みの予測動画を確定
    # =====================================================

    merged = (
        finalize_seven_day_results(
            merged,
            now,
        )
    )

    return merged


# =========================================================
# Main
# =========================================================

def main():
    now = (
        datetime.now(
            JST
        )
    )

    data = (
        load_existing_data()
    )

    # Forecast機能導入日時
    if not data.get(
        "forecastFeatureStartedAt"
    ):
        data[
            "forecastFeatureStartedAt"
        ] = now.isoformat()

    channel = (
        get_channel()
    )

    statistics = (
        channel.get(
            "statistics",
            {},
        )
    )

    current = int(
        statistics.get(
            "subscriberCount",
            0,
        )
    )

    uploads_playlist_id = (
        channel[
            "contentDetails"
        ][
            "relatedPlaylists"
        ][
            "uploads"
        ]
    )

    fetched_videos = (
        get_all_videos(
            uploads_playlist_id
        )
    )

    subscribers = (
        update_subscriber_history(
            data,
            current,
            now,
        )
    )

    videos = (
        merge_video_data(
            fetched_videos,
            data,
            now,
        )
    )

    data[
        "channelId"
    ] = CHANNEL_ID

    data[
        "channelName"
    ] = (
        channel[
            "snippet"
        ].get(
            "title",
            data.get(
                "channelName",
                "#切り抜くぞニアジョイ",
            ),
        )
    )

    data[
        "updatedAt"
    ] = (
        now.isoformat()
    )

    data[
        "currentSubscriberCount"
    ] = current

    data[
        "subscribers"
    ] = subscribers

    data[
        "videos"
    ] = videos

    data[
        "forecastModel"
    ] = {
        "version":
            FORECAST_MODEL_VERSION,

        "base":
            "recent_5_median",

        "momentumWeight":
            0.30,

        "momentumClamp": [
            0.80,
            1.20,
        ],

        "memberClamp": [
            0.85,
            1.15,
        ],

        "durationFactors": {
            "0-5min":
                0.90,

            "5-10min":
                1.07,

            "10-20min":
                1.00,

            "20-30min":
                1.00,

            "30min+":
                1.00,
        },

        "completionRule":
            "first_api_snapshot_at_or_after_168_hours",
    }

    data[
        "memo"
    ] = None

    with open(
        DATA_FILE,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            data,
            file,
            ensure_ascii=False,
            indent=2,
        )

    forecasts = [
        video
        for video
        in videos
        if video.get(
            "sevenDayForecast"
        )
    ]

    active_forecasts = [
        video
        for video
        in forecasts
        if (
            video
            .get(
                "sevenDayForecast",
                {},
            )
            .get(
                "status"
            )
            == "active"
        )
    ]

    completed_forecasts = [
        video
        for video
        in forecasts
        if (
            video
            .get(
                "sevenDayForecast",
                {},
            )
            .get(
                "status"
            )
            == "completed"
        )
    ]

    print(
        f"updated {now.isoformat()} / "
        f"subscribers={current} / "
        f"videos={len(videos)} / "
        f"forecasts={len(forecasts)} / "
        f"active={len(active_forecasts)} / "
        f"completed={len(completed_forecasts)} / "
        f"recorded={now.date().isoformat()}"
    )


if __name__ == "__main__":
    main()
