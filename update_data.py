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
SCENARIO_HISTORY_FILE = "scenario_history.json"

JST = timezone(
    timedelta(hours=9)
)

UTC = timezone.utc

FORECAST_MODEL_VERSION = "v2"


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

            # メンバータグは動画タイトルだけから自動検知する。
            # 概要欄に名前が書かれていてもタグには含めない。
            text_for_tags = title

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
# Goal Countdown
# マイルストーン到達予測をdata.jsonに固定保存
# =========================================================

def parse_date_string(value):
    if not value:
        return None

    try:
        return datetime.strptime(
            str(value)[:10],
            "%Y-%m-%d",
        ).date()
    except (ValueError, TypeError):
        return None


def add_date_days(date_string, days):
    base = parse_date_string(date_string)
    if not base:
        return None

    return (
        base
        + timedelta(days=int(days))
    ).isoformat()


def subscriber_rows(data):
    rows = []

    for row in data.get("subscribers", []):
        date = str(row.get("date") or "")[:10]

        if not parse_date_string(date):
            continue

        try:
            count = int(row.get("count", 0))
        except (TypeError, ValueError):
            continue

        rows.append({
            "date": date,
            "count": count,
        })

    return sorted(
        rows,
        key=lambda row: row["date"],
    )


def date_difference_days(later, earlier):
    later_date = parse_date_string(later)
    earlier_date = parse_date_string(earlier)

    if not later_date or not earlier_date:
        return 0

    return (later_date - earlier_date).days


def calculate_subscriber_slope(rows, range_days):
    if len(rows) < 2:
        return 0.0

    latest = rows[-1]
    latest_date = parse_date_string(latest["date"])

    if not latest_date:
        return 0.0

    cutoff_date = (
        latest_date
        - timedelta(days=int(range_days))
    ).isoformat()

    start = rows[0]

    before_cutoff = [
        row
        for row in rows
        if row["date"] <= cutoff_date
    ]

    if before_cutoff:
        start = before_cutoff[-1]
    else:
        inside = next(
            (
                row
                for row in rows
                if row["date"] >= cutoff_date
            ),
            None,
        )

        if inside:
            start = inside

    days = max(
        1,
        date_difference_days(
            latest["date"],
            start["date"],
        ),
    )

    return (
        int(latest["count"])
        - int(start["count"])
    ) / days


def calculate_all_subscriber_slope(rows):
    if len(rows) < 2:
        return 0.0

    first = rows[0]
    last = rows[-1]

    days = max(
        1,
        date_difference_days(
            last["date"],
            first["date"],
        ),
    )

    return (
        int(last["count"])
        - int(first["count"])
    ) / days


def calculate_goal_growth_paces(data):
    rows = subscriber_rows(data)

    pace_7 = calculate_subscriber_slope(
        rows,
        7,
    )

    pace_30 = calculate_subscriber_slope(
        rows,
        30,
    )

    pace_all = calculate_all_subscriber_slope(
        rows
    )

    weighted = (
        pace_7 * 0.50
        + pace_30 * 0.35
        + pace_all * 0.15
    )

    return {
        "pace7": pace_7,
        "pace30": pace_30,
        "paceAll": pace_all,
        "weighted": weighted,
    }


def next_goal_milestone(current):
    return (
        current // 100
        + 1
    ) * 100


def calculate_goal_eta(
    current,
    target,
    pace,
    from_date,
):
    if not isinstance(pace, (int, float)) or pace <= 0:
        return None

    remaining = max(
        0,
        int(target) - int(current),
    )

    days = int(
        -(-remaining // pace)
    )

    # 浮動小数点の切り上げを明示的に補正
    if pace > 0:
        import math
        days = math.ceil(
            remaining / pace
        )

    return add_date_days(
        from_date,
        days,
    )


def create_goal_forecast_state(data, current):
    rows = subscriber_rows(data)
    latest_date = (
        rows[-1]["date"]
        if rows
        else datetime.now(JST).date().isoformat()
    )

    paces = calculate_goal_growth_paces(
        data
    )

    target = next_goal_milestone(
        int(current)
    )

    fixed_pace = float(
        paces["weighted"]
    )

    eta = calculate_goal_eta(
        int(current),
        target,
        fixed_pace,
        latest_date,
    )

    return {
        "target": target,
        "startCount": int(current),
        "createdDate": latest_date,
        "eta": eta,
        "fixedPace": fixed_pace,
        "locked": True,
    }


def find_goal_achievement_date(data, state, fallback_date):
    target = int(
        state.get("target", 0)
        or 0
    )

    created_date = str(
        state.get("createdDate")
        or ""
    )[:10]

    for row in subscriber_rows(data):
        if (
            row["date"] >= created_date
            and int(row["count"]) >= target
        ):
            return row["date"]

    return fallback_date


def process_goal_forecast(data, current, now):
    """
    Goal Countdownの到達予測をサーバー側で管理する。

    ・初回だけETAを計算してdata.jsonへ保存
    ・同じマイルストーンの間はETA / fixedPaceを絶対に変更しない
    ・到達したら履歴へ移し、その時点で次の目標を新規作成
    """

    state = data.get("goalForecast")

    valid_state = (
        isinstance(state, dict)
        and isinstance(state.get("target"), (int, float))
        and isinstance(state.get("startCount"), (int, float))
        and isinstance(state.get("fixedPace"), (int, float))
    )

    if not valid_state:
        state = create_goal_forecast_state(
            data,
            current,
        )

        data["goalForecast"] = state

        if not isinstance(
            data.get("goalForecastHistory"),
            list,
        ):
            data["goalForecastHistory"] = []

        print(
            "NEW GOAL FORECAST / "
            f"target={state['target']} / "
            f"eta={state.get('eta')} / "
            f"pace={state.get('fixedPace', 0):.3f}"
        )

        return state

    if int(current) < int(state["target"]):
        # ここではstateを書き換えない。
        # 登録者数や直近ペースが変わっても予測日は固定。
        data["goalForecast"] = state
        return state

    actual_date = find_goal_achievement_date(
        data,
        state,
        now.date().isoformat(),
    )

    history = data.get(
        "goalForecastHistory",
        [],
    )

    if not isinstance(history, list):
        history = []

    completed = {
        "target": int(state["target"]),
        "predictedDate": state.get("eta"),
        "actualDate": actual_date,
        "createdDate": state.get("createdDate"),
        "startCount": int(state.get("startCount", 0)),
        "fixedPace": float(state.get("fixedPace", 0)),
    }

    # 同じtargetを重複保存しない
    history = [
        item
        for item in history
        if int(item.get("target", -1))
        != int(state["target"])
    ]

    history.insert(
        0,
        completed,
    )

    data["goalForecastHistory"] = (
        history[:20]
    )

    new_state = create_goal_forecast_state(
        data,
        current,
    )

    data["goalForecast"] = new_state

    print(
        "GOAL COMPLETED / "
        f"target={completed['target']} / "
        f"predicted={completed.get('predictedDate')} / "
        f"actual={completed.get('actualDate')} / "
        f"next={new_state['target']} / "
        f"next_eta={new_state.get('eta')}"
    )

    return new_state


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
# Outlier filtering
# 「通常時」の再生数を予測するため、
# バズ・極端な不振などの外れ値を予測材料から除外する。
#
# 1本: そのまま使用
# 2本: 2本とも使用
# 3本以上: MAD / Modified Z-score で判定
# =========================================================

def filter_outliers(
    values,
):
    clean = [
        float(value)
        for value in values
        if isinstance(
            value,
            (int, float),
        )
        and value >= 0
    ]

    if len(clean) <= 2:
        return clean

    center = median(
        clean
    )

    if center is None:
        return clean

    deviations = [
        abs(
            value - center
        )
        for value in clean
    ]

    mad = median(
        deviations
    )

    # MADが0の場合は統計的に安全な判定ができないため
    # 無理に除外しない
    if (
        mad is None
        or mad <= 0
    ):
        return clean

    filtered = []

    for value in clean:

        modified_z = (
            0.6745
            * (
                value - center
            )
            / mad
        )

        if abs(
            modified_z
        ) <= 3.5:
            filtered.append(
                value
            )

    # 万一すべて除外された場合は元データを使用
    if not filtered:
        return clean

    return filtered


def filtered_median(
    values,
):
    filtered = (
        filter_outliers(
            values
        )
    )

    if not filtered:
        return None

    return median(
        filtered
    )


# =========================================================
# Recent channel base
#
# 同メンバー実績が存在しない場合だけ使用。
# 直近5本から外れ値を除外して通常ラインを作る。
# =========================================================

def calculate_recent_channel_base(
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
        if isinstance(
            video.get(
                "sevenDayViews"
            ),
            (int, float),
        )
    ]

    base = (
        filtered_median(
            values
        )
    )

    if base is None:
        return 0.0

    return base


# =========================================================
# Member base
#
# 今回の予測で最重要。
#
# ・同メンバー動画が1本でもあればメンバー実績を基準
# ・1本ならその1本
# ・2本なら2本の中央値
# ・3本以上なら外れ値除外後の中央値
# ・同メンバー0本なら最近のチャンネル通常ライン
# ・複数メンバーなら各メンバー基準値の平均
# =========================================================

def member_history_values(
    history,
    member,
):
    values = []

    for video in history:

        if member not in (
            video.get(
                "tags",
                []
            )
        ):
            continue

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

        values.append(
            float(
                seven_day
            )
        )

    return values


def calculate_single_member_base(
    history,
    member,
    fallback_base,
):
    values = (
        member_history_values(
            history,
            member,
        )
    )

    sample_count = len(
        values
    )

    # 同メンバー動画が0本なら
    # チャンネル全体の最近の通常ラインを使用
    if sample_count == 0:
        return {
            "member":
                member,

            "sampleCount":
                0,

            "originalValues":
                [],

            "usedValues":
                [],

            "outlierCount":
                0,

            "source":
                "recent_channel",

            "base":
                float(
                    fallback_base
                ),
        }

    filtered = (
        filter_outliers(
            values
        )
    )

    member_base = (
        median(
            filtered
        )
    )

    if member_base is None:
        member_base = (
            fallback_base
        )

    return {
        "member":
            member,

        "sampleCount":
            sample_count,

        "originalValues":
            [
                int(value)
                for value
                in values
            ],

        "usedValues":
            [
                int(value)
                for value
                in filtered
            ],

        "outlierCount":
            max(
                0,
                sample_count
                - len(filtered),
            ),

        "source":
            "member_history",

        "base":
            float(
                member_base
            ),
    }


def calculate_member_based_base(
    history,
    tags,
):
    fallback_base = (
        calculate_recent_channel_base(
            history
        )
    )

    members = [
        tag
        for tag in tags
        if tag in MEMBERS
    ]

    # メンバータグ自体がない動画
    # → 最近のチャンネル通常ライン
    if not members:
        return {
            "base":
                fallback_base,

            "source":
                "recent_channel",

            "members":
                [],

            "fallbackBase":
                fallback_base,
        }

    details = [
        calculate_single_member_base(
            history,
            member,
            fallback_base,
        )
        for member
        in members
    ]

    bases = [
        detail[
            "base"
        ]
        for detail
        in details
        if isinstance(
            detail.get(
                "base"
            ),
            (int, float),
        )
        and detail[
            "base"
        ] > 0
    ]

    if not bases:
        final_base = (
            fallback_base
        )
    else:
        final_base = (
            sum(
                bases
            )
            / len(
                bases
            )
        )

    has_member_history = any(
        detail[
            "sampleCount"
        ] > 0
        for detail
        in details
    )

    return {
        "base":
            final_base,

        "source":
            (
                "member_history"
                if has_member_history
                else "recent_channel"
            ),

        "members":
            details,

        "fallbackBase":
            fallback_base,
    }


# =========================================================
# Momentum
#
# 最近チャンネル全体が通常より
# 上向き / 下向きになっている分だけ軽く反映。
#
# バズなどの外れ値は除外。
# 変化量の30%だけ反映。
# 最終倍率は0.80〜1.20。
# =========================================================

def calculate_momentum(
    history,
):
    if len(
        history
    ) < 10:
        recent_values = [
            video[
                "sevenDayViews"
            ]
            for video
            in history[-5:]
            if isinstance(
                video.get(
                    "sevenDayViews"
                ),
                (int, float),
            )
        ]

        recent_filtered = (
            filter_outliers(
                recent_values
            )
        )

        recent_median = (
            median(
                recent_filtered
            )
        )

        return {
            "recentMedian":
                recent_median,

            "previousMedian":
                None,

            "rawRate":
                1.0,

            "factor":
                1.0,

            "recentOriginalCount":
                len(
                    recent_values
                ),

            "recentUsedCount":
                len(
                    recent_filtered
                ),

            "previousOriginalCount":
                0,

            "previousUsedCount":
                0,
        }

    recent = (
        history[-5:]
    )

    previous = (
        history[-10:-5]
    )

    recent_values = [
        video[
            "sevenDayViews"
        ]
        for video
        in recent
        if isinstance(
            video.get(
                "sevenDayViews"
            ),
            (int, float),
        )
    ]

    previous_values = [
        video[
            "sevenDayViews"
        ]
        for video
        in previous
        if isinstance(
            video.get(
                "sevenDayViews"
            ),
            (int, float),
        )
    ]

    recent_filtered = (
        filter_outliers(
            recent_values
        )
    )

    previous_filtered = (
        filter_outliers(
            previous_values
        )
    )

    recent_median = (
        median(
            recent_filtered
        )
    )

    previous_median = (
        median(
            previous_filtered
        )
    )

    if (
        recent_median is None
        or previous_median is None
        or previous_median <= 0
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

            "recentOriginalCount":
                len(
                    recent_values
                ),

            "recentUsedCount":
                len(
                    recent_filtered
                ),

            "previousOriginalCount":
                len(
                    previous_values
                ),

            "previousUsedCount":
                len(
                    previous_filtered
                ),
        }

    raw_rate = (
        recent_median
        / previous_median
    )

    # 最近の変化をそのまま100%反映せず、
    # 30%だけ予測へ反映する
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

        "recentOriginalCount":
            len(
                recent_values
            ),

        "recentUsedCount":
            len(
                recent_filtered
            ),

        "previousOriginalCount":
            len(
                previous_values
            ),

        "previousUsedCount":
            len(
                previous_filtered
            ),
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
# Forecast Model v2
#
# 「普通に推移した場合」の7日再生数を予測する。
# バズそのものは予測対象にしない。
#
# 優先順位:
# 1. 同メンバー過去実績
# 2. 同メンバー実績がなければ最近のチャンネル通常ライン
# 3. 最近のチャンネル全体トレンド
# 4. 動画尺
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

    # -----------------------------------------
    # 最重要:
    # メンバーを基準に通常ラインを決める
    # -----------------------------------------

    member_base = (
        calculate_member_based_base(
            history,
            video.get(
                "tags",
                [],
            ),
        )
    )

    base = float(
        member_base.get(
            "base",
            0,
        )
        or 0
    )

    if base <= 0:
        return None

    # -----------------------------------------
    # 最近のチャンネル全体傾向
    # -----------------------------------------

    momentum = (
        calculate_momentum(
            history
        )
    )

    # -----------------------------------------
    # 動画尺
    # -----------------------------------------

    duration = (
        calculate_duration_factor(
            video.get(
                "durationSeconds",
                0,
            )
        )
    )

    # -----------------------------------------
    # 最終予測
    #
    # メンバー通常ライン
    # × 最近の通常トレンド
    # × 動画尺
    # -----------------------------------------

    raw_prediction = (
        base
        * momentum[
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

    # 表示は100回単位
    predicted = int(
        round(
            raw_prediction
            / 100
        )
        * 100
    )

    if (
        raw_prediction > 0
        and predicted == 0
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
            "v2",

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

        "targetAt":
            (
                to_iso_jst(
                    seven_day_target
                )
                if seven_day_target
                else None
            ),

        # 内部検証用。
        # サイト上には表示しない。
        "basis": {
            "predictionType":
                "normal_expected_views",

            "historicalSampleSize":
                len(
                    history
                ),

            "baseSource":
                member_base[
                    "source"
                ],

            "baseViews":
                round(
                    base,
                    2,
                ),

            "fallbackChannelBase":
                round(
                    member_base[
                        "fallbackBase"
                    ],
                    2,
                ),

            "memberDetails":
                member_base[
                    "members"
                ],

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

            "recentOutliersRemoved":
                max(
                    0,
                    momentum[
                        "recentOriginalCount"
                    ]
                    - momentum[
                        "recentUsedCount"
                    ],
                ),

            "previousOutliersRemoved":
                max(
                    0,
                    momentum[
                        "previousOriginalCount"
                    ]
                    - momentum[
                        "previousUsedCount"
                    ],
                ),

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
        # サイトがこの動画を初めて確認した時刻
        #
        # NEWバッジはこの時刻から24時間だけ表示。
        # 既存動画には後付けしない。
        # -----------------------------------------

        if (
            video_id
            not in existing_ids
        ):
            video[
                "firstDetectedAt"
            ] = now.isoformat()
            

        # -----------------------------------------
        # 前回更新からの再生回数増加
        #
        # 既存動画:
        #   今回のviewCount - 前回保存時のviewCount
        #
        # 新規動画:
        #   比較元がないため0として保存
        #
        # YouTube側の補正などで再生回数が減った場合も、
        # 実際の差分をそのまま保存する。
        # -----------------------------------------

        current_view_count = int(
            fetched.get(
                "viewCount",
                0,
            )
            or 0
        )

        previous_view_count = (
            old.get(
                "viewCount"
            )
        )

        if isinstance(
            previous_view_count,
            (int, float),
        ):
            video[
                "viewCountIncrease"
            ] = (
                current_view_count
                - int(previous_view_count)
            )
        else:
            video[
                "viewCountIncrease"
            ] = 0

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
# Popular ranking movement
# =========================================================

def update_popular_ranking_state(
    videos,
    existing_data,
    now,
):
    """
    人気順の順位変動を記録する。

    popularRank
        現在順位

    popularRankDayStart
        その日の最初の順位

    popularRankChange
        その日の最初から何位上がったか

    popularRankDay
        基準日
    """

    existing_videos = (
        existing_data.get(
            "videos",
            [],
        )
        or []
    )

    old_by_id = {
        str(video.get("id")):
            video
        for video
        in existing_videos
        if video.get("id")
    }

    ranked = sorted(
        videos,
        key=lambda video: (
            -int(
                video.get(
                    "viewCount",
                    0,
                )
                or 0
            ),
            str(
                video.get(
                    "publishedAt",
                    "",
                )
            ),
            str(
                video.get(
                    "id",
                    "",
                )
            ),
        ),
    )

    today_key = (
        now
        .astimezone(JST)
        .date()
        .isoformat()
    )

    signal_changed = False

    for rank, video in enumerate(
        ranked,
        start=1,
    ):
        video_id = str(
            video.get(
                "id",
                "",
            )
        )

        old = (
            old_by_id.get(
                video_id,
                {},
            )
        )

        previous_rank = (
            old.get(
                "popularRank"
            )
        )

        if (
            old.get(
                "popularRankDay"
            )
            == today_key
            and isinstance(
                old.get(
                    "popularRankDayStart"
                ),
                (int, float),
            )
        ):
            day_start_rank = int(
                old[
                    "popularRankDayStart"
                ]
            )

        else:
            day_start_rank = rank

        video[
            "popularRank"
        ] = rank

        video[
            "popularRankDay"
        ] = today_key

        video[
            "popularRankDayStart"
        ] = day_start_rank

        video[
            "popularRankChange"
        ] = max(
            0,
            day_start_rank - rank,
        )

        published_at = (
            parse_youtube_datetime(
                video.get(
                    "publishedAt"
                )
            )
        )

        old_enough = False

        if published_at:
            old_enough = (
                now.astimezone(UTC)
                -
                published_at.astimezone(UTC)
            ).total_seconds() >= (
                4 * 24 * 60 * 60
            )

        # 投稿4日経過後で、
        # 前回更新より順位が上昇し、
        # かつ今日の開始順位より上なら通知
        if (
            old_enough
            and isinstance(
                previous_rank,
                (int, float),
            )
            and rank
            < int(previous_rank)
            and day_start_rank - rank > 0
        ):
            signal_changed = True

    if signal_changed:
        existing_data[
            "popularRankingSignalAt"
        ] = now.isoformat()

    return videos


# =========================================================
# Scenario history
# Future Scenarios の「過去時点の予測」と
# 500人単位の大台予測基準を永続保存
# =========================================================

def load_scenario_history():
    if not os.path.exists(
        SCENARIO_HISTORY_FILE
    ):
        return {
            "dailyForecasts": [],
            "milestoneForecasts": [],
        }

    try:
        with open(
            SCENARIO_HISTORY_FILE,
            "r",
            encoding="utf-8",
        ) as file:
            history = json.load(
                file
            )
    except (
        json.JSONDecodeError,
        OSError,
    ):
        history = {}

    daily = history.get(
        "dailyForecasts",
        [],
    )

    milestones = history.get(
        "milestoneForecasts",
        [],
    )

    if not isinstance(
        daily,
        list,
    ):
        daily = []

    if not isinstance(
        milestones,
        list,
    ):
        milestones = []

    return {
        "dailyForecasts": daily,
        "milestoneForecasts": milestones,
    }


def save_scenario_history(
    history,
):
    with open(
        SCENARIO_HISTORY_FILE,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            history,
            file,
            ensure_ascii=False,
            indent=2,
        )


def scenario_growth_paces(
    data,
):
    paces = (
        calculate_goal_growth_paces(
            data
        )
    )

    standard = max(
        0.0,
        float(
            paces.get(
                "weighted",
                0.0,
            )
            or 0.0
        ),
    )

    return {
        "positive":
            standard * 1.20,

        "standard":
            standard,

        "cautious":
            standard * 0.80,
    }


def create_daily_scenario_snapshot(
    data,
    current,
    now,
):
    paces = (
        scenario_growth_paces(
            data
        )
    )

    forecasts = {}

    for days in (
        30,
        90,
        365,
    ):
        forecasts[
            str(days)
        ] = {
            "positive":
                int(
                    round(
                        int(current)
                        + paces["positive"] * days
                    )
                ),

            "standard":
                int(
                    round(
                        int(current)
                        + paces["standard"] * days
                    )
                ),

            "cautious":
                int(
                    round(
                        int(current)
                        + paces["cautious"] * days
                    )
                ),
        }

    return {
        "date":
            now.astimezone(
                JST
            )
            .date()
            .isoformat(),

        "subscribers":
            int(current),

        "forecasts":
            forecasts,
    }


def update_daily_scenario_history(
    history,
    data,
    current,
    now,
):
    snapshot = (
        create_daily_scenario_snapshot(
            data,
            current,
            now,
        )
    )

    today = snapshot[
        "date"
    ]

    rows = history.get(
        "dailyForecasts",
        [],
    )

    if not isinstance(
        rows,
        list,
    ):
        rows = []

    # 同じ日は4回のActions実行のたびに
    # その時点の最新予測へ置き換える。
    rows = [
        row
        for row in rows
        if str(
            row.get(
                "date",
                "",
            )
        ) != today
    ]

    rows.append(
        snapshot
    )

    rows.sort(
        key=lambda row:
            str(
                row.get(
                    "date",
                    "",
                )
            )
    )

    history[
        "dailyForecasts"
    ] = rows

    print(
        "SCENARIO DAILY SNAPSHOT / "
        f"date={today} / "
        f"subscribers={current} / "
        f"30d={snapshot['forecasts']['30']['standard']} / "
        f"90d={snapshot['forecasts']['90']['standard']} / "
        f"365d={snapshot['forecasts']['365']['standard']}"
    )


def next_major_milestone(
    current,
):
    return (
        int(current) // 500
        + 1
    ) * 500


def previous_major_milestone(
    target,
):
    return max(
        0,
        int(target) - 500,
    )


def calculate_major_milestone_eta(
    data,
    current,
    target,
    from_date,
):
    pace = (
        scenario_growth_paces(
            data
        )[
            "standard"
        ]
    )

    return calculate_goal_eta(
        int(current),
        int(target),
        pace,
        from_date,
    )


def update_milestone_scenario_history(
    history,
    data,
    current,
    now,
):
    target = (
        next_major_milestone(
            current
        )
    )

    from_milestone = (
        previous_major_milestone(
            target
        )
    )

    rows = history.get(
        "milestoneForecasts",
        [],
    )

    if not isinstance(
        rows,
        list,
    ):
        rows = []

    # 同じ到達目標の基準予測が既にあれば
    # 絶対に作り直さない。
    existing = next(
        (
            row
            for row in rows
            if int(
                row.get(
                    "targetMilestone",
                    -1,
                )
                or -1
            ) == int(target)
        ),
        None,
    )

    if existing:
        history[
            "milestoneForecasts"
        ] = rows
        return

    created_at = (
        now.astimezone(
            JST
        )
        .date()
        .isoformat()
    )

    initial_eta = (
        calculate_major_milestone_eta(
            data,
            current,
            target,
            created_at,
        )
    )

    record = {
        "fromMilestone":
            int(from_milestone),

        "targetMilestone":
            int(target),

        "createdAt":
            created_at,

        "initialForecastDate":
            initial_eta,
    }

    rows.append(
        record
    )

    rows.sort(
        key=lambda row: (
            int(
                row.get(
                    "targetMilestone",
                    0,
                )
                or 0
            ),
            str(
                row.get(
                    "createdAt",
                    "",
                )
            ),
        )
    )

    history[
        "milestoneForecasts"
    ] = rows

    print(
        "NEW MILESTONE FORECAST / "
        f"from={from_milestone} / "
        f"target={target} / "
        f"eta={initial_eta}"
    )



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

    # Goal Countdownはdata.jsonを唯一の固定保存先にする。
    # 先に最新のsubscriber履歴をdataへ反映してから処理する。
    data["subscribers"] = subscribers

    process_goal_forecast(
        data,
        current,
        now,
    )

    videos = (
        merge_video_data(
            fetched_videos,
            data,
            now,
        )
    )
    
    videos = (
        update_popular_ranking_state(
            videos,
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
    
        "predictionType":
            "normal_expected_views",
    
        "base":
            "member_history_median",
    
        "fallbackBase":
            "recent_5_filtered_median",
    
        "outlierMethod":
            "MAD_modified_z",
    
        "outlierThreshold":
            3.5,
    
        "momentumWeight":
            0.30,
    
        "momentumClamp": [
            0.80,
            1.20,
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

    # Future Scenarios の予測履歴を永続保存。
    # dailyForecasts は同日分を最新値で上書きし、
    # milestoneForecasts は一度作った基準予測を固定する。
    scenario_history = (
        load_scenario_history()
    )

    update_daily_scenario_history(
        scenario_history,
        data,
        current,
        now,
    )

    update_milestone_scenario_history(
        scenario_history,
        data,
        current,
        now,
    )

    save_scenario_history(
        scenario_history
    )

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
