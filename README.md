# #切り抜くぞニアジョイ

GitHub Pagesで公開するYouTube切り抜きチャンネル分析サイトです。

## ファイル
- `index.html` — 画面構成
- `style.css` — デザイン
- `script.js` — 表示・グラフ・コラージュ
- `data.json` — YouTubeから取得したデータ
- `update_data.py` — YouTube Data API取得
- `.github/workflows/update.yml` — 12/16/20/0時(JST)の自動更新

## GitHub設定
1. GitHubで新しい空リポジトリを作る。
2. このフォルダの中身をそのままアップロード。
3. Settings → Secrets and variables → Actions → New repository secret
4. 名前を `YOUTUBE_API_KEY` にしてYouTube Data API v3のAPIキーを登録。
5. Actionsのworkflowを一度 `Run workflow` して動作確認。
6. Settings → Pages → Deploy from a branch → `main` / `/ (root)` を選択。

## メモについて
現在の「一言分析」は、ブラウザの `localStorage` に保存します。
GitHub上の `memo.json` をブラウザから直接書き換えるには、公開サイトに書き込み権限を持つGitHubトークンを埋め込まない安全なバックエンドが必要です。そのため、今回は安全性を優先して端末保存にしています。
