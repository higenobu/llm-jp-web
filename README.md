# LLM-JP Web

LLM-JPのブラウザ画面と、Amazon Linux 2023 / Apache向け配置設定です。
移行先リポジトリ: `higenobu/llm-jp-web`。

## 画面

- `/llmjp`: 文章生成、JSON/Markdown/PDF保存
- `/llmjp/classify`: 文書の機密判定、PDFからの入力
- `/llmjp/personality`: 20問の質問票、採点、保存・推移、CSV/PDF出力
- `/llmjp/personality/text`: 文章分析、保存・検索・推移、CSV/PDF出力

HTML/CSS/JavaScriptはEC2のApacheから配信し、AI処理・認証・データ保存は
`https://api.kcg.edu/llmjp` の既存APIを利用します。Web用EC2にGPU・Dockerは不要です。
画面とAPIはApacheのリバースプロキシで同一オリジンになります。

## 更新済みEC2への移行

```bash
git clone https://github.com/higenobu/llm-jp-web.git ~/llm-jp-web
cd ~/llm-jp-web
sudo sh scripts/install-static.sh
```

このスクリプトは公開HTML4つだけを置き換えます。既に動いているApache設定は変更しません。
ブラウザをCtrl+Shift+Rで更新してください。初回配置・設定の再現は
[EC2手順](docs/ec2.md)を参照してください。

## 開発とテスト

```bash
npm ci
npm test
```

Node.jsはテスト用です。配信中のEC2でNode.jsを常駐させる必要はありません。
DOMテストにはモックを利用します。実際のAPI・DB・PDF印刷は別途確認してください。

`tests/fixtures/questionnaires.json` はテスト専用の質問セットです。
本番の質問セットはAPIが管理するため、Webリポジトリ側のfixture編集では変更されません。

## 出典

Web画面とテストは `higenobu/llm-jp` のコミット
`54c552374d62e1b9a060fe3b8f3dcef015ffffcd`、Apacheルーティングは同リポジトリの
`9041c956e767e1c145adc7438e3044bdc4a1d204` から分離しました。
APIのPythonコード・モデル・DB・秘密設定・元リポジトリのGit履歴は移行対象に含めません。
本番サーバー上で確認したHTTP振り分け、443番Listen、証明書更新フックを配置手順に追記しています。
