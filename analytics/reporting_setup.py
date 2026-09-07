import os
import json

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


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


# Reach系だけ表示
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


# 確認用JSON
with open(
    "analytics/report_types.json",
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
    "analytics/report_types.json "
    "を保存しました"
)
# =========================================================
# CREATE / FIND REACH REPORT JOB
# =========================================================

TARGET_REPORT_TYPE = "channel_reach_combined_a1"

print()
print(
    f"対象レポート: {TARGET_REPORT_TYPE}"
)


# 既存ジョブを取得
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
# 既存ジョブがあれば再利用
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
# なければ新規作成
# =========================================================

else:

    print()
    print(
        "Reachジョブがないため新規作成します"
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
# JOB情報保存
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
    "analytics/reporting_job.json",
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
    "analytics/reporting_job.json "
    "を保存しました"
)
# =========================================================
# LIST GENERATED REPORTS
# =========================================================

job_id = existing_job.get("id")

print()
print("生成済みReachレポートを確認します")


reports_response = (
    reporting
    .jobs()
    .reports()
    .list(
        jobId=job_id
    )
    .execute()
)


reports = reports_response.get(
    "reports",
    []
)


print()
print(
    f"生成済みレポート: {len(reports)}件"
)


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


    print()
    print(
        "期間:",
        report.get("startTime"),
        "～",
        report.get("endTime")
    )

    print(
        "Download URL:",
        "あり"
        if report.get("downloadUrl")
        else "なし"
    )


# =========================================================
# SAVE REPORT LIST
# =========================================================

with open(
    "analytics/reporting_reports.json",
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
    "analytics/reporting_reports.json "
    "を保存しました"
)


if reports:

    print()
    print(
        "Reachレポート取得準備OK"
    )

else:

    print()
    print(
        "まだReachレポートは生成されていません"
    )
# =========================================================
# DOWNLOAD LATEST REACH REPORT
# =========================================================

import csv
import io
import requests


if reports:

    # createTimeが新しいものを優先
    latest_report = max(
        reports,
        key=lambda report:
            report.get(
                "createTime",
                ""
            )
    )

    download_url = latest_report.get(
            "downloadUrl"
        )

    if not download_url:

        print()
        print(
            "最新レポートに "
            "Download URL がありません"
        )

    else:

        print()
        print(
            "最新Reachレポートを"
            "ダウンロードします"
        )

        # OAuthアクセストークンを更新
        from google.auth.transport.requests import Request

        credentials.refresh(
            Request()
        )

        response = requests.get(
            download_url,
            headers={
                "Authorization":
                    f"Bearer {credentials.token}"
            },
            timeout=60
        )

        response.raise_for_status()

        csv_text = response.text


        # =====================================================
        # RAW CSV保存
        # =====================================================

        with open(
            "analytics/reach_report.csv",
            "w",
            encoding="utf-8",
            newline=""
        ) as f:

            f.write(
                csv_text
            )


        print(
            "analytics/reach_report.csv "
            "を保存しました"
        )


        # =====================================================
        # CSV → JSON
        # =====================================================

        reader = csv.DictReader(
                io.StringIO(
                    csv_text
                )
            )

        reach_rows = list(reader)


        with open(
            "analytics/reach_report.json",
            "w",
            encoding="utf-8"
        ) as f:

            json.dump(
                reach_rows,
                f,
                ensure_ascii=False,
                indent=2
            )


        print(
            "analytics/reach_report.json "
            "を保存しました"
        )

        print()
        print(
            f"Reachデータ: "
            f"{len(reach_rows)}行"
        )


        # =====================================================
        # COLUMN確認
        # =====================================================

        if reach_rows:

            print()
            print(
                "取得できたカラム:"
            )

            for column in (
                reach_rows[0]
                .keys()
            ):

                print(
                    f"  - {column}"
                )

        else:

            print()
            print(
                "CSV内にデータ行がありません"
            )


else:

    print()
    print(
        "レポート生成待ちのため"
        "ダウンロード処理はスキップします"
    )
