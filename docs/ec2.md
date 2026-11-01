# Amazon Linux 2023 / Apache

公開サイト: https://llm-jp.com/llmjp
API: https://api.kcg.edu/llmjp

## 既存の稼働環境からの移行

EC2では現在、元の `llm-jp` リポジトリの `deploy/ec2-web-demo` ブランチを取得し、
HTMLを `/var/www/llmjp-web/` にコピーして稼働しています。
新リポジトリを別フォルダーに取得して `sudo sh scripts/install-static.sh` を実行すれば、
以降は新しいリポジトリから画面を更新できます。APIサーバー・DB・DNSの変更は不要です。
古いチェックアウトは移行後のログイン・生成・分析・履歴確認が済むまで残してください。

## 初回配置の再現

以下は今回確認した構成用の例です。別サーバーでは既存のVirtualHost・ProxyPass・443番待受を
先に確認し、既存サイトを上書きしないよう統合してください。

```bash
sudo dnf install -y httpd mod_ssl certbot python3-certbot-apache git ca-certificates
sudo httpd -S
sudo ss -ltnp
curl --fail --show-error https://api.kcg.edu/llmjp/health
```

DNSのllm-jp.comがEC2を指し、80/443の受信が許可されていることを確認します。
mod_sslが追加した `/etc/httpd/conf.d/ssl.conf` が存在しないlocalhost.crtを参照する場合、
未使用の標準設定であることを確認して拡張子を.conf.disabledに変更します。
既存のHTTPSサイト用設定は無効化しません。

### HTTPと既存Flask

既存環境のflaskapp.confは、127.0.0.1:8000へのルートProxyPassでした。
それを最初のHTTP VirtualHostへ移し、既存Flaskのデフォルト配送を維持しました。
作業前に元設定をバックアップし、設定の内容を確認してから配置してください。

```bash
sudo cp -an /etc/httpd/conf.d/flaskapp.conf /etc/httpd/conf.d/flaskapp.conf.before-llmjp
sudo install -m 644 deploy/ec2/apache-flask-default.conf /etc/httpd/conf.d/flaskapp.conf
sudo install -d -m 755 /var/www/letsencrypt
sudo install -m 644 deploy/ec2/apache-http.conf /etc/httpd/conf.d/llmjp-web.conf
sudo httpd -t
sudo httpd -S
```

Syntax OKを確認後にreloadし、証明書を取得します。HTTP側はACME認証用で、ログイン画面を配信しません。

```bash
sudo systemctl reload httpd
sudo certbot certonly --webroot -w /var/www/letsencrypt -d llm-jp.com
```

### HTTPSと画面

```bash
sudo sh scripts/install-static.sh
sudo install -d -m 755 /etc/httpd/llmjp
sudo install -m 644 deploy/ec2/apache-routes.inc /etc/httpd/llmjp/apache-routes.inc
sudo install -m 644 deploy/ec2/apache-https.conf /etc/httpd/conf.d/llmjp-web-https.conf
```

他の有効設定にListen 443がない場合のみ、次を配置します。今回のEC2では
標準ssl.confを無効化したため、独立したListen設定が必要でした。

```bash
sudo install -m 644 deploy/ec2/apache-listen.conf /etc/httpd/conf.d/llmjp-listen.conf
sudo httpd -t
sudo httpd -S
```

Syntax OKを確認後に反映します。

```bash
sudo systemctl reload httpd
curl --fail --show-error https://llm-jp.com/llmjp/health
```

既存FlaskのURLと、LLM-JPのログイン・生成・分析・保存・履歴・PDFも確認してください。
healthだけでは認証やAI生成の成功は確認できません。
EC2でSELinuxによる拒否がある場合はファイルラベル・監査ログ・必要な通信ポリシーを確認します。

### 証明書更新

Certbotが登録した更新タスクを確認し、証明書更新後にApacheが再読み込みされるようフックを配置します。

```bash
sudo install -d /etc/letsencrypt/renewal-hooks/deploy
sudo install -m 755 deploy/ec2/renew-httpd.sh /etc/letsencrypt/renewal-hooks/deploy/llmjp-httpd
systemctl list-timers --all | grep -i certbot
sudo certbot renew --dry-run
```

フック自体の確認には `sudo sh deploy/ec2/renew-httpd.sh` を使います（実際にreloadします）。
定期更新タスクがない場合は、パッケージの提供するsystemd timerを確認して有効にしてください。

## 構成

ApacheはHTML4つの完全一致パスをローカル配信し、残りの /llmjp/ を
api.kcg.eduに中継します。認証ヘッダー・クエリーを維持し、上流の証明書とホスト名を検証します。
APIのDBは共用です。デモでは専用アカウントと架空データを使用してください。
Apache設定・証明書・データベースの実ファイルはGitには保存しません。

通常の画面更新:

```bash
cd ~/llm-jp-web
git pull --ff-only origin main
sudo sh scripts/install-static.sh
```

HTMLだけならApacheのreloadやDockerビルドは不要です。
