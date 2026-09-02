# #切り抜くぞニアジョイ

GitHub Pagesで公開する静的サイトです。

## 構成

- `index.html` — サイト本体
- `style.css` — デザイン / レスポンシブ対応
- `script.js` — 表示・グラフ・サムネイルコレクション・自動分析
- `data.json` — YouTube APIで更新される初期データ
- `update_data.py` — YouTube Data API v3からデータ取得
- `.github/workflows/update.yml` — GitHub Actionsの自動更新

## YouTube API設定

GitHubリポジトリの **Settings → Secrets and variables → Actions** に以下を登録します。

- `YOUTUBE_API_KEY`
- `YOUTUBE_CHANNEL_ID`

## 自動更新

GitHub ActionsはJSTの12:00 / 16:00 / 20:00 / 00:00に実行します。

API取得時点の登録者数を、その時点ではなく **完了した直前のJST日付** に記録します。たとえば9/2 16:00の取得なら、履歴には9/1として記録します。

サイト上の「現在の登録者数」はAPI取得時点の値、「最新日の新規登録者数」は履歴上の最新日とその前日の差分です。

## GitHub Pages

GitHubの Settings → Pages から、公開元を対象ブランチのrootに設定してください。
