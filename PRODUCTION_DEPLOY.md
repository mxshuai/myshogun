# 生产环境全链路部署（ap-southeast-2）

适用于当前环境（**AWS 上尚未部署过旧栈，可直接用 visbuild 命名从零开始**）：

| 项 | 值 |
|----|-----|
| AWS Account ID | `124074140777` |
| Region | `ap-southeast-2`（悉尼） |
| Web | Amplify Hosting SSR（已部署，使用默认域名） |
| 数据面 CloudFormation 栈 | `visbuild-shopify-data` |
| DynamoDB 表 | `visbuild-shopify-app` |
| Publish Lambda | `visbuild-shopify-data-publish` |

---

## 部署前：本地 vs 生产 各管什么

```
┌──────────────────────────────────────────────────────────────────┐
│ 本地  npm run dev                                                 │
│  • 未设置 USE_AWS_DATA_LAYER → 数据在 .dev-data/*.json（mock）    │
│  • 定时发布 → 进程内 setTimeout（仅本机有效）                      │
│  • 改代码、看页面：http://localhost:5173                          │
│  • 与 AWS 生产数据完全隔离                                        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│ 生产  Amplify 默认域名（步骤 3 之后才切到 AWS 数据层）             │
│  • USE_AWS_DATA_LAYER=true → DynamoDB + Secrets Manager           │
│  • 定时发布 → EventBridge Scheduler → Lambda → Shopify            │
│  • /admin/* 管理店铺与页面                                        │
└──────────────────────────────────────────────────────────────────┘
```

**五步只影响「生产 + 你本机用来执行 AWS CLI 的环境」**；不强制改变本地 dev 的数据来源（除非你故意在本地也设 `USE_AWS_DATA_LAYER=true`）。

---

## 本地先验（推荐，减少反复 Redeploy）

1. 复制环境变量模板（仅本机）：

```powershell
copy .env.production.local.example .env.production.local
```

2. 填好 `.env.production.local`（尤其 `ADMIN_API_KEY`、`SCHEDULER_ROLE_ARN`）。
3. 启动本地生产模式（会先 build 再 start）：

```powershell
npm run start:local-prod
```

4. 新开一个终端跑冒烟验证：

```powershell
npm run verify:local-admin
```

通过后再 push 触发 Amplify，通常可把线上调试次数降到 1 次。

### 方案 C：不经过后台登录，验证写入 Shopify

在 `.env.production.local` 增加（**不要用** `ADMIN_API_KEY` 充当 Shopify Token）：

- `SHOPIFY_SHOP_DOMAIN` — 如 `your-store.myshopify.com`
- `SHOPIFY_ACCESS_TOKEN` — Custom App 的 `shpat_...`（需 `read_content` / `write_content`）
- 可选 `SHOPIFY_PAGE_GID` — 已有页面则填；不填则脚本自动 `pageCreate` 测试页

```powershell
npm run seed:publish-test
```

脚本会：写入 Secrets Manager → 写入 DynamoDB（shop/page/version/job）→ 调用 `visbuild-shopify-data-publish` → 轮询 job 是否 `done`。仅写入不调用 Lambda 时设 `SEED_SKIP_INVOKE=1`。

---

## 五步总览

| 步骤 | 在哪里操作 | 主要作用 |
|------|------------|----------|
| **1** | 本机终端 + AWS | 创建 DynamoDB、Lambda 骨架、IAM 角色、告警 |
| **2** | 本机终端 + AWS | 把「定时发布」Lambda 换成真实业务代码 |
| **3** | Amplify 控制台 | 告诉 SSR 应用连哪张表、哪个 Lambda、管理后台密钥 |
| **4** | IAM 控制台 | 允许 Amplify SSR 角色访问 DDB / Secrets / Scheduler |
| **5** | 浏览器 | 写入业务数据并验证 Shopify 全链路 |

---

## 步骤 1：部署数据面

### 你要执行的命令

```powershell
# 仓库根目录
npm run deploy:data-plane
```

等价于：

```powershell
aws cloudformation deploy `
  --template-file infra/template.yaml `
  --stack-name visbuild-shopify-data `
  --capabilities CAPABILITY_IAM `
  --parameter-overrides AppTableName=visbuild-shopify-app `
  --region ap-southeast-2
```

**若首次失败且栈状态为 `ROLLBACK_COMPLETE`：** 先删除再部署（脚本已自动处理），常见原因是模板里给 Lambda 设置了保留变量 `AWS_REGION`（已修复；Lambda 会自动注入该区域）。

成功后查看输出（记下两个 ARN）：

```powershell
aws cloudformation describe-stacks `
  --stack-name visbuild-shopify-data `
  --region ap-southeast-2 `
  --query "Stacks[0].Outputs" `
  --output table
```

### 命令在做什么

| 动作 | 说明 |
|------|------|
| 读取模板 | [`infra/template.yaml`](infra/template.yaml) 定义要创建的云资源 |
| `cloudformation deploy` | 在 `ap-southeast-2` 创建或更新栈 `visbuild-shopify-data` |
| `CAPABILITY_IAM` | 允许模板自动创建 IAM Role（Lambda 与 Scheduler 用） |
| `AppTableName=visbuild-shopify-app` | 指定 DynamoDB 物理表名 |

### AWS 上会发生什么（新建资源）

| 资源 | 名称 / 标识 | 作用 |
|------|-------------|------|
| **CloudFormation 栈** | `visbuild-shopify-data` | 统一管理下面资源的创建与更新 |
| **DynamoDB 表** | `visbuild-shopify-app` | 存店铺、页面、版本快照、定时任务（PK/SK + GSI1） |
| **Lambda 函数** | `visbuild-shopify-data-publish` | 到点执行「把页面 HTML 推送到 Shopify」 |
| **IAM Role** | Lambda 执行角色 | 允许 Lambda 读写在 DDB、读写在 Secrets Manager |
| **IAM Role** | `…SchedulerInvokeRole…` | 允许 EventBridge Scheduler 调用 Publish Lambda |
| **CloudWatch Alarm** | 关联 Publish Lambda | Lambda 错误次数 ≥1 时告警（模板内已建） |

**此时尚未发生：**

- Amplify 应用配置不变（域名、构建方式不变）
- DynamoDB **表是空的**（无店铺、无页面）
- Secrets Manager **还没有** Shopify Token
- EventBridge **还没有** 任何 schedule（要等步骤 5 用户在后台点「定时更新」）
- Publish Lambda 里是**占位代码**，还不能真正发布（步骤 2 修复）

**控制台如何确认：**

- CloudFormation → 栈 `visbuild-shopify-data` → 状态 `CREATE_COMPLETE`
- DynamoDB → 表 `visbuild-shopify-app` 存在，项数为 0

### 本地环境会发生什么

| 变化 | 说明 |
|------|------|
| **终端输出** | 部署进度 + Outputs 表（`PublishLambdaArn`、`SchedulerRoleArn` 等） |
| **建议保存** | 把 Outputs 抄到记事本，步骤 3 填 Amplify 要用 |
| **`.dev-data/`** | **不变**；本地 dev 仍用 mock |
| **`npm run dev`** | **不变**；不自动连 AWS |
| **Git 仓库** | **不变**（除非你自己 commit） |
| **账单** | 开始产生 DDB（按量）、Lambda（几乎为 0，未 invoke 时）、CFN 无持续费用 |

---

## 步骤 2：上传 Publish Lambda 真实代码

### 你要执行的命令

```powershell
npm run deploy:publish-lambda
```

内部顺序：

1. `npm run build:lambda` — esbuild 打包 [`app/functions/publish.ts`](app/functions/publish.ts)
2. 压缩为 `infra/dist/publish.zip`
3. `aws lambda update-function-code --function-name visbuild-shopify-data-publish …`

### 命令在做什么

| 动作 | 说明 |
|------|------|
| esbuild | 把 `publishPageVersion`（读 job → 读版本 → 调 Shopify `pageUpdate`）打成 Node 20 包 |
| `update-function-code` | **只替换** Lambda 里的代码 zip，不改函数名、环境变量、执行角色 |

### AWS 上会发生什么

| 变化 | 说明 |
|------|------|
| **仅** `visbuild-shopify-data-publish` 代码更新 | 从占位 `console.log` 变为可执行的发布逻辑 |
| Lambda 环境变量（模板已配） | `USE_AWS_DATA_LAYER=true`、`APP_TABLE_NAME=visbuild-shopify-app` 等保持 |
| **仍无** 业务数据 | DDB 仍空，除非步骤 5 写入 |
| **仍无** Schedule | 等用户在后台创建定时任务 |

**控制台如何确认：**

- Lambda → `visbuild-shopify-data-publish` → Code → Last modified 时间为刚才
- 可选：用测试事件 `{"jobId":"<uuid>"}` 测试（需 DDB 里已有对应 job，否则会报错，属正常）

### 本地环境会发生什么

| 路径 | 说明 |
|------|------|
| `infra/dist/publish/index.js` | 新建（已在 `.gitignore`，不提交） |
| `infra/dist/publish.zip` | 新建，用于上传 |
| `node_modules` | 仅构建时读取，无结构性变化 |
| **`.dev-data/`** | **不变** |
| **`npm run dev`** | **不变** |

---

## 步骤 3：Amplify 环境变量 + 重新部署

### 你要做的操作（Amplify 控制台，无必跑 CLI）

1. Amplify → 你的应用（`ap-southeast-2`）→ **Hosting** → **Environment variables**
2. 为**生产分支**添加或修改下表变量
3. **Save** 后点击 **Redeploy this version**（或 push Git 触发 [`amplify.yml`](amplify.yml) 构建）

### 环境变量表（生产必配）

| 变量 | 示例值 | 作用 |
|------|--------|------|
| `USE_AWS_DATA_LAYER` | `true` | SSR 使用 DynamoDB / Secrets / EventBridge，**不用**仓库内 JSON 当生产库 |
| `APP_AWS_REGION` | `ap-southeast-2` | AWS SDK 区域（**勿**用 `AWS_REGION`，Amplify 保留前缀会报错） |
| `APP_TABLE_NAME` | `visbuild-shopify-app` | 步骤 1 创建的表名 |
| `PUBLISH_LAMBDA_ARN` | 步骤 1 Output | 创建定时任务时指定触发哪个 Lambda |
| `SCHEDULER_ROLE_ARN` | 步骤 1 Output | Scheduler 代你 Invoke Lambda 的角色 |
| `ADMIN_API_KEY` | 你自建的随机串 | 保护 `/admin/*`（登录或 `X-Admin-Key` 头） |
| `SHOPIFY_TOKEN_SECRET_PREFIX` | `visbuild-shopify/token` | Token 存入 Secrets Manager 时的名称前缀 |

**不要**把 Shopify Admin Token 写进 Amplify 变量；应在 `/admin/shops` 保存（会进 Secrets Manager）。

**可选（全链路不强制）：** `ASSETS_BUCKET_NAME` — 不配则不用 S3 预签上传。

### 重新部署时命令在 AWS 上做什么（Amplify 自动）

[`amplify.yml`](amplify.yml) 在 Amplify 构建机上执行：

| 阶段 | 命令 | 作用 |
|------|------|------|
| preBuild | `nvm use 20`、`npm ci` | 安装依赖 |
| build | `npm run build` | 生成 `.amplify-hosting`（SSR + 静态资源） |
| 发布 | Amplify 托管 | 用新 env 启动 SSR 计算实例 |

### AWS 上会发生什么

| 变化 | 说明 |
|------|------|
| **Amplify 应用配置** | 分支上写入上述环境变量 |
| **新的 Hosting 部署版本** | 新 SSR 进程启动时读取 `USE_AWS_DATA_LAYER=true` |
| **运行时行为** | `/admin/shops`、`/admin/pages/*` 通过 [`factory.ts`](app/lib/server/factory.ts) 走 **DDB 实现** |
| **公开页面** `/pages`、`/edit` 等 | 仍可用原有 `database.json` 逻辑（演示路径），与 admin 数据面分离 |
| **DDB / Lambda** | 资源已在步骤 1–2 存在；此步是**让 Amplify 去连它们** |

**若只改变量不 Redeploy：** 旧 SSR 进程可能仍用旧配置，**必须重新部署**。

**控制台如何确认：**

- Amplify → 最近一次 Deploy → Succeed
- 访问 `https://<默认域名>/admin/shops`（若已设 `ADMIN_API_KEY` 会先跳登录）

### 本地环境会发生什么

| 项 | 说明 |
|------|------|
| **默认无变化** | 本地未设上述变量时，`npm run dev` 仍用 `.dev-data/` |
| **Git** | 仅当你 push 触发构建时，远程仓库参与 Amplify build |
| **可选** | 本地 `.env` 设同样变量可调试生产 DDB（慎用，会写真数据） |

---

## 步骤 4：Amplify SSR 执行角色 IAM

### 方式 A（推荐）：先在 IAM 建角色，再在 Amplify 里选择

**1. IAM 创建角色**

- IAM → **Roles** → **Create role**
- **Trusted entity**：**Custom trust policy**，粘贴 [`infra/amplify-compute-trust-policy.json`](infra/amplify-compute-trust-policy.json)
- **Permissions**：先不挂托管策略，直接 **Next**
- **Role name**：例如 `myshogun-amplify-compute-role` → **Create role**

**2. 给该角色加两条内联策略**

在同一角色上 **Add permissions** → **Create inline policy** → JSON，各建一条：

| 策略名建议 | JSON 文件 |
|------------|-----------|
| `VisbuildSSRDataAccess` | [`infra/amplify-ssr-iam-policy.json`](infra/amplify-ssr-iam-policy.json) |
| `VisbuildSSRPassSchedulerRole` | [`infra/amplify-compute-passrole-policy.json`](infra/amplify-compute-passrole-policy.json) |

**3. Amplify 绑定 Compute role**

- Amplify → **myshogun** → **App settings** → **IAM roles** → **Compute role** → **Edit**
- **Default role** → **Use an existing role** → 选 `myshogun-amplify-compute-role` → 保存

**4. Redeploy** 一次 master 分支，使 SSR 使用新角色。

### 方式 B：在 Amplify 里点「Create new role」

由 Amplify 自动创建角色后，再到 IAM 给该角色粘贴上述两份 JSON 内联策略（勿选 `PublishLambdaRole`）。

### 方式 B 的补充说明

1. Amplify → **App settings** → 找到 SSR / Compute 的 **Service role** 或 **Execution role** 名称  
2. IAM → **Roles** → 打开该角色 → **Add permissions** → **Create inline policy** → JSON  
3. 粘贴 [`infra/amplify-ssr-iam-policy.json`](infra/amplify-ssr-iam-policy.json)  
4. 若步骤 5 创建 Schedule 时报 `PassRole`，再粘贴 [`infra/amplify-compute-passrole-policy.json`](infra/amplify-compute-passrole-policy.json)

PassRole 示例（资源名请与 IAM 控制台实际角色 ARN 对齐）：

```json
{
  "Effect": "Allow",
  "Action": "iam:PassRole",
  "Resource": "arn:aws:iam::124074140777:role/visbuild-shopify-data-SchedulerInvokeRole-*",
  "Condition": {
    "StringEquals": {
      "iam:PassedToService": "scheduler.amazonaws.com"
    }
  }
}
```

### 在做什么

Amplify 上的 Node SSR **不是**你本机 `aws configure` 的用户，而是 **Amplify 托管 IAM 角色**。  
步骤 3 之后，该角色需要代表应用去：

| 权限 | 用途 |
|------|------|
| DynamoDB 读写 `visbuild-shopify-app` | 店铺、页面、版本、任务 |
| Secrets Manager `visbuild-shopify/token/*` | 存取 Shopify Token |
| Scheduler Create/Delete/Get | 用户点「Schedule Update」时创建 schedule |
| `iam:PassRole`（如需） | 把 `SchedulerInvokeRole` 交给 Scheduler 服务 |

### AWS 上会发生什么

| 变化 | 说明 |
|------|------|
| **仅 IAM 策略** | 附加在 Amplify SSR 角色上 |
| **不创建** 新表、新 Lambda、新 Amplify 应用 |
| **不产生** 本地文件 |

**未做此步时的典型报错：** `AccessDeniedException`（保存店铺、导入、定时）。

### 本地环境会发生什么

**完全无变化。** 纯云端权限。

---

## 步骤 5：业务验收（浏览器全链路）

### 你要做的操作

使用 Amplify **默认域名**（无需自定义域名）：

| 顺序 | URL / 操作 | 验证目标 |
|------|------------|----------|
| 1 | `/admin/login` | `ADMIN_API_KEY` 生效 |
| 2 | `/admin/shops` | 添加店铺、粘贴 Token、**Verify token** |
| 3 | `/admin/shops/<shopId>/pages` | **Import all from Shopify** |
| 4 | `/admin/pages/<pageId>` | Puck 编辑 → **Publish Now** |
| 5 | 同上 | **Schedule Update**（约 2 分钟后）→ Shopify 内容更新 |

### 每一步：AWS 与外部系统变化

| 用户操作 | AWS 变化 | Shopify |
|----------|----------|---------|
| 保存 Token | Secrets Manager：`visbuild-shopify/token/...`；DDB `SHOP#<id>` 元数据 | 无 |
| Verify token | SSR 用 Token 调 GraphQL `shop { name }` | 读店铺 |
| Import pages | DDB 写入 `PAGE#...`、页面 body（Visbuild/RawHTML 数据） | `pages` 查询 |
| Publish Now | DDB 版本快照；SSR `pageUpdate` | 页面 HTML 更新 |
| Schedule Update | DDB `JOB#...`；EventBridge schedule `visbuild-publish-<jobId>`；到点 Lambda 执行 | 到点 `pageUpdate` |

**控制台观察点：**

- DynamoDB → `visbuild-shopify-app` 有数据项  
- EventBridge Scheduler → schedule 列表  
- Lambda → `visbuild-shopify-data-publish` → Monitor → CloudWatch Logs  
- Secrets Manager → `visbuild-shopify/token/...`  

### 本地环境会发生什么

| 项 | 说明 |
|------|------|
| **`.dev-data/`** | **通常不变**（生产数据在悉尼 DDB） |
| **浏览器** | 仅访问 Amplify URL，不写本机 JSON |
| **Shopify 后台** | 能看到页面内容变化（最终验收） |

---

## 五步完成后的状态对照

| 维度 | 步骤 0（仅 Amplify 演示） | 五步完成后（生产全链路） |
|------|---------------------------|---------------------------|
| Web 入口 | Amplify 默认域名 | 同左 |
| 管理后台数据 | 若未开 AWS：无 `/admin` 真数据 | DDB `visbuild-shopify-app` |
| Token | 无 / 仅本地 dev | Secrets Manager |
| 立即发布 | 仅本地或旧 JSON 演示 | SSR → Shopify API |
| 定时发布 | 不可靠（进程内 timer） | EventBridge → Lambda |
| 本地 `npm run dev` | `.dev-data` mock | **仍可** mock，与生产隔离 |

---

## 你需要提前准备（勿提交 Git）

1. Shopify **Custom App** + **Admin API Access Token**（`read_content` / `write_content`）
2. **`ADMIN_API_KEY`** 随机长字符串
3. 本机 AWS CLI 已登录账号 `124074140777`，Region `ap-southeast-2`：

   ```powershell
   aws sts get-caller-identity
   aws configure set region ap-southeast-2
   ```

---

## 故障排查

| 现象 | 检查 |
|------|------|
| 管理后台像「没数据」 | `USE_AWS_DATA_LAYER=true` 且 Amplify 已 Redeploy |
| AccessDenied | 步骤 4 IAM 是否挂在 **Amplify SSR 角色**（不是 CLI 用户） |
| 定时不到点 | `PUBLISH_LAMBDA_ARN`、`SCHEDULER_ROLE_ARN`；步骤 2 Lambda 是否已更新代码 |
| Shopify 401/404 | Token、scope、店铺域名 `*.myshopify.com` |
| 本地缺包 | `npm install`（含 `@aws-sdk/client-s3` 等） |

---

## ARN 速查（ap-southeast-2）

- DynamoDB：`arn:aws:dynamodb:ap-southeast-2:124074140777:table/visbuild-shopify-app`
- Secrets：`arn:aws:secretsmanager:ap-southeast-2:124074140777:secret:visbuild-shopify/token/*`
- Scheduler schedule 名称前缀：`visbuild-publish-`

---

## 相关文件

- [`amplify.yml`](amplify.yml) — Amplify 构建  
- [`infra/template.yaml`](infra/template.yaml) — 步骤 1 模板  
- [`infra/amplify-ssr-iam-policy.json`](infra/amplify-ssr-iam-policy.json) — 步骤 4  
- [`DEPLOYMENT.md`](DEPLOYMENT.md) — Amplify Hosting 说明  
