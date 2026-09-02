import json
import os
import re
from datetime import datetime, timedelta, timezone

import requests


API_KEY = os.environ["YOUTUBE_API_KEY"]
CHANNEL_ID = os.environ["YOUTUBE_CHANNEL_ID"]
DATA_FILE = "data.json"

JST = timezone(timedelta(hours=9))

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


def api(url, params):
    response = requests.get(
        url,
        params={**params, "key": API_KEY},
        timeout=30,
    )
    response.raise_for_status()
    return response.json()


def iso_duration_seconds(value):
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


def pretty_duration(seconds):
    seconds = int(seconds)

    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60

    if hours:
        return f"{hours}:{minutes:02d}:{secs:02d}"

    return f"{minutes}:{secs:02d}"


def get_channel():
    data = api(
        "https://www.googleapis.com/youtube/v3/channels",
        {
            "part": "statistics,snippet,contentDetails",
            "id": CHANNEL_ID,
        },
    )

    if not data.get("items"):
        raise RuntimeError(
            f"Channel not found: {CHANNEL_ID}"
        )

    return data["items"][0]


def get_all_video_ids(uploads_playlist_id):
    ids = []
    token = None

    while True:
        params = {
            "part": "contentDetails",
            "playlistId": uploads_playlist_id,
            "maxResults": 50,
        }

        if token:
            params["pageToken"] = token

        data = api(
            "https://www.googleapis.com/youtube/v3/playlistItems",
            params,
        )

        ids.extend(
            item["contentDetails"]["videoId"]
            for item in data.get("items", [])
        )

        token = data.get("nextPageToken")

        if not token:
            break

    return ids


def get_all_videos(uploads_playlist_id):
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
                "part": "snippet,contentDetails,statistics",
                "id": ",".join(batch_ids),
            },
        )

        for item in data.get("items", []):
            snippet = item["snippet"]

            seconds = iso_duration_seconds(
                item["contentDetails"]["duration"]
            )

            title = snippet.get(
                "title",
                "",
            )

            description = snippet.get(
                "description",
                "",
            )

            text_for_tags = (
                f"{title} {description}"
            )

            thumbnail = (
                snippet
                .get("thumbnails", {})
                .get(
                    "high",
                    snippet
                    .get("thumbnails", {})
                    .get("default", {}),
                )
                .get("url", "")
            )

            videos.append({
                "id": item["id"],
                "title": title,
                "date": snippet["publishedAt"][:10],
                "thumbnail": thumbnail,
                "duration": pretty_duration(seconds),
                "durationSeconds": seconds,
                "viewCount": int(
                    item["statistics"].get(
                        "viewCount",
                        0,
                    )
                ),
                "tags": [
                    member
                    for member in MEMBERS
                    if member in text_for_tags
                ],
            })

    return sorted(
        videos,
        key=lambda video: (
            video["date"],
            video["id"],
        ),
    )


def load_existing_data():
    if not os.path.exists(DATA_FILE):
        return {
            "subscribers": [],
            "videos": [],
        }

    with open(
        DATA_FILE,
        "r",
        encoding="utf-8",
    ) as file:
        return json.load(file)


def update_subscriber_history(
    data,
    current,
    now,
):
    """
    登録者履歴を更新する。

    ・現在の登録者数は currentSubscriberCount に保存
    ・今日の日付の記録がすでにあれば現在値で更新
    ・今日の記録がなければ今日の記録として追加

    これによりJS側で

        今日の累計 - 前日の累計

    を計算して「今日の新規登録者数」を表示できる。
    """

    today = now.date().isoformat()

    history = {}

    for row in data.get(
        "subscribers",
        [],
    ):
        if not row.get("date"):
            continue

        history[row["date"]] = {
            "date": row["date"],
            "count": int(
                row.get("count", 0)
            ),
        }

    history[today] = {
        "date": today,
        "count": current,
    }

    return sorted(
        history.values(),
        key=lambda row: row["date"],
    )


def main():
    now = datetime.now(JST)

    data = load_existing_data()

    channel = get_channel()

    statistics = channel.get(
        "statistics",
        {},
    )

    current = int(
        statistics.get(
            "subscriberCount",
            0,
        )
    )

    uploads_playlist_id = (
        channel["contentDetails"]
        ["relatedPlaylists"]
        ["uploads"]
    )

    videos = get_all_videos(
        uploads_playlist_id
    )

    subscribers = update_subscriber_history(
        data,
        current,
        now,
    )

    data["channelId"] = CHANNEL_ID

    data["channelName"] = (
        channel["snippet"].get(
            "title",
            data.get(
                "channelName",
                "#切り抜くぞニアジョイ",
            ),
        )
    )

    data["updatedAt"] = now.isoformat()

    # 現在の登録者数
    data["currentSubscriberCount"] = current

    # 日別の累計登録者数
    data["subscribers"] = subscribers

    # 動画データ
    data["videos"] = videos

    data["memo"] = None

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

    print(
        f"updated {now.isoformat()} / "
        f"subscribers={current} / "
        f"videos={len(videos)} / "
        f"recorded={now.date().isoformat()}"
    )


if __name__ == "__main__":
    main()

