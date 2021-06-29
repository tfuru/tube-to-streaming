# tube-to-streaming

# 動作環境
Google App Engine 
- インスタンスクラス B1
-- 手動スケーリング 1

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
# gcloud --quiet app deploy

# サーバー & WebApp 
npm run publish
```

