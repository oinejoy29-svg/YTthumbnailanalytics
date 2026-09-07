import os
import json
import csv
import io
import requests

from collections import defaultdict

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build


# =========================================================
# SETTINGS
# =========================================================

CLIENT_ID = os.environ[
    "YT_ANALYTICS_CLIENT_ID"
]

CLIENT_SECRET = os.environ[
    "YT_ANALYTICS_CLIENT_SECRET"
]

REFRESH_TOKEN = os.environ[
    "YT_ANALYTICS_REFRESH_TOKEN"
]


SCOPES = [
    "https://www.googleapis.com/auth/yt-analytics.readonly"
]


TARGET_REPORT_TYPE = (
    "channel_end_screens_a1"
)


OUTPUT_PATH = (
    "analytics/end_screen_daily.json"
)


# =========================================================
# HELPERS
# =========================================================

def safe_int(value):

    try:
        return int(value)

    except (
        TypeError,
        ValueError
    ):
        return None


def safe_float(value):

    try:
        return float(value)

    except (
        TypeError,
        ValueError
    ):
        return None


def normalize_date(value):

    value = str(
        value or ""
    ).strip()

    if (
        len(value) == 8
        and value.isdigit()
    ):

        return (
            f"{value[0:4]}-"
            f"{value[4:6]}-"
            f"{value[6:8]}"
        )

    return value


def download_report(
    download_url,
    credentials
):

    response = requests.get(
        download_url,
        headers={
            "Authorization":
                f"Bearer {credentials.token}"
        },
        timeout=120
    )

    response.raise_for_status()

    reader = csv.DictReader(
        io.StringIO(
            response.text
        )
    )

    return list(reader)


# =========================================================
# AUTH
# =========================================================

credentials = Credentials(
    token=None,
    refresh_token=REFRESH_TOKEN,
    token_uri=(
        "https://oauth2.googleapis.com/token"
    ),
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    scopes=SCOPES
)


reporting = build(
    "youtubereporting",
    "v1",
    credentials=credentials
)


print(
    "YouTube Reporting API "
    "終了画面データ取得開始"
)

# =========================================================
# VERIFY REPORT TYPE
# =========================================================

report_types_response = (
    reporting
    .reportTypes()
    .list()
    .execute()
)

report_types = (
    report_types_response.get(
        "reportTypes",
        []
    )
)

available_report_type_ids = {
    report.get("id")
    for report in report_types
    if report.get("id")
}

print()
print("利用可能な終了画面系レポート:")

end_screen_report_types = []

for report in report_types:

    report_id = report.get("id", "")
    report_name = report.get("name", "")

    if (
        "end_screen" in report_id.lower()
        or "end screen" in report_name.lower()
    ):

        end_screen_report_types.append(
            report
        )

        print(
            f"  {report_id} | {report_name}"
        )


if (
    TARGET_REPORT_TYPE
    not in available_report_type_ids
):

    print()
    print(
        f"{TARGET_REPORT_TYPE} は"
        "このチャンネルで利用可能な"
        "reportTypes一覧にありません。"
    )

    print(
        "存在しないジョブを作成しないため、"
        "ここで終了します。"
    )

    raise SystemExit(0)


print()
print(
    f"{TARGET_REPORT_TYPE} の"
    "利用可能性を確認しました"
)

# =========================================================
# FIND / CREATE JOB
# =========================================================

jobs_response = (
    reporting
    .jobs()
    .list(
        includeSystemManaged=True
    )
    .execute()
)


jobs = jobs_response.get(
    "jobs",
    []
)


existing_job = None


for job in jobs:

    if (
        job.get("reportTypeId")
        == TARGET_REPORT_TYPE
    ):

        existing_job = job
        break


if existing_job:

    print(
        "既存の終了画面ジョブ:",
        existing_job.get("id")
    )


else:

    print(
        "終了画面ジョブを新規作成します"
    )

    existing_job = (
        reporting
        .jobs()
        .create(
            body={
                "reportTypeId":
                    TARGET_REPORT_TYPE,

                "name":
                    "YT Analytics End Screens"
            }
        )
        .execute()
    )

    print(
        "終了画面ジョブ作成成功:",
        existing_job.get("id")
    )


job_id = existing_job.get(
    "id"
)


# =========================================================
# LIST REPORTS
# =========================================================

reports = []

page_token = None


while True:

    request_args = {
        "jobId": job_id
    }

    if page_token:

        request_args[
            "pageToken"
        ] = page_token


    response = (
        reporting
        .jobs()
        .reports()
        .list(
            **request_args
        )
        .execute()
    )


    reports.extend(
        response.get(
            "reports",
            []
        )
    )


    page_token = (
        response.get(
            "nextPageToken"
        )
    )


    if not page_token:
        break


# =========================================================
# SAME PERIOD -> NEWEST REPORT
# =========================================================

latest_by_period = {}


for report in reports:

    key = (
        report.get(
            "startTime"
        ),
        report.get(
            "endTime"
        )
    )


    previous = (
        latest_by_period.get(
            key
        )
    )


    if (
        previous is None
        or report.get(
            "createTime",
            ""
        )
        > previous.get(
            "createTime",
            ""
        )
    ):

        latest_by_period[
            key
        ] = report


reports = list(
    latest_by_period.values()
)


reports.sort(
    key=lambda report:
        report.get(
            "startTime",
            ""
        )
)


print(
    "終了画面レポート:",
    len(reports),
    "件"
)


# =========================================================
# NO REPORT YET
# =========================================================

if not reports:

    print(
        "終了画面レポートは"
        "まだ生成されていません"
    )

    raise SystemExit(0)


# =========================================================
# DOWNLOAD
# =========================================================

credentials.refresh(
    Request()
)


all_rows = []

successful_reports = 0
failed_reports = 0


for index, report in enumerate(
    reports,
    start=1
):

    download_url = (
        report.get(
            "downloadUrl"
        )
    )


    if not download_url:
        continue


    try:

        rows = download_report(
            download_url,
            credentials
        )


        all_rows.extend(
            rows
        )


        successful_reports += 1


        print(
            f"[{index}/{len(reports)}] "
            f"{len(rows)}行"
        )


    except Exception as error:

        failed_reports += 1

        print(
            f"[{index}/{len(reports)}] "
            f"取得失敗: {error}"
        )


# =========================================================
# VALIDATE
# =========================================================

required_columns = {
    "date",
    "video_id",
    "end_screen_element_impressions",
    "end_screen_element_clicks",
    "end_screen_element_click_rate"
}


if all_rows:

    actual_columns = set(
        all_rows[0].keys()
    )


    missing = (
        required_columns
        - actual_columns
    )


    if missing:

        raise RuntimeError(
            "終了画面レポートに"
            "必要なカラムがありません: "
            + ", ".join(
                sorted(missing)
            )
        )


# =========================================================
# AGGREGATE
#
# date × video
#
# element単位・国・登録状態などで
# 分割された行を動画単位へ統合する。
#
# click rate は平均しない。
# clicks / impressions から再計算する。
# =========================================================

aggregate = defaultdict(
    lambda: {
        "impressions": 0,
        "clicks": 0
    }
)


for row in all_rows:

    date_value = normalize_date(
        row.get("date")
    )


    video_id = str(
        row.get(
            "video_id",
            ""
        )
    ).strip()


    if (
        not date_value
        or not video_id
    ):
        continue


    impressions = safe_int(
        row.get(
            "end_screen_element_impressions"
        )
    )


    clicks = safe_int(
        row.get(
            "end_screen_element_clicks"
        )
    )


    if (
        impressions is None
        or clicks is None
    ):
        continue


    key = (
        date_value,
        video_id
    )


    aggregate[
        key
    ][
        "impressions"
    ] += impressions


    aggregate[
        key
    ][
        "clicks"
    ] += clicks


# =========================================================
# DAILY
# =========================================================

daily_rows = []


for (
    date_value,
    video_id
), values in aggregate.items():

    impressions = values[
        "impressions"
    ]

    clicks = values[
        "clicks"
    ]


    click_rate = (
        clicks / impressions
        if impressions > 0
        else None
    )


    daily_rows.append({
        "date":
            date_value,

        "videoId":
            video_id,

        "impressions":
            impressions,

        "clicks":
            clicks,

        "clickRate":
            (
                round(
                    click_rate,
                    8
                )
                if click_rate is not None
                else None
            ),

        "clickRatePercent":
            (
                round(
                    click_rate * 100,
                    2
                )
                if click_rate is not None
                else None
            )
    })


daily_rows.sort(
    key=lambda row: (
        row["date"],
        row["videoId"]
    )
)


# =========================================================
# VIDEO SUMMARY
# =========================================================

video_temp = defaultdict(
    lambda: {
        "impressions": 0,
        "clicks": 0
    }
)


for row in daily_rows:

    video_id = row[
        "videoId"
    ]


    video_temp[
        video_id
    ][
        "impressions"
    ] += row[
        "impressions"
    ]


    video_temp[
        video_id
    ][
        "clicks"
    ] += row[
        "clicks"
    ]


video_summary = {}


for (
    video_id,
    values
) in video_temp.items():

    impressions = values[
        "impressions"
    ]

    clicks = values[
        "clicks"
    ]


    click_rate = (
        clicks / impressions
        if impressions > 0
        else None
    )


    video_summary[
        video_id
    ] = {

        "impressions":
            impressions,

        "clicks":
            clicks,

        "clickRate":
            (
                round(
                    click_rate,
                    8
                )
                if click_rate is not None
                else None
            ),

        "clickRatePercent":
            (
                round(
                    click_rate * 100,
                    2
                )
                if click_rate is not None
                else None
            )
    }


# =========================================================
# SAVE
# =========================================================

dates = [
    row["date"]
    for row in daily_rows
]


output = {

    "meta": {

        "reportType":
            TARGET_REPORT_TYPE,

        "reportCount":
            len(reports),

        "successfulReports":
            successful_reports,

        "failedReports":
            failed_reports,

        "rawRowCount":
            len(all_rows),

        "dailyRowCount":
            len(daily_rows),

        "firstDate":
            (
                min(dates)
                if dates
                else None
            ),

        "lastDate":
            (
                max(dates)
                if dates
                else None
            )
    },


    "daily":
        daily_rows,


    "videos":
        video_summary
}


with open(
    OUTPUT_PATH,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        output,
        f,
        ensure_ascii=False,
        indent=2
    )


print()
print(
    "================================"
)

print(
    "終了画面データ更新完了"
)

print(
    "================================"
)

print(
    "対象レポート:",
    len(reports),
    "件"
)

print(
    "RAW行数:",
    len(all_rows)
)

print(
    "動画×日付:",
    len(daily_rows),
    "行"
)

print(
    "動画数:",
    len(video_summary),
    "本"
)

if dates:

    print(
        "データ期間:",
        min(dates),
        "～",
        max(dates)
    )

print(
    "保存先:",
    OUTPUT_PATH
)
