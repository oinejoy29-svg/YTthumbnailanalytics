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
