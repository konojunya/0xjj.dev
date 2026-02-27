---
title: "Cloud Run サイドカーを用いた\n責務の分離"
date: 2023-12-12
---

# Intro

[Google Developer Groups in Japan Advent Calendar 2023](https://adventar.org/calendars/9543) 12 日目の記事です。

「Cloud Run でサイドカーを使った責務の分離」と題して、Cloud Run サイドカーを構築するにはどのような手順で進めていけばいいのか。また、どんなことができるのかについて考えます。この記事では Google Cloud の全ての環境は Terraform によりコードで管理します。コンソールから行ったり、 gcloud コマンドを使って記事になっているものが多いためそれらを Terraform で書くとどうなるかも理解しやすくなるべくシンプルな形で実装していきます。

# Cloud Run マルチコンテナデプロイ

2023/11/23 Cloud Run のマルチコンテナデプロイが GA になりました🎉

https://cloud.google.com/run/docs/release-notes#November_13_2023

これがどんなものかを想像するには以下の資料が詳しく図解や活用方法が記載しているので参考にしてください。

https://cloud.google.com/blog/ja/products/serverless/cloud-run-now-supports-multi-container-deployments

このマルチコンテナデプロイは少し前からプレビューではあったので実際記事を探してみると事例がいくつか出てきます。その多くはロギングサービスをサイドカーにしたりとか、Data Dog Agent をサイドカーにデプロイしたりなどが目立ちます。

参考記事は以下になります。

- https://zenn.dev/google_cloud_jp/articles/20230516-cloud-run-otel
- https://qiita.com/AoTo0330/items/35a840462f219596e39d
- https://zenn.dev/google_cloud_jp/articles/grpc-web-with-envoy-using-cloud-run-sidecar
- https://blog.g-gen.co.jp/entry/cloudrun-with-alloydb-auth-proxy-using-sidecar

今回この記事ではもう少し思想っぽいことをやりたいと考えました。筆者は普段 CTO という役職にいますが現役の Web っ子フロントエンドエンジニアです。

## アプリケーションの中の責務の分離

一般的にアプリケーションには、ビジネスロジックが書かれている場所や他のサービスのユーティリティが書いてある部分、プレゼンテーションな部分（ここで言うプレゼンテーションな部分とは、フロントエンドにおいては UI などを指しておりバックエンドに関しては API のレスポンスの整形などを指している）などが存在します。その中で実際はもっと疎結合で良いけれど、密になってしまいがちな実装などがいくつか存在すると筆者は考えています。例としてあげると、Basic 認証などは特にいい例でしょう。

Next.js の Web アプリケーションを運用していて、特定の環境に対して [IAP](https://cloud.google.com/iap?hl=ja) などを活用することでアクセス制御をしたり、そこまでしてなくても Basic 認証をかけておくぐらいは行っていると想定しています。実際 Next.js で Basic 認証を実装しようとすると参考になるのは [vercel/examples](https://github.com/vercel/examples) の [basic-auth-password](https://github.com/vercel/examples/blob/main/edge-middleware/basic-auth-password/middleware.ts) あたりでしょう。実装は以下のようになります。

```ts:middleware.ts
import { NextRequest, NextResponse } from 'next/server'

export const config = {
  matcher: ['/', '/index'],
}

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization')
  const url = req.nextUrl

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')

    if (user === '4dmin' && pwd === 'testpwd123') {
      return NextResponse.next()
    }
  }
  url.pathname = '/api/auth'

  return NextResponse.rewrite(url)
}
```

実際この実装はよく見かけますが、本来アプリケーションの達成したい要件ではなくあくまで開発者や社内のパスワードを知っているメンバーにだけ閲覧させたいという理由でこの実装をしています。筆者は特定の環境の保護のためにアプリケーションロジックとは全く関係ない実装をしているため、やらなくて済むならやりたくないと考えています。ただし middleware.ts でやる意味がある場合もあります。TypeScript のエコシステムを活用しやすい環境であり、 TypeScript でこの middleware.ts にロジックを捩じ込みたい人も少なくないでしょう。

また最近の App Router 周りではここで HTTP Header を設定するパターンも見かけます。例えば Cache-Control などです。この Cache-Control の実装もまたどちらかと言えば外部向きの実装だと捉えることができます。この Cache-Control などは対ブラウザであったり、対 CDN に向けたものであることが多いためです。

これらの **「対外的実装」** をアプリケーションコードとは別で管理したいという発想からこの記事に至っています。

# 対外的実装のレイヤーを変える

今回例に出した 2 つはどちらもアプリケーションと言うよりは HTTP の概念で完結します。そのためレイヤーを 1 つあげて実装することで責務を分離します。イメージはこのような形です。

![](https://storage.googleapis.com/zenn-user-upload/44d043118690-20231202.png)

この対外的実装をサイドカーを用いて再構築してみます。

### Application の実装(Sidecar)

今回の記事ではアプリケーションの内情に関しては言及する部分がないため単純に `/` へのリクエストに対して `Hello Hono!` を返すだけの Node.js サーバーを建てます。

```shell
pnpm add hono @hono/node-server
```

Hono のインストールを終えたら `Hello Hono!` を返す実装をします。

```ts:src/index.ts
import {serve} from '@hono/node-server';
import {Hono} from 'hono';

const PORT = Number(process.env.PORT) || 8888;

const app = new Hono();
app.get('/', c => c.text('Hello Hono!'));

serve(
  {
    fetch: app.fetch,
    port: PORT,
    hostname: '0.0.0.0',
  },
  info => {
    console.log(`Listening on http://localhost:${info.port}`);
  }
);
```

### Proxy の実装(ingress)

INGRESS のリクエストを捌く Proxy サーバーを実装します。今回は nginx での実装を例にします。設定としては `:8080` ポートで nginx を建ててリクエストを `:8888` に流すだけになります。

:::message
`host.docker.internal` となっていますが、手元で動きを確認する際 Docker for Mac などで立ち上げたコンテナは hostname に `host.docker.internal` で振られるためこの設定をしています。Cloud Run などで動かす際には `127.0.0.1` になるので気をつけてください。
:::

```conf:proxy/nginx.conf
server {
  listen 8080;
  server_name _;
  gzip on;

  location / {
    proxy_pass   http://host.docker.internal:8888;
  }
}
```

Dockerfile を用意します。Google のドキュメントでは Secret Manager で conf 自体を管理してたりしますがアプリケーションと同じようにデプロイできた方が理解しやすいと思ったのでこの conf を COPY して nginx を起動するだけのものを作成します。

```Dockerfile:proxy/Dockerfile
FROM nginx:latest

EXPOSE 8080

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
```

## 手元で動きを把握する

上記まで設定できたら手元で nginx の挙動を確認したいので docker compose などで確認します。

```yaml:compose.yaml
version: '3'
services:
  proxy:
    container_name: proxy
    build: ./proxy
    ports:
      - '8080:8080'

  app:
    container_name: app
    build: .
    ports:
      - '8888:8888'
```

docker compose を立ち上げます。

```shell
docker compose up
```

今後 nginx の設定を変更して手元で確認する際は `--build` option をつけて docker image を再ビルドしないとすでに作られているコンテナイメージで起動するので注意してください。

起動後、無事 nginx から proxy されて動いていることを確認できたら Google Cloud 環境を作っています。

![](https://storage.googleapis.com/zenn-user-upload/9c0ebc13d45b-20231206.png)

## Google Cloud の設定

Google Cloud で扱うのはコンテナイメージを保存する場所として [Artifact Registry](https://cloud.google.com/artifact-registry?hl=ja)、そして [Cloud Run](https://cloud.google.com/run?hl=ja) の環境を作ります。

コンソールから作っても良いですが、コードになっていればそれをベースにコンソールから操作できるので、今回は全て Terraform による記述で実装します。

Terraform を実行するのは application-default に設定されている IAM や Service Account になるため適宜ログインしておいてください。サンプルで作る程度に抑えたいので今回は僕自身のアカウント（IAM）で全て手元のコンピュータから Terraform を実行します。そのため Service Account やそれを GitHub Actions でどう使うかなどは別の記事などを参考にしてください。

参考: https://github.com/google-github-actions/auth

手元で実行する場合、 `gcloud auth application-default login` にてアカウントの認証状態を作っておいてください。頻出する project id や region などを一旦変数に置きます。

```tf:terraform/variable.tf
variable "project_id" {
  description = "project id"
  type        = string
  default     = "cloudrun-v2-with-nginx"
}

variable "default_region" {
  description = "default region"
  type        = string
  default     = "asia-northeast1"
}
```

今回、Cloud Run multi container は GA になってますが現状まだ google-beta の provider が必要そうなので google-beta の provider も設定します。

```tf:terraform/main.tf
provider "google" {
  project = var.project_id
  region  = var.default_region
}

provider "google-beta" {
  project = var.project_id
  region  = var.default_region
}
```

### Artifact Registry

Artifact Registry の設定は以下のようにします。単純な Docker のイメージを sample という名前で管理しています。cleanup policy は適当にしてるので適宜自分のプロジェクトの設定に合わせてください。

```tf:terraform/main.tf
resource "google_artifact_registry_repository" "sample" {
  provider      = google-beta
  location      = var.default_region
  repository_id = "sample"
  description   = "sample project"
  format        = "DOCKER"

  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "keep_minimum-versions"
    action = "KEEP"
    most_recent_versions {
      keep_count = 3
    }
  }
}
```

ここまでで Artifact Registry の設定が完了しました。

![](https://storage.googleapis.com/zenn-user-upload/c0462a1809c7-20231206.png)

### Cloud Run

Cloud Run は今回のキモなので丁寧に設定していきます。まずはコンテナを 1 つ建てた場合の Cloud Run の設定を記述します。

```tf:terraform/main.tf
resource "google_cloud_run_v2_service" "sample" {
  provider = google-beta
  name     = "sample"
  location = var.default_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      name  = "app"
      image = "asia-northeast1-docker.pkg.dev/${var.project_id}/sample/app:latest"
      ports {
        container_port = 8080
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }
}
```

`ingress` というのを設定しますがこれは Cloud Run の ingress 設定です。今回は公開したいので `INGRESS_TRAFFIC_ALL` と設定しますが、ロードバランサーからのみ許可したいなどの場合は `INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER` とかになります。詳しい設定は [こちら](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service#ingress) を参照ください。

`traffic` に関してもリリースしたものに対して 100%のトラフィックを向けるだけに設定しています。詳しい設定は [こちら](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service#nested_traffic) から参照ください。

`template` ですが `scaling` はオートスケーリングの設定なのでマルチコンテナと関係なく存在します。今回は平常時 0、max で 1 台にしています。個人ブログなどはランニングコストをかけたくないのでオートスケーリングの設定を正しく行いましょう。サービス運営の場合は min に 1 やトラクションが大きく出てる場合は 2,3 などになるでしょう。

まずは single container なので `containers` が 1 つ存在します。 name はコンテナ名、image には Artifact Registry のコンテナを指します。ports で Cloud Run の ingress のポートを設定できます。今回はデフォルトである `8080` に設定しました。

今回 ingress container は nginx になるためマルチコンテナの設定に書き換えていきます。 template の containers として proxy を追加します。

```tf:terraform/main.tf
containers {
  name = "proxy"
  ports {
    container_port = 8080
  }
  image = "asia-northeast1-docker.pkg.dev/${var.project_id}/sample/proxy:latest"
}
```

先ほどの app コンテナの ports を削除します。その代わり `:8888` で起動させるために env を追加します。

```diff
    containers {
      name  = "app"
      image = "asia-northeast1-docker.pkg.dev/${var.project_id}/sample/app:latest"
-     ports {
-       container_port = 8080
-     }
+     env {
+       name = "PORT"
+       PORT = "8888"
+     }
    }
```

ここまでで Cloud Run を設定すると nginx が `:8080` で立ち上がり、 `:8888` に立つ hono へ proxy するような動きが再現できます。この時点での Cloud Run へアクセスするとリクエストを nginx が捌きますが、sidecar である Node.js が立ち上がっていないと nginx が 502 を返します。以下はその時のログです。

![](https://storage.googleapis.com/zenn-user-upload/b2777fd7c151-20231206.png)

下から 2 行目の `Listening on http:localhost:8888` 移行のリクエストでは `GET 200` を返していますがそれ以前は `GET 502` を返しています。

#### Cloud Run Sidecar の depends_on と health check

Cloud Run の立ち上げの際に nginx の依存として app の立ち上がりを待つように設定するときちんと新しいデプロイの時にもこの問題が起こらなくなります。Cloud Run ではリビジョンが作成できたかどうかのチェックとしてヘルスチェックをつけることができます。またマルチコンテナではコンテナ間の依存も記述できるようになっています。ヘルスチェックとコンテナ間の依存の設定を追加した template ブロックを以下にまとめます。

```tf:terraform/main.tf
template {
  // sidecar
  containers {
    name  = "app"
    image = "asia-northeast1-docker.pkg.dev/${var.project_id}/sample/app:latest"
    env {
      name  = "PORT"
      value = "8888"
    }
    // sidecar の health check を定義することで depends_on で依存を解決しようとした時に正しく動作することを保証できる
    startup_probe {
      timeout_seconds   = 240
      period_seconds    = 240
      failure_threshold = 1
      tcp_socket {
        port = 8888
      }
    }
  }

  // ingress
  containers {
    name = "proxy"
    image = "asia-northeast1-docker.pkg.dev/${var.project_id}/sample/proxy:latest"
    ports {
      container_port = 8080
    }
    // nginx は app の起動を依存とする
    depends_on = ["app"]
    startup_probe {
      timeout_seconds   = 240
      period_seconds    = 240
      failure_threshold = 1
      tcp_socket {
        port = 8080
      }
    }
  }
}
```

ここまでで Cloud Run のマルチコンテナの実装が完了しました。では nginx に様々な機能を持たせることで **対外的実装** の責務を分離していきます。

## マルチコンテナで Basic認証

最初に例がでていた Basic 認証のロジックを nginx に担ってもらいます。これにより `middleware.ts` から Basic 認証周りの実装を削除できて、完全にアプリケーションのことだけを考えるものにできます。ユーザー名: root、パスワードを password とした時の `.htpasswd` はこのようになります。 `.htpasswd` の生成などは nginx のドキュメントなどその他の資料を確認してください。またオンラインツールも存在するので活用してください。今回は単純に `.htpasswd` での Basic 認証を実装します。

```conf:proxy/.htpasswd
root:gzVPrnhc2MuBU
```

```diff:proxy/nginx.conf
server {
  listen 8080;
  server_name _;
  gzip on;

+  # basic auth
+  # ref: https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/
+  auth_basic "Basic Auth";
+  auth_basic_user_file /etc/nginx/.htpasswd;

  location / {
    proxy_pass   http://127.0.0.1:8888;
  }
}
```

```diff:proxy/Dockerfile
FROM nginx:latest

EXPOSE 8080

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
+COPY ./.htpasswd /etc/nginx/.htpasswd
```

設定をして再度 Cloud Run にデプロイすると以下のように 401 が返ってきています。

![](https://storage.googleapis.com/zenn-user-upload/132c61412dcf-20231206.png)

## マルチコンテナで Cache-Control 制御

Cache-Control を nginx 側で付与するように変更します。これにより `middleware.ts` の match などを使いながら設定しなくても path ベースで Cache-Control を変更できます。これによりアプリケーションの再デプロイを行わなくても ingress container の Artifact Registry へのデプロイとそのバージョンを使うように Cloud Run のリビジョンの変更をするだけにフローを改善できます。アプリケーションのビルドには時間がかかりがちですが、 `Cache-Control` を少し触りたいとかレスポンスヘッダーを少し変更したいパターンに対して運用上のコストも下げられるのではと筆者は考えています。

```diff:proxy/nginx.conf
server {
  listen 8080;
  server_name _;
  gzip on;

  # basic auth
  # ref: https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/
  auth_basic "Basic Auth";
  auth_basic_user_file /etc/nginx/.htpasswd;

  location / {
    proxy_pass   http://127.0.0.1:8888;

+    # Add Cache-Control header
+    add_header Cache-Control "s-maxage=86400, public" always;
  }
}
```

## マルチコンテナで Security Header 付与

Security Header というと難しそうですが Next.js のドキュメントにも載っているような一般的でとりあえず設定しておくのがよいとされているヘッダーをいくつか足してみます。例えば `X-Frame-Options` や `Strict-Transport-Security` などがここで話す Security Header になります。

```conf:proxy/security.conf
add_header X-DNS-Prefetch-Control "on" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

```diff:proxy/nginx.conf
server {
  listen 8080;
  server_name _;
  gzip on;

  # basic auth
  # ref: https://docs.nginx.com/nginx/admin-guide/security-controls/configuring-http-basic-authentication/
  auth_basic "Basic Auth";
  auth_basic_user_file /etc/nginx/.htpasswd;

  location / {
+    # Add Security headers
+    include /etc/nginx/security.conf;

    proxy_pass   http://127.0.0.1:8888;

    # Add Cache-Control header
    add_header Cache-Control "s-maxage=86400, public" always;
  }
}
```

```diff:proxy/Dockerfile
FROM nginx:latest

EXPOSE 8080

COPY ./nginx.conf /etc/nginx/conf.d/default.conf
COPY ./.htpasswd /etc/nginx/.htpasswd
+COPY ./security.conf /etc/nginx/security.conf
```

ここまでで今回のサンプルとしては実装完了になりました。ブラウザで確認してみましょう。

![](https://storage.googleapis.com/zenn-user-upload/c915b27e3bca-20231206.png)

# Outro

設定すると単純でありながら、この proxy は ingress のために実装したので、Go で自作の proxy を起動させてもうまく動く汎用性の高いインフラ設計になりました。

かなり詳しく書いたつもりですが、実際の Cloud Run のドキュメントにも「サービスに複数のコンテナをデプロイする（サイドカー）」として記載されています。これらを見てマルチコンテナの活用をぜひ行ってみてください。

https://cloud.google.com/run/docs/deploying?hl=ja#sidecars

また今回の実装の全ては以下においているので参考にご覧ください。

https://github.com/konojunya/cloudrun-v2-with-nginx/
