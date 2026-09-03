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
# 2026年9月時点でユーザーがExcelから提供した
# 確定済み20本の7日間再生回数。
#
# これは予測モデルの材料としてのみ使用する。
#
# この20本には sevenDayForecast を作らないため、
# Video collections側で将来
# 「一週間予測」ボタンが表示されることもない。
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
    seconds = int(seconds)

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

    if not data.get("items"):
        raise RuntimeError(
            f"Channel not found: "
            f"{CHANNEL_ID}"
        )

    return data["items"][0]


# =========================================================
# Videos
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

        token = data.get(
            "nextPageToken"
        )

        if not token:
            break

    return ids


def get_all_videos(
    uploads_playlist_id,
):
    ids = get_all_video_ids(
        uploads_playlist_id
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
            snippet = item[
                "snippet"
            ]

            seconds = (
                iso_duration_seconds(
                    item[
                        "contentDetails"
                    ][
                        "duration"
                    ]
                )
            )

            title = snippet.get(
                "title",
                "",
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

                # DAY 1〜7判定を
                # 正確にするため保存
                "publishedAt":
                    published_at,

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
    """
    登録者履歴を更新。

    ・現在値は currentSubscriberCount
    ・今日の行があれば更新
    ・なければ今日の行を追加
    """

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

    history[today] = {
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
    """
    sevenDayViews が確定している動画だけを返す。

    新しい動画を予測する場合、
    その動画より前に投稿されたものだけを使用。
    """

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
# Base value
# =========================================================

def calculate_base(
    history,
):
    """
    直近5本の7日実績中央値。
    """

    recent = history[-5:]

    values = [
        video[
            "sevenDayViews"
        ]
        for video
        in recent
    ]

    base = median(
        values
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
    """
    直近5本 vs その前5本。

    変化率の30%だけ反映。

    最終補正は
    0.80〜1.20に制限。
    """

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
# Historical member strength
# =========================================================

def member_strength_samples(
    history,
    member,
):
    """
    同メンバー動画が
    その当時の直近チャンネル基準に対して
    どれくらい強かったかを求める。

    例

    当時の直近5本中央値 4000
    実績                  4800

    → 1.20

    極端な1本による暴走を避けるため、
    各比率を0.50〜2.00に制限。
    """

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

        # 基準が少なすぎる動画は
        # メンバー評価に使わない
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

    raw_strength = median(
        samples
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
    """
    複数メンバーの場合は
    各メンバー補正の平均。
    """

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
    """
    Model v1

    5分以下
        -10%

    5分超〜10分以下
        +7%

    10分超
        補正なし

    20分以上はサンプル不足のため
    現時点では補正しない。
    """

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
    """
    7-Day Forecast Model v1

    1.
    直近5本7日実績中央値

    2.
    最近の勢い補正

    3.
    同メンバー補正

    4.
    動画時間補正

    一度作った予測は
    以後再計算しない。
    """

    history = historical_videos(
        all_videos,
        before_published_at=(
            video.get(
                "publishedAt"
            )
        ),
    )

    if not history:
        return None

    base = calculate_base(
        history
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

    # 表示用は100回単位
    predicted = int(
        round(
            raw_prediction
            / 100
        )
        * 100
    )

    # 万一100未満になっても
    # 0回表示にはしない
    if (
        raw_prediction > 0
        and
        predicted == 0
    ):
        predicted = 100

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

        # 内部検証用。
        # UIでは表示しなくてOK。
        "rawPredictedViews":
            round(
                raw_prediction,
                2,
            ),

        # 将来モデル検証をするため
        # 予測時点の材料を保存。
        # UIには出さない。
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
# Legacy seven-day values
# =========================================================

def apply_legacy_seven_day_data(
    videos,
):
    """
    Excelから提供された過去20本に
    sevenDayViewsを付与。

    sevenDayForecast は付与しない。
    """

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
# Merge fetched + existing
# =========================================================

def merge_video_data(
    fetched_videos,
    existing_data,
    now,
):
    """
    APIから取得した最新情報と
    data.jsonに既に保存されている
    予測データを結合する。

    重要：
    sevenDayForecastは
    API更新で絶対に消さない。
    """

    existing_videos = (
        existing_data.get(
            "videos",
            [],
        )
    )

    existing_by_id = {
        video.get("id"):
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
            fetched["id"]
        )

        old = (
            existing_by_id.get(
                video_id,
                {},
            )
        )

        # API最新値を基本とする
        video = {
            **old,
            **fetched,
        }

        # 一度作った予測は
        # 必ず以前のものを保持
        if old.get(
            "sevenDayForecast"
        ):
            video[
                "sevenDayForecast"
            ] = old[
                "sevenDayForecast"
            ]

        # sevenDayViewsも保持
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

        merged.append(
            video
        )

    # まず過去20本の
    # sevenDayViewsを入れる
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
    # New video detection
    #
    # data.jsonに既に存在していた動画は
    # 予測対象にしない。
    #
    # つまり導入前22本には
    # 予測が後付けされない。
    # =====================================================

    for video in merged:
        video_id = (
            video["id"]
        )

        is_new_video = (
            video_id
            not in existing_ids
        )

        if not is_new_video:
            continue

        # 既に何らかの理由で
        # 予測が付いているなら触らない
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

    return merged


# =========================================================
# Main
# =========================================================

def main():
    now = datetime.now(
        JST
    )

    data = (
        load_existing_data()
    )

    # 初めてForecast対応版を
    # 動かした日時を保存。
    #
    # この時点より前からdata.jsonに
    # 存在している動画には
    # 予測を後付けしない。
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
    ] = now.isoformat()

    data[
        "currentSubscriberCount"
    ] = current

    data[
        "subscribers"
    ] = subscribers

    data[
        "videos"
    ] = videos

    # 現在使っているモデルを
    # data.jsonにも記録
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

    print(
        f"updated {now.isoformat()} / "
        f"subscribers={current} / "
        f"videos={len(videos)} / "
        f"forecasts={len(forecasts)} / "
        f"recorded={now.date().isoformat()}"
    )


if __name__ == "__main__":
    main()
