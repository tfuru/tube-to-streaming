# tube-to-streaming

Unity VideoPlayer で YouTube 動画を再生させるための 中継サーバー 

# Unity側 環境
下記の環境は動作確認済み
- Windows
- Android
- iOS / M1 macbook 

# 動作環境
Google App Engine 
- node.js 14
- インスタンスクラス B1  
  手動スケーリング 1

# 開発環境
- Google Cloud SDK  
  gcloud コマンドライン ツール  
  https://cloud.google.com/sdk?hl=ja  

# ビルド
```
# WebApp
cd webapp
npm run build
```

# デプロイ

```
# サーバー部分のみ
npm run deploy

# サーバー & WebApp すべて
npm run publish
```
