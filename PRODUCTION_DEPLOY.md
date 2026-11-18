# 生产部署文档索引

原 `PRODUCTION_DEPLOY.md` 已拆分为 **AWS 生产五步** 与 **本地上线前验证**，避免与本地 `npm run dev` / `start:local-prod` 内容混在一起。

| 文档 | 适用场景 |
|------|----------|
| [**AWS_PRODUCTION_DEPLOY.md**](AWS_PRODUCTION_DEPLOY.md) | 悉尼区账号 `124074140777`：CloudFormation 数据面、Lambda、Amplify 环境变量、IAM、浏览器验收 |
| [**LOCAL_PRE_DEPLOY_VERIFY.md**](LOCAL_PRE_DEPLOY_VERIFY.md) | push 前本机 production 模式冒烟、`seed:publish-test`、清库与 Schedule 升级注意事项 |
| [**DEPLOYMENT.md**](DEPLOYMENT.md) | Amplify 接入、环境变量总览、dev / local-prod / 生产场景对照 |

代码内错误提示若指向 `PRODUCTION_DEPLOY.md`，请以 **AWS_PRODUCTION_DEPLOY.md** 中的环境变量与部署步骤为准。
