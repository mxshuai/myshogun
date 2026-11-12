# AWS 生产环境全链路部署（ap-southeast-2）

适用于当前环境（**AWS 上尚未部署过旧栈，可直接用 visbuild 命名从零开始**）：

| 项 | 值 |
|----|-----|
| AWS Account ID | `124074140777` |
| Region | `ap-southeast-2`（悉尼） |
| Web | Amplify Hosting SSR（已部署，使用默认域名） |
| 数据面 CloudFormation 栈 | `visbuild-shopify-data` |
| DynamoDB 表 | `visbuild-shopify-app` |
| Publish Lambda | `visbuild-shopify-data-publish` |
| S3 媒体桶 | `visbuild-media-124074140777`（Shogun 图片；由数据面栈创建） |


---

## 五步总览

| 步骤 | 在哪里操作 | 主要作用 |
|------|------------|----------|
| **1** | 本机终端 + AWS CLI | 创建 DynamoDB、Lambda 骨架、IAM 角色、告警 |
| **2** | 本机终端 + AWS CLI | 上传 Publish / Schedule Lambda 真实代码 |
| **3** | Amplify 控制台 | SSR 连接表、Lambda、Shopify OAuth 配置 |
| **4** | IAM 控制台 | Amplify SSR 角色访问 DDB / Secrets / Invoke Schedule Lambda |
| **5** | 浏览器（Amplify 域名） | 写入业务数据并验证 Shopify 全链路 |

---

## 步骤 1：部署数据面

### 你要执行的命令

```powershell
# 仓库根目录 — 推荐：数据面 + 两个 Lambda 代码包 + S3 媒体桶 + IAM 策略生成
npm run deploy:aws
```

仅更新 CloudFormation（含 S3 媒体桶）：

```powershell
npm run deploy:data-plane
```

配置见 [`infra/deploy.config.json`](infra/deploy.config.json)（桶名、CORS 来源、Amplify 域名）。脚本会自动传入 `AssetsBucketName` 与 `AssetsCorsAllowedOrigins`。

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
| **Lambda 函数** | `visbuild-shopify-data-schedule` | SSR Invoke，创建/删除 EventBridge Schedule |
| **IAM Role** | Lambda 执行角色 | 允许 Lambda 读写在 DDB、读写在 Secrets Manager |
| **IAM Role** | `…SchedulerInvokeRole…` | 允许 EventBridge Scheduler 调用 Publish Lambda |
| **CloudWatch Alarm** | 关联 Publish Lambda | Lambda 错误次数 ≥1 时告警（模板内已建） |

**此时尚未发生：**

- Amplify 应用配置不变（域名、构建方式不变）
- DynamoDB **表是空的**（无店铺、无页面）
- Secrets Manager **还没有** Shopify Token
- EventBridge **还没有** 任何 schedule（要等步骤 5 用户在后台点「定时更新」）
- Publish / Schedule Lambda 里是**占位代码**，还不能真正发布（步骤 2 修复）

**控制台如何确认：**

- CloudFormation → 栈 `visbuild-shopify-data` → 状态 `CREATE_COMPLETE`
- DynamoDB → 表 `visbuild-shopify-app` 存在，项数为 0

**Lambda 运行时：** 模板为 **nodejs22.x**；步骤 1 更新栈后 Runtime 生效，步骤 2 上传与 `node22` 目标一致的 CJS 包。

---

## 步骤 2：上传 Publish Lambda 真实代码

### 你要执行的命令

```powershell
npm run deploy:publish-lambda
```

部署脚本会在上传前自动执行 `npm run verify:lambda-bundle`（禁止 ESM 包；Lambda 须 `--format=cjs`）。

内部顺序：

1. `npm run build:lambda` — esbuild 打包 [`app/functions/publish.ts`](app/functions/publish.ts)
2. 压缩为 `infra/dist/publish.zip`
3. `aws lambda update-function-code --function-name visbuild-shopify-data-publish …`

> `update-function-code` **只替换**代码 zip，不改 Runtime。若步骤 1 尚未把 Runtime 升到 22.x，请先 `npm run deploy:data-plane`。

### 命令在做什么

| 动作 | 说明 |
|------|------|
| esbuild | 把 `runScheduledJob`（读 job → 按 publish / unpublish 执行版本发布或下线 → 调 Shopify）打成 **Node 22** CJS 包 |
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

---

## 步骤 2b：上传 Schedule Lambda 真实代码

Amplify SSR **不能**直接 `iam:PassRole`（会话策略显式拒绝）。定时发布改为 SSR **Invoke** 本 Lambda，由它在独立执行角色下创建 EventBridge Schedule。

### 你要执行的命令

```powershell
npm run deploy:schedule-lambda
```

同样会跑 `verify:lambda-bundle`（publish + schedule 产物与 `package.json` 脚本格式）。

（需先执行步骤 1 更新 CloudFormation 栈，创建 `visbuild-shopify-data-schedule` 函数骨架。）

### AWS 上会发生什么

| 变化 | 说明 |
|------|------|
| **`visbuild-shopify-data-schedule` 代码更新** | 可执行 `CreateSchedule` / `DeleteSchedule` + `PassRole` |
| Lambda 环境变量（模板已配） | `PUBLISH_LAMBDA_ARN`、`SCHEDULER_ROLE_ARN`、`APP_AWS_REGION` |

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
| `PUBLISH_LAMBDA_ARN` | 步骤 1 Output | Publish Lambda（到点执行发布）；Schedule Lambda 环境变量也需要 |
| `SCHEDULER_ROLE_ARN` | 步骤 1 Output | EventBridge 调用 Publish Lambda 时使用的角色（配在 **Schedule Lambda** 环境，非 SSR PassRole） |
| `SCHEDULE_LAMBDA_ARN` | 步骤 1 Output `ScheduleLambdaArn` | SSR **Invoke** 以创建/取消定时任务（**生产定时必配**） |
| `SHOPIFY_TOKEN_SECRET_PREFIX` | `visbuild-shopify/token` | Token 存入 Secrets Manager 时的名称前缀 |
| `SHOPIFY_API_KEY` | Partners Client ID | Shopify OAuth 登录 |
| `SHOPIFY_API_SECRET` | Partners Client secret | 校验 callback / 换取 access token |
| `SCOPES` | `read_content,write_content,read_files` | OAuth 授权 scope；改完后店铺需重新走 OAuth，旧 token 不会自动获得新权限 |
| `SHOPIFY_APP_URL` | `https://<domain>` | OAuth 回调基准域名（仅 origin） |
| `ADMIN_AUTH_MODE` | *(可选)* `legacy` | 回滚开关：启用旧 `ADMIN_API_KEY` 登录 |

**不要**把 Shopify Admin Token 写进 Amplify 变量；OAuth callback 会自动写入 Secrets Manager。

**可选（全链路不强制）：** `ASSETS_BUCKET_NAME` — 不配则不用 S3 预签上传。

### Shopify Partners（非内嵌登录）配置

- **App URL**：`https://<你的域名>/auth/shopify/start`
- **Redirect URL**：`https://<你的域名>/auth/shopify/callback`
- **Embedded app**：关闭（non-embedded）
- OAuth 成功后会按 `state.next` 跳回站内路径（默认 `/`）。

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
| **`/pages`、编辑器、首页 `/`** | 整站需登录；数据按登录店铺隔离，经 [`page-service.server.ts`](app/lib/server/page-service.server.ts) 读写同一 DDB 表 |
| **DDB / Lambda** | 资源已在步骤 1–2 存在；此步是**让 Amplify 去连它们** |

**若只改变量不 Redeploy：** 旧 SSR 进程可能仍用旧配置，**必须重新部署**。

**控制台如何确认：**

- Amplify → 最近一次 Deploy → Succeed
- 访问 `https://<默认域名>/admin/shops`（默认会跳 Shopify OAuth，完成后回到站点）

---

## 步骤 4：Amplify SSR 执行角色 IAM

### 方式 A（推荐）：先在 IAM 建角色，再在 Amplify 里选择

**1. IAM 创建角色**

- IAM → **Roles** → **Create role**
- **Trusted entity**：**Custom trust policy**，粘贴 [`infra/amplify-compute-trust-policy.json`](infra/amplify-compute-trust-policy.json)
- **Permissions**：先不挂托管策略，直接 **Next**
- **Role name**：例如 `myshogun-amplify-compute-role` → **Create role**

**2. 给该角色加一条内联策略**

在同一角色上 **Add permissions** → **Create inline policy** → JSON：

| 策略名建议 | JSON 文件 |
|------------|-----------|
| `VisbuildSSRDataAccess` | [`infra/amplify-ssr-iam-policy.json`](infra/amplify-ssr-iam-policy.json) |

（已含 DDB、Secrets、`lambda:InvokeFunction` 到 `visbuild-shopify-data-schedule`。**勿**再给 compute 角色挂 `PassRole` / `scheduler:CreateSchedule`——Amplify 会话策略会拒绝 PassRole，且已由 Schedule Lambda 代为执行。）

**3. Amplify 绑定 Compute role**

- Amplify → **myshogun** → **App settings** → **IAM roles** → **Compute role** → **Edit**
- **Default role** → **Use an existing role** → 选 `myshogun-amplify-compute-role` → 保存

**4. Redeploy** 一次 master 分支，使 SSR 使用新角色。

### 方式 B：在 Amplify 里点「Create new role」

由 Amplify 自动创建角色后，再到 IAM 给该角色粘贴 [`infra/amplify-ssr-iam-policy.json`](infra/amplify-ssr-iam-policy.json)（勿选 `PublishLambdaRole` / `ScheduleLambdaRole`）。

### 在做什么

Amplify 上的 Node SSR 使用 **Amplify 托管 IAM 角色**，步骤 3 之后该角色需要：

| 权限 | 用途 |
|------|------|
| DynamoDB 读写 `visbuild-shopify-app` | 店铺、页面、版本、任务 |
| Secrets Manager `visbuild-shopify/token/*` | 存取 Shopify Token |
| `lambda:InvokeFunction` → `visbuild-shopify-data-schedule` | `/pages` 定时发布时创建/取消 EventBridge Schedule |

### AWS 上会发生什么

| 变化 | 说明 |
|------|------|
| **仅 IAM 策略** | 附加在 Amplify SSR 角色上 |
| **不创建** 新表、新 Lambda、新 Amplify 应用 |

**未做此步时的典型报错：** `AccessDeniedException`（保存店铺、导入、定时）。

---

## 步骤 5：业务验收（浏览器全链路）

### 你要做的操作

使用 Amplify **默认域名**（无需自定义域名）：

| 顺序 | URL / 操作 | 验证目标 |
|------|------------|----------|
| 1 | `/admin/login`（legacy 模式）或 OAuth 入口 | 登录可用 |
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
| Publish Now | DDB 版本快照；SSR `pageCreate` / `pageUpdate`（`templateSuffix: visbuild`） | 页面 HTML 更新；Theme template 为 **visbuild** |
| Schedule Update | DDB `JOB#...`；EventBridge schedule `visbuild-publish-<jobId>`；到点 Lambda 执行 | 到点 `pageUpdate`（同样带 visbuild 模板） |

**控制台观察点：**

- DynamoDB → `visbuild-shopify-app` 有数据项  
- EventBridge Scheduler → schedule 列表  
- Lambda → `visbuild-shopify-data-publish` → Monitor → CloudWatch Logs  
- Secrets Manager → `visbuild-shopify/token/...`  

---

## 五步完成后的状态对照

| 维度 | 步骤 0（仅 Amplify 演示） | 五步完成后（生产全链路） |
|------|---------------------------|---------------------------|
| Web 入口 | Amplify 默认域名 | 同左 |
| 管理后台数据 | 若未开 AWS：无真数据 | DDB `visbuild-shopify-app` |
| Token | 无 | Secrets Manager |
| 立即发布 | 不可靠 | SSR → Shopify API |
| 定时发布 | 不可靠 | EventBridge → Lambda |

---

## 你需要提前准备（勿提交 Git）

1. Shopify App（Partners）配置好 `App URL=/auth/shopify/start` 和 callback
2. Amplify 环境变量：`SHOPIFY_API_KEY` / `SHOPIFY_API_SECRET` / `SCOPES` / `SHOPIFY_APP_URL`
3. 本机 AWS CLI 已登录账号 `124074140777`，Region `ap-southeast-2`：

   ```powershell
   aws sts get-caller-identity
   aws configure set region ap-southeast-2
   ```

---

## OAuth 回归清单（上线前）

- 从 Shopify Admin 的 App 入口访问后，跳到 Shopify 授权页并成功回到 `/`
- `admin/shops` 可加载，且新授权店铺自动出现在列表中
- `Verify token` 成功，`Secrets Manager` 中存在对应 shop token
- callback 缺参数 / 错误 state / 错误 hmac 时返回 4xx，不出现循环重定向

### 整站锁定 / 店铺隔离 / 会话过期回归

- 未登录访问 `/`、`/pages`、任意 `/x`、`/admin/*` 全部跳转 `/auth/shopify/start?next=...`
- `/api/shopify/webhook` 不依赖 cookie，仍可被 Shopify 调用（HMAC 校验）
- 登录后只看到当前店铺页面；A 店铺登录看不到 B 店铺页面
- 新店铺无首页时访问 `/` 重定向到 `/pages`（而非 404）
- 会话超过 6 小时后强制重新登录（`shop_session` 内 `exp` 过期）

### 回滚开关

- 设置 `ADMIN_AUTH_MODE=legacy` 并配置 `ADMIN_API_KEY`，可临时回滚到旧登录方式
- 回滚后 `/admin/login` 重新启用本地 key 登录；排障完成后移除该变量恢复 OAuth

---

## Shopify 主题模板（visbuild，上线前必配）

应用在代码中写死 `SHOPIFY_PAGE_TEMPLATE_SUFFIX = "visbuild"`（[`app/lib/server/shopify.ts`](app/lib/server/shopify.ts)），**无需** Amplify 环境变量。每个店铺在 **Publish / 定时发布** 时都会向 Shopify 写入 `templateSuffix: "visbuild"`。

**上线前 checklist（每个店铺主题各做一次）：**

1. 主题 `templates/page.visbuild.json` 已存在（可从 `page.json` 复制并精简）
2. 模板引用的 section 正确输出 `{{ page.content }}`
3. 执行一次 **Publish Now** 后，Shopify Admin → Pages → Theme template 显示 **visbuild**
4. 前台 `/pages/<handle>` 样式与编辑器 Preview 一致（无双重 header / 多余 padding）

若发布报 `templateSuffix` 相关 userErrors，先在主题代码中补全 `page.visbuild.json` 再重试 Publish。

---

## 故障排查

| 现象 | 检查 |
|------|------|
| 管理后台像「没数据」 | `USE_AWS_DATA_LAYER=true` 且 Amplify 已 Redeploy |
| AccessDenied | 步骤 4 IAM 是否挂在 **Amplify SSR 角色**（不是 CLI 用户） |
| `/pages` Schedule 400 PassRole | 确认已部署 Schedule Lambda（步骤 2b）、Amplify 配 `SCHEDULE_LAMBDA_ARN`、compute 角色有 `lambda:Invoke`（见 `amplify-ssr-iam-policy.json`） |
| 定时不到点 | `SCHEDULE_LAMBDA_ARN`；步骤 2/2b 两个 Lambda 代码已更新；EventBridge 是否有 `visbuild-publish-<jobId>` |
| Shopify 401/404 | Token、scope、店铺域名 `*.myshopify.com` |
| Publish 失败 / 模板不对 | 主题是否已有 `templates/page.visbuild.json`；Page → Theme template 是否为 visbuild；见上文「Shopify 主题模板」 |
| Lambda Runtime 仍为 nodejs20.x | `npm run deploy:data-plane` 更新模板后，再 `deploy:publish-lambda` / `deploy:schedule-lambda` |

---

## ARN 速查（ap-southeast-2）

- DynamoDB：`arn:aws:dynamodb:ap-southeast-2:124074140777:table/visbuild-shopify-app`
- Secrets：`arn:aws:secretsmanager:ap-southeast-2:124074140777:secret:visbuild-shopify/token/*`
- Schedule Lambda：`arn:aws:lambda:ap-southeast-2:124074140777:function:visbuild-shopify-data-schedule`
- Scheduler schedule 名称前缀：`visbuild-publish-`

---

## 相关文件

- [`amplify.yml`](amplify.yml) — Amplify 构建  
- [`infra/template.yaml`](infra/template.yaml) — 步骤 1 模板  
- [`infra/amplify-ssr-iam-policy.json`](infra/amplify-ssr-iam-policy.json) — 步骤 4  
