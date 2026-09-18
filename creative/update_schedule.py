import json
import re
from datetime import datetime
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup


BASE_URL = "https://nearly-equal-joy.jp"
SCHEDULE_URL = f"{BASE_URL}/schedule/"

OUTPUT_PATH = (
    Path(__file__).resolve().parent
    / "schedule.json"
)


# =========================================================
# 明確に不要な予定
# =========================================================

EVENT_BLOCK_WORDS = [
    "個別お話し会",
    "オンラインお話し会",
    "ツーショット撮影会",
    "撮影会",
    "サイン会",
    "お渡し会",
    "お見送り会",
]

MEDIA_BLOCK_WORDS = [
    # ラジオ
    "ラジオ",
    "radio",
    "fm大阪",
    "fm osaka",
    "mbsラジオ",

    # SHOWROOM
    "showroom",

    # 不要なテレビ系
    "ミュージック・ジャパンtv",
    "music japan tv",

    # 通常の雑誌・出版社系
    "雑誌",
    "magazine",
    "白夜書房",
    "竹書房",

    # 通常の記事・インタビュー
    "インタビュー掲載",
    "インタビューが掲載",
    "インタビュー記事",
    "記事掲載",
    "記事が掲載",
    "web記事",
    "webインタビュー",
]


# =========================================================
# ジャンル判定
# =========================================================

def classify_genre(
    category,
    title,
    body=""
):

    text = (
        f"{title} {body}"
    ).lower()

    # 誕生日
    if category == "誕生日":
        return "BIRTHDAY"

    # 本・写真集系
    book_words = [
        "写真集",
        "フォトブック",
        "photo book",
        "photobook",
        "style book",
        "stylebook",
        "スタイルブック",
        "書籍",
        "ムック",
        "book",
    ]

    if any(
        word in text
        for word in book_words
    ):
        return "BOOK"

    # 映画
    movie_words = [
        "映画",
        "movie",
        "劇場版",
    ]

    if any(
        word in text
        for word in movie_words
    ):
        return "MOVIE"

    # 舞台
    stage_words = [
        "舞台",
        "ミュージカル",
        "stage",
    ]

    if any(
        word in text
        for word in stage_words
    ):
        return "STAGE"

    # 授賞式
    award_words = [
        "award",
        "アワード",
        "授賞式",
        "表彰式",
    ]

    if any(
        word in text
        for word in award_words
    ):
        return "AWARD"

    # 配信
    stream_words = [
        "youtube",
        "showroom",
        "hulu",
        "abema",
        "配信",
        "生配信",
        "ライブ配信",
    ]

    if any(
        word in text
        for word in stream_words
    ):
        return "STREAM"

    # TV
    tv_words = [
        "テレビ",
        "tv",
        "nhk",
        "日本テレビ",
        "日テレ",
        "tbs",
        "フジテレビ",
        "テレビ朝日",
        "テレ朝",
        "テレビ東京",
        "テレ東",
        "bs",
        "cs",
    ]

    if any(
        word in text
        for word in tv_words
    ):
        return "TV"

    # フェス
    fes_words = [
        "festival",
        "フェス",
        "fes",
    ]

    if any(
        word in text
        for word in fes_words
    ):
        return "FES"

    # ライブ
    live_words = [
        "live",
        "ライブ",
        "コンサート",
        "ツアー",
        "tour",
        "公演",
        "ワンマン",
    ]

    if any(
        word in text
        for word in live_words
    ):
        return "LIVE"

    # キャンペーン
    campaign_words = [
        "キャンペーン",
        "campaign",
        "コラボ",
    ]

    if any(
        word in text
        for word in campaign_words
    ):
        return "CAMPAIGN"

    # リリース
    if category == "リリース":
        return "RELEASE"

    release_words = [
        "シングル発売",
        "アルバム発売",
        "blu-ray",
        "dvd",
    ]

    if any(
        word in text
        for word in release_words
    ):
        return "RELEASE"

    # イベント
    if category == "ライブ/イベント":
        return "EVENT"

    return "OTHER"


# =========================================================
# 掲載するか
# =========================================================

def should_include(
    category,
    title,
    body=""
):

    text = (
        f"{title} {body}"
    ).lower()

    # 握手会カテゴリは除外
    if category == "握手会":
        return False

    # リリース・誕生日は残す
    if category in {
        "リリース",
        "誕生日",
    }:
        return True

    # ライブ/イベント
    if category == "ライブ/イベント":

        if any(
            word.lower() in text
            for word in EVENT_BLOCK_WORDS
        ):
            return False

        return True

    # メディア
    if category == "メディア":

        important_book_words = [
            "写真集",
            "フォトブック",
            "photo book",
            "photobook",
            "style book",
            "stylebook",
            "スタイルブック",
            "公式ブック",
            "公式book",
        ]

        if any(
            word.lower() in text
            for word in important_book_words
        ):
            return True

        if any(
            word.lower() in text
            for word in MEDIA_BLOCK_WORDS
        ):
            return False

        return True

    # その他も基本残す
    return True


# =========================================================
# 詳細ページ
# =========================================================

def fetch_detail(url):

    try:

        response = requests.get(
            url,
            timeout=20,
            headers={
                "User-Agent":
                    "Mozilla/5.0"
            }
        )

        response.raise_for_status()

        soup = BeautifulSoup(
            response.text,
            "html.parser"
        )

        return soup.get_text(
            " ",
            strip=True
        )

    except Exception as error:

        print(
            f"detail error: {url}",
            error
        )

        return ""


# =========================================================
# 日付
# =========================================================

def extract_date(
    text,
    year,
    month
):

    match = re.search(
        r"(?<!\d)(\d{1,2})(?!\d)",
        text
    )

    if not match:
        return None

    day = int(
        match.group(1)
    )

    try:

        return datetime(
            year,
            month,
            day
        ).strftime(
            "%Y-%m-%d"
        )

    except ValueError:
        return None


# =========================================================
# 一覧取得
# =========================================================

def fetch_schedule():

    response = requests.get(
        SCHEDULE_URL,
        timeout=20,
        headers={
            "User-Agent":
                "Mozilla/5.0"
        }
    )

    response.raise_for_status()

    soup = BeautifulSoup(
        response.text,
        "html.parser"
    )

    page_text = soup.get_text(
        " ",
        strip=True
    )

    year_month_match = re.search(
        r"(\d{4})\s+(\d{1,2})\s+"
        r"(?:January|February|March|April|May|June|"
        r"July|August|September|October|November|December)",
        page_text
    )

    if not year_month_match:
        raise RuntimeError(
            "schedule year/month not found"
        )

    schedule_year = int(
        year_month_match.group(1)
    )

    schedule_month = int(
        year_month_match.group(2)
    )

    events = []
    seen_ids = set()

    links = soup.find_all(
        "a",
        href=re.compile(
            r"/schedule/detail/\d+"
        )
    )

    print("===== SCHEDULE HTML CHECK =====")

    for link in links[:3]:

        print(
            link.parent.parent.prettify()
        )

        print(
            "----------"
        )

    for link in links:

        href = link.get(
            "href"
        )

        if not href:
            continue

        detail_url = urljoin(
            BASE_URL,
            href
        )

        id_match = re.search(
            r"/schedule/detail/(\d+)",
            href
        )

        if not id_match:
            continue

        event_id = (
            id_match.group(1)
        )

        if event_id in seen_ids:
            continue

        seen_ids.add(
            event_id
        )

        event_box = link.parent

        title_node = link.select_one(
            "span.tit"
        )

        category_node = link.select_one(
            "span.cat"
        )

        title = (
            title_node.get_text(
                " ",
                strip=True
            )
            if title_node
            else link.get_text(
                " ",
                strip=True
            )
        )

        if not title:
            continue

        category = (
            category_node.get_text(
                " ",
                strip=True
            )
            if category_node
            else "その他"
        )

        date = None
        container = event_box

        for _ in range(4):

            if not container:
                break

            previous = (
                container.find_previous_sibling()
            )

            while previous:

                previous_text = (
                    previous.get_text(
                        " ",
                        strip=True
                    )
                )

                date = extract_date(
                    previous_text,
                    schedule_year,
                    schedule_month
                )

                if date:
                    break

                previous = (
                    previous.find_previous_sibling()
                )

            if date:
                break

            container = container.parent

        if not date:
            continue

        body = fetch_detail(
            detail_url
        )

        if not should_include(
            category,
            title,
            body
        ):
            continue

        genre = classify_genre(
            category,
            title,
            body
        )

        events.append({
            "id": event_id,
            "date": date,
            "genre": genre,
            "category": category,
            "title": title,
            "url": detail_url,
        })

    events.sort(
        key=lambda event: (
            event["date"],
            event["id"]
        )
    )

    return events


# =========================================================
# 保存
# =========================================================

def main():

    events = fetch_schedule()

    output = {
        "updatedAt":
            datetime.now().isoformat(
                timespec="seconds"
            ),
        "events":
            events,
    }

    OUTPUT_PATH.write_text(
        json.dumps(
            output,
            ensure_ascii=False,
            indent=2
        ),
        encoding="utf-8"
    )

    print(
        f"saved {len(events)} events"
    )


if __name__ == "__main__":
    main()
