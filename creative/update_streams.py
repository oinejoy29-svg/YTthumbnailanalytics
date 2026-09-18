import json
import os
from pathlib import Path

import requests


API_KEY = os.environ["YOUTUBE_API_KEY"]

CHANNEL_HANDLE = "@arcsvc"

OUTPUT_PATH = Path(
    "creative/streams.json"
)


JOY_MEMBERS = {
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
}


JOY_SPECIAL_TITLES = {
    "火曜はじょ〜いドン!"
}


def youtube_get(
    endpoint,
    params
):

    params = {
        **params,
        "key": API_KEY
    }

    response = requests.get(
        f"https://www.googleapis.com/youtube/v3/{endpoint}",
        params=params,
        timeout=30
    )

    response.raise_for_status()

    return response.json()


def get_channel():

    data = youtube_get(
        "channels",
        {
            "part": "snippet,contentDetails",
            "forHandle": CHANNEL_HANDLE
        }
    )

    items = data.get(
        "items",
        []
    )

    if not items:
        raise RuntimeError(
            f"Channel not found: {CHANNEL_HANDLE}"
        )

    return items[0]


def get_recent_videos(
    uploads_playlist_id
):

    data = youtube_get(
        "playlistItems",
        {
            "part": "snippet,contentDetails",
            "playlistId": uploads_playlist_id,
            "maxResults": 15
        }
    )

    return data.get(
        "items",
        []
    )


def get_source_name(
    title
):

    return title.split(
        "_",
        1
    )[0].strip()


def is_joy_video(
    title
):

    source_name = get_source_name(
        title
    )

    return (
        source_name in JOY_MEMBERS
        or
        source_name in JOY_SPECIAL_TITLES
    )


def make_display_title(
    title
):

    parts = title.split("_")

    source_name = parts[0].strip()


    try:

        showroom_index = parts.index(
            "SHOWROOM"
        )

        month = int(
            parts[
                showroom_index + 2
            ]
        )

        day = int(
            parts[
                showroom_index + 3
            ]
        )

        return (
            f"{month}/{day} "
            f"{source_name}"
        )


    except (
        ValueError,
        IndexError
    ):

        return source_name


def make_video_data(
    item
):

    snippet = item.get(
        "snippet",
        {}
    )

    content = item.get(
        "contentDetails",
        {}
    )

    video_id = content.get(
        "videoId"
    )

    title = snippet.get(
        "title",
        ""
    )

    thumbnails = snippet.get(
        "thumbnails",
        {}
    )


    thumbnail = (
        thumbnails.get(
            "maxres",
            {}
        ).get("url")
        or
        thumbnails.get(
            "high",
            {}
        ).get("url")
        or
        thumbnails.get(
            "medium",
            {}
        ).get("url")
        or
        thumbnails.get(
            "default",
            {}
        ).get("url")
    )


    return {
        "id": video_id,

        "displayTitle":
            make_display_title(
                title
            ),

        "sourceTitle":
            title,

        "publishedAt":
            snippet.get(
                "publishedAt"
            ),

        "thumbnail":
            thumbnail,

        "url":
            (
                "https://www.youtube.com/"
                f"watch?v={video_id}"
            )
    }


def load_existing_data():

    if not OUTPUT_PATH.exists():

        return {
            "initialized": False,
            "videos": [],
            "seenVideoIds": []
        }


    try:

        with OUTPUT_PATH.open(
            "r",
            encoding="utf-8"
        ) as f:

            data = json.load(f)


        return {
            "initialized":
                data.get(
                    "initialized",
                    False
                ),

            "videos":
                data.get(
                    "videos",
                    []
                ),

            "seenVideoIds":
                data.get(
                    "seenVideoIds",
                    []
                )
        }


    except (
        json.JSONDecodeError,
        OSError
    ):

        return {
            "initialized": False,
            "videos": [],
            "seenVideoIds": []
        }


def save_data(
    data
):

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )


    with OUTPUT_PATH.open(
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2
        )


def main():

    channel = get_channel()


    uploads_playlist_id = (
        channel[
            "contentDetails"
        ][
            "relatedPlaylists"
        ][
            "uploads"
        ]
    )


    recent_items = get_recent_videos(
        uploads_playlist_id
    )


    existing = load_existing_data()

    seen_ids = set(
        existing[
            "seenVideoIds"
        ]
    )

    videos = existing[
        "videos"
    ]


    # 初回実行
    # 現在存在する動画はすべて既読扱いにする
    # CREATIVE DESKには追加しない

    if not existing[
        "initialized"
    ]:

        for item in recent_items:

            video_id = (
                item.get(
                    "contentDetails",
                    {}
                ).get(
                    "videoId"
                )
            )

            if video_id:
                seen_ids.add(
                    video_id
                )


        output = {
            "initialized": True,

            "source": {
                "handle":
                    CHANNEL_HANDLE,

                "channelId":
                    channel["id"],

                "channelTitle":
                    channel[
                        "snippet"
                    ][
                        "title"
                    ]
            },

            "videos": [],

            "seenVideoIds":
                sorted(
                    seen_ids
                )
        }


        save_data(
            output
        )


        print(
            "Initial setup complete."
        )

        print(
            "Existing videos were marked "
            "as already seen."
        )

        print(
            "CREATIVE DESK videos: 0"
        )

        return


    # 2回目以降
    # まだ見たことのない動画だけ確認

    added_count = 0


    for item in reversed(
        recent_items
    ):

        content = item.get(
            "contentDetails",
            {}
        )

        snippet = item.get(
            "snippet",
            {}
        )

        video_id = content.get(
            "videoId"
        )

        title = snippet.get(
            "title",
            ""
        )


        if not video_id:
            continue


        if video_id in seen_ids:
            continue


        # ≒JOY以外でも
        # 一度確認した動画IDとして保存する

        seen_ids.add(
            video_id
        )


        if not is_joy_video(
            title
        ):
            continue


        videos.append(
            make_video_data(
                item
            )
        )

        added_count += 1


    output = {
        "initialized": True,

        "source": {
            "handle":
                CHANNEL_HANDLE,

            "channelId":
                channel["id"],

            "channelTitle":
                channel[
                    "snippet"
                ][
                    "title"
                ]
        },

        "videos":
            videos,

        "seenVideoIds":
            sorted(
                seen_ids
            )
    }


    save_data(
        output
    )


    print(
        f"New ≒JOY streams: "
        f"{added_count}"
    )

    print(
        f"CREATIVE DESK videos: "
        f"{len(videos)}"
    )

    print(
        f"Saved: {OUTPUT_PATH}"
    )


if __name__ == "__main__":
    main()
