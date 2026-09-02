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
    "逢田珠里依", "天野香乃愛", "市原愛弓", "江角怜音", "大信田美月", "大西葵",
    "小澤愛実", "髙橋舞", "藤沢莉子", "村山結香", "山田杏佳", "山野愛月"
]


def api(url, params):
    response = requests.get(url, params={**params, "key": API_KEY}, timeout=30)
    response.raise_for_status()
    return response.json()


def iso_duration_seconds(value):
    match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", value or "")
    if not match:
        return 0
    hours, minutes, seconds = [int(x or 0) for x in match.groups()]
    return hours * 3600 + minutes * 60 + seconds


def pretty_duration(seconds):
    seconds = int(seconds)
    hours = seconds // 3600
    minutes = (seconds % 3600) // 60
    secs = seconds % 60
    return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes}:{secs:02d}"


def get_channel():
    data = api(
        "https://www.googleapis.com/youtube/v3/channels",
        {"part": "statistics,snippet,contentDetails", "id": CHANNEL_ID},
    )
    if not data.get("items"):
        raise RuntimeError(f"Channel not found: {CHANNEL_ID}")
    return data["items"][0]


def get_all_video_ids(uploads_playlist_id):
    ids = []
    token = None
    while True:
        params = {"part": "contentDetails", "playlistId": uploads_playlist_id, "maxResults": 50}
        if token:
            params["pageToken"] = token
        data = api("https://www.googleapis.com/youtube/v3/playlistItems", params)
        ids.extend(item["contentDetails"]["videoId"] for item in data.get("items", []))
        token = data.get("nextPageToken")
        if not token:
            break
    return ids


def get_all_videos(uploads_playlist_id):
    ids = get_all_video_ids(uploads_playlist_id)
    videos = []
    for start in range(0, len(ids), 50):
        data = api(
            "https://www.googleapis.com/youtube/v3/videos",
            {"part": "snippet,contentDetails,statistics", "id": ",".join(ids[start:start + 50])},
        )
        for item in data.get("items", []):
            snippet = item["snippet"]
            seconds = iso_duration_seconds(item["contentDetails"]["duration"])
            text_for_tags = f"{snippet.get('title', '')} {snippet.get('description', '')}"
            videos.append({
                "id": item["id"],
                "title": snippet.get("title", ""),
                "date": snippet["publishedAt"][:10],
                "thumbnail": snippet.get("thumbnails", {}).get("high", snippet.get("thumbnails", {}).get("default", {})).get("url", ""),
                "duration": pretty_duration(seconds),
                "durationSeconds": seconds,
                "viewCount": int(item["statistics"].get("viewCount", 0)),
                "tags": [member for member in MEMBERS if member in text_for_tags],
            })
    return sorted(videos, key=lambda video: (video["date"], video["id"]))


def main():
    now = datetime.now(JST)
    with open(DATA_FILE, "r", encoding="utf-8") as file:
        data = json.load(file)

    channel = get_channel()
    current = int(channel["statistics"].get("subscriberCount", 0))
    uploads_playlist_id = channel["contentDetails"]["relatedPlaylists"]["uploads"]
    videos = get_all_videos(uploads_playlist_id)

    # A scheduled run records the completed previous JST calendar day.
    target_date = (now.date() - timedelta(days=1)).isoformat()
    history = {row["date"]: row for row in data.get("subscribers", [])}
    history[target_date] = {"date": target_date, "count": current}

    data["channelId"] = CHANNEL_ID
    data["channelName"] = channel["snippet"].get("title", data.get("channelName", "#切り抜くぞニアジョイ"))
    data["updatedAt"] = now.isoformat()
    data["currentSubscriberCount"] = current
    data["subscribers"] = sorted(history.values(), key=lambda row: row["date"])
    data["videos"] = videos
    data["memo"] = None

    with open(DATA_FILE, "w", encoding="utf-8") as file:
        json.dump(data, file, ensure_ascii=False, indent=2)

    print(
        f"updated {now.isoformat()} / subscribers={current} / "
        f"videos={len(videos)} / recorded={target_date}"
    )


if __name__ == "__main__":
    main()
