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

CLIENT_ID = os.environ["YT_ANALYTICS_CLIENT_ID"]
CLIENT_SECRET = os.environ["YT_ANALYTICS_CLIENT_SECRET"]
REFRESH_TOKEN = os.environ["YT_ANALYTICS_REFRESH_TOKEN"]

SCOPES = [
    "https://www.googleapis.com/auth/yt-analytics.readonly"
]

TARGET_REPORT_TYPE = "channel_reach_combined_a1"

REPORT_TYPES_PATH = "analytics/report_types.json"
JOB_PATH = "analytics/reporting_job.json"
REPORT_LIST_PATH = "analytics/reporting_reports.json"

# 全レポートの生データ
RAW_ROWS_PATH = "analytics/reach_report.json"

# サイトで使いやすい動画×日付集約データ
DAILY_PATH = "analytics/reach_daily.json"


# =========================================================
# HELPERS
# =========================================================

def safe_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def safe_float(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def normalize_date(value):
    """
    Reporting API:
    20260903

    ↓

    2026-09-03
    """

    value = str(value or "").strip()

    if len(value) == 8 and value.isdigit():
        return (
            f"{value[0:4]}-"
            f"{value[4:6]}-"
            f"{value[6:8]}"
        )

    return value


def download_report(download_url, credentials):
    """
    Reporting APIのCSVをダウンロードして
    DictReaderの行一覧として返す。
    """

    response = requests.get(
        download_url,
        headers={
            "Authorization":
                f"Bearer {credentials.token}"
        },
        timeout=120
    )

    response.raise_for_status()

    csv_text = response.text

    reader = csv.DictReader(
        io.StringIO(csv_text)
    )

    return list(reader)


# =========================================================
# AUTH
# =========================================================

credentials = Credentials(
    token=None,
    refresh_token=REFRESH_TOKEN,
    token_uri="https://oauth2.googleapis.com/token",
    client_id=CLIENT_ID,
    client_secret=CLIENT_SECRET,
    scopes=SCOPES
)


reporting = build(
    "youtubereporting",
    "v1",
    credentials=credentials
)


print("YouTube Reporting API 接続成功")


# =========================================================
# REPORT TYPES
# =========================================================

response = (
    reporting
    .reportTypes()
    .list()
    .execute()
)


report_types = response.get(
    "reportTypes",
    []
)


print()
print(
    f"利用可能なレポートタイプ: "
    f"{len(report_types)}件"
)
print()


reach_reports = []


for report in report_types:

    report_id = report.get(
        "id",
        ""
    )

    name = report.get(
        "name",
        ""
    )

    if "reach" in report_id.lower():

        reach_reports.append(
            {
                "id": report_id,
                "name": name
            }
        )

        print(
            f"{report_id}"
            f"  |  "
            f"{name}"
        )


print()
print(
    f"Reach系レポート: "
    f"{len(reach_reports)}件"
)


with open(
    REPORT_TYPES_PATH,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        reach_reports,
        f,
        ensure_ascii=False,
        indent=2
    )


print()
print(
    f"{REPORT_TYPES_PATH} "
    "を保存しました"
)


# =========================================================
# CREATE / FIND REACH REPORT JOB
# =========================================================

print()
print(
    f"対象レポート: "
    f"{TARGET_REPORT_TYPE}"
)


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


# =========================================================
# EXISTING JOB
# =========================================================

if existing_job:

    print()
    print(
        "既存のReachジョブが見つかりました"
    )

    print(
        "Job ID:",
        existing_job.get("id")
    )

    print(
        "Job Name:",
        existing_job.get("name")
    )


# =========================================================
# CREATE JOB
# =========================================================

else:

    print()
    print(
        "Reachジョブがないため"
        "新規作成します"
    )

    created_job = (
        reporting
        .jobs()
        .create(
            body={
                "reportTypeId":
                    TARGET_REPORT_TYPE,

                "name":
                    "YT Analytics Reach"
            }
        )
        .execute()
    )

    existing_job = created_job

    print()
    print(
        "Reachジョブ作成成功"
    )

    print(
        "Job ID:",
        created_job.get("id")
    )

    print(
        "Job Name:",
        created_job.get("name")
    )


# =========================================================
# SAVE JOB
# =========================================================

job_info = {

    "id":
        existing_job.get("id"),

    "name":
        existing_job.get("name"),

    "reportTypeId":
        existing_job.get(
            "reportTypeId"
        ),

    "createTime":
        existing_job.get(
            "createTime"
        )
}


with open(
    JOB_PATH,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        job_info,
        f,
        ensure_ascii=False,
        indent=2
    )


print()
print(
    f"{JOB_PATH} "
    "を保存しました"
)


# =========================================================
# LIST ALL GENERATED REPORTS
# =========================================================

job_id = existing_job.get("id")


print()
print(
    "生成済みReachレポートを確認します"
)


reports = []
page_token = None


while True:

    request_args = {
        "jobId": job_id
    }

    if page_token:
        request_args["pageToken"] = page_token

    reports_response = (
        reporting
        .jobs()
        .reports()
        .list(
            **request_args
        )
        .execute()
    )

    reports.extend(
        reports_response.get(
            "reports",
            []
        )
    )

    page_token = (
        reports_response.get(
            "nextPageToken"
        )
    )

    if not page_token:
        break


print()
print(
    f"生成済みレポート: "
    f"{len(reports)}件"
)


# =========================================================
# 同じ期間のレポートが複数ある場合、
# createTimeが新しい方を採用
# =========================================================

latest_by_period = {}


for report in reports:

    period_key = (
        report.get("startTime"),
        report.get("endTime")
    )

    previous = (
        latest_by_period.get(
            period_key
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
            period_key
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
    "期間重複整理後:",
    f"{len(reports)}件"
)


# =========================================================
# SAVE REPORT LIST
# =========================================================

report_list = []


for report in reports:

    report_info = {

        "id":
            report.get("id"),

        "startTime":
            report.get("startTime"),

        "endTime":
            report.get("endTime"),

        "createTime":
            report.get("createTime"),

        "downloadUrl":
            report.get("downloadUrl")
    }

    report_list.append(
        report_info
    )


with open(
    REPORT_LIST_PATH,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        report_list,
        f,
        ensure_ascii=False,
        indent=2
    )


print()
print(
    f"{REPORT_LIST_PATH} "
    "を保存しました"
)


# =========================================================
# NO REPORT
# =========================================================

if not reports:

    print()
    print(
        "まだReachレポートは"
        "生成されていません"
    )

    raise SystemExit(0)


# =========================================================
# REFRESH ACCESS TOKEN
# =========================================================

credentials.refresh(
    Request()
)


# =========================================================
# DOWNLOAD ALL REPORTS
# =========================================================

print()
print(
    "Reachレポートを"
    "すべて取得します"
)


all_rows = []

successful_reports = 0
failed_reports = 0


for index, report in enumerate(
    reports,
    start=1
):

    download_url = report.get(
        "downloadUrl"
    )

    start_time = report.get(
        "startTime",
        ""
    )

    if not download_url:

        print(
            f"[{index}/{len(reports)}] "
            f"{start_time} "
            "Download URLなし"
        )

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
            f"{start_time} "
            f"{len(rows)}行"
        )

    except Exception as error:

        failed_reports += 1

        print(
            f"[{index}/{len(reports)}] "
            f"{start_time} "
            "取得失敗:"
        )

        print(
            f"  {error}"
        )


print()
print(
    f"取得成功: "
    f"{successful_reports}件"
)

print(
    f"取得失敗: "
    f"{failed_reports}件"
)

print(
    f"RAWデータ総数: "
    f"{len(all_rows)}行"
)


# =========================================================
# SAVE ALL RAW ROWS
# =========================================================

with open(
    RAW_ROWS_PATH,
    "w",
    encoding="utf-8"
) as f:

    json.dump(
        all_rows,
        f,
        ensure_ascii=False,
        indent=2
    )


print()
print(
    f"{RAW_ROWS_PATH} "
    "を保存しました"
)


# =========================================================
# VALIDATE COLUMNS
# =========================================================

required_columns = {
    "date",
    "video_id",
    "video_thumbnail_impressions",
    "video_thumbnail_impressions_ctr"
}


if all_rows:

    actual_columns = set(
        all_rows[0].keys()
    )

    missing_columns = (
        required_columns
        - actual_columns
    )

    if missing_columns:

        print()
        print(
            "必要なカラムがありません:"
        )

        for column in sorted(
            missing_columns
        ):
            print(
                f"  - {column}"
            )

        raise RuntimeError(
            "Reach report column error"
        )


# =========================================================
# AGGREGATE
#
# date × video_id
#
# impressions:
#   合計
#
# click rate:
#   impressions加重平均
#
# CTR raw value:
#   0 ～ 1
#
# 例:
#   0.1111 = 11.11%
# =========================================================

aggregate = defaultdict(
    lambda: {
        "impressions": 0,
        "weightedClickRate": 0.0
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
            "video_thumbnail_impressions"
        )
    )

    click_rate = safe_float(
        row.get(
            "video_thumbnail_impressions_ctr"
        )
    )

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
        "weightedClickRate"
    ] += (
        impressions
        * click_rate
    )


# =========================================================
# CREATE DAILY OUTPUT
# =========================================================

daily_rows = []


for (
    date_value,
    video_id
), values in aggregate.items():

    impressions = values[
        "impressions"
    ]

    if impressions > 0:

        click_rate = (
            values[
                "weightedClickRate"
            ]
            / impressions
        )

    else:

        click_rate = 0.0


    daily_rows.append(
        {
            "date":
                date_value,

            "videoId":
                video_id,

            "thumbnailImpressions":
                impressions,

            # 0～1
            "thumbnailClickRate":
                round(
                    click_rate,
                    8
                ),

            # サイト表示用 %
            "thumbnailClickRatePercent":
                round(
                    click_rate * 100,
                    2
                )
        }
    )


daily_rows.sort(
    key=lambda row: (
        row["date"],
        row["videoId"]
    )
)


# =========================================================
# VIDEO SUMMARY
# =========================================================

video_summary_temp = defaultdict(
    lambda: {
        "impressions": 0,
        "weightedClickRate": 0.0
    }
)


for row in daily_rows:

    video_id = row[
        "videoId"
    ]

    impressions = row[
        "thumbnailImpressions"
    ]

    click_rate = row[
        "thumbnailClickRate"
    ]

    video_summary_temp[
        video_id
    ][
        "impressions"
    ] += impressions

    video_summary_temp[
        video_id
    ][
        "weightedClickRate"
    ] += (
        impressions
        * click_rate
    )


video_summary = {}


for (
    video_id,
    values
) in video_summary_temp.items():

    impressions = values[
        "impressions"
    ]

    if impressions > 0:

        click_rate = (
            values[
                "weightedClickRate"
            ]
            / impressions
        )

    else:

        click_rate = 0.0


    video_summary[
        video_id
    ] = {
        "thumbnailImpressions":
            impressions,

        "thumbnailClickRate":
            round(
                click_rate,
                8
            ),

        "thumbnailClickRatePercent":
            round(
                click_rate * 100,
                2
            )
    }


# =========================================================
# SAVE SITE DATA
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
            min(dates)
            if dates
            else None,

        "lastDate":
            max(dates)
            if dates
            else None,

        "clickRateScale":
            "ratio_0_to_1"
    },

    "daily":
        daily_rows,

    "videos":
        video_summary
}


with open(
    DAILY_PATH,
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
    f"{DAILY_PATH} "
    "を保存しました"
)


# =========================================================
# RESULT
# =========================================================

print()
print(
    "================================"
)

print(
    "Reachデータ更新完了"
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
