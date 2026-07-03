# -*- coding: utf-8 -*-
"""
生成《可视化页面构建器 — 测试用例》Excel 文档。
用法: python scripts/gen-test-doc.py
依赖: openpyxl
输出: 测试用例.xlsx（项目根目录）
"""
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from collections import Counter
import os

# ---------------------------------------------------------------------------
# 测试用例数据
# 字段: 用例ID, 模块, 子功能, 用例标题, 优先级, 类型, 前置条件, 测试步骤, 预期结果, 备注
# 优先级: P0(冒烟/核心) P1(主要) P2(次要)
# 类型: 功能 / 边界 / 异常 / 回归 / 性能 / 安全
# ---------------------------------------------------------------------------
CASES = [
    # ---------------- 认证与会话 ----------------
    ("TC-AUTH-001", "认证与会话", "OAuth 授权", "无会话访问店铺路由跳转 Shopify 授权", "P0", "功能",
     "未登录、访问非白名单店铺路由", "1. 清除会话 cookie\n2. 访问 /shop/{domain}/...",
     "重定向到 /auth/shopify/start 并跳转 Shopify 授权页", ""),
    ("TC-AUTH-002", "认证与会话", "OAuth 回调", "回调 hmac + state 校验通过换取 token", "P0", "功能",
     "已在 Shopify 完成授权", "1. Shopify 回调 /auth/shopify/callback 带合法 hmac/state",
     "校验通过；换取 access token 存入 Secrets Manager；upsert 店铺；下发 shop_session(6h)", ""),
    ("TC-AUTH-003", "认证与会话", "OAuth 回调", "非法 hmac/state 拒绝", "P0", "异常",
     "构造错误 hmac 或 state", "1. 访问回调并篡改 hmac 或 state",
     "拒绝换取 token，返回错误，不建立会话", "安全"),
    ("TC-AUTH-004", "认证与会话", "dev-login", "生产环境 dev-login 返回 404", "P0", "安全",
     "NODE_ENV=production 或 USE_AWS_DATA_LAYER=true", "1. 生产运行时访问 /auth/dev-login",
     "返回 404，禁止免密登录", ""),
    ("TC-AUTH-005", "认证与会话", "会话过期", "会话 6 小时过期后需重新登录", "P1", "边界",
     "已登录", "1. 会话签发后等待超过 6h 再访问店铺路由",
     "会话失效，跳转授权/登录", ""),
    ("TC-AUTH-006", "认证与会话", "token 缺失", "有会话但目标店铺无 token 触发 OAuth", "P1", "功能",
     "已登录但访问的 URL 店铺无 token", "1. 访问未授权店铺的路由",
     "非生产跳 dev-login；生产触发 Shopify OAuth", ""),
    ("TC-AUTH-007", "认证与会话", "Cookie 安全", "生产会话 cookie 带 Secure 标记", "P1", "安全",
     "生产运行时", "1. 检查下发的 shop_session cookie 属性",
     "cookie 为 Secure、HttpOnly", "安全"),

    # ---------------- 店铺与多租户 ----------------
    ("TC-SHOP-001", "店铺与多租户", "店铺安装", "新店铺安装自动登记目录与反查", "P0", "功能",
     "全新域名首次授权", "1. 完成新店铺 OAuth\n2. 查表 SHOP_DIR / SHOP_LOOKUP#{domain}",
     "写入 shop、shop_dir、shop_lookup 三类记录", "对应 putShop"),
    ("TC-SHOP-002", "店铺与多租户", "域名解析", "getShopByDomain O(1) 命中反查", "P0", "功能",
     "店铺已登记", "1. 以域名解析店铺(进入店铺路由)",
     "命中 SHOP_LOOKUP 直接取回店铺，无全表 Scan", "性能相关"),
    ("TC-SHOP-003", "店铺与多租户", "域名解析", "空目录首访回落 Scan 并自愈回填", "P1", "回归",
     "SHOP_DIR 为空(旧数据/迁移前)", "1. 首次调用 listShops/getShopByDomain",
     "回落一次 Scan，随后自动回填 SHOP_DIR/SHOP_LOOKUP；再次调用走 Query", "迁移无窗口"),
    ("TC-SHOP-004", "店铺与多租户", "店铺列表", "listShops 返回全部店铺且按名排序", "P1", "功能",
     "存在多个店铺", "1. 打开管理端店铺列表 / 店铺切换器",
     "返回全部店铺，按 name 升序", ""),
    ("TC-SHOP-005", "店铺与多租户", "数据隔离", "跨店铺数据隔离", "P0", "安全",
     "店铺 A、B 各有页面", "1. 以 A 会话访问 B 的页面 pageId",
     "无法读取 B 店铺页面(404/无权限)", "安全"),
    ("TC-SHOP-006", "店铺与多租户", "域名规范化", "无后缀域名补全 myshopify.com", "P2", "边界",
     "-", "1. 传入 'foo' 作为店铺域名",
     "规范化为 'foo.myshopify.com'", ""),
    ("TC-SHOP-007", "店铺与多租户", "域名变更", "域名变更清理旧反查", "P2", "边界",
     "店铺存在且改域名", "1. putShop 使用新 domain\n2. 查旧 SHOP_LOOKUP#{oldDomain}",
     "旧 domain 反查被删除，新 domain 反查建立", ""),
    ("TC-SHOP-008", "店铺与多租户", "切换器", "隐藏标记店铺不出现在切换器", "P2", "功能",
     "存在被标记隐藏的店铺", "1. 打开店铺切换器",
     "被 isShopHiddenFromSwitcher 命中的店铺不显示", ""),

    # ---------------- 页面编辑器 ----------------
    ("TC-EDIT-001", "页面编辑器", "加载", "打开编辑器加载页面 Puck 数据", "P0", "功能",
     "页面已存在", "1. 打开 /shop/{domain}/{path} 编辑器",
     "正确渲染已保存的 visbuildData", ""),
    ("TC-EDIT-002", "页面编辑器", "组件", "各组件可拖拽渲染", "P1", "功能",
     "编辑器已打开", "1. 依次拖入 Accordion/Tabs/Container/Text/Icon/CustomHtml/RawHTML",
     "组件正常渲染，字段可编辑", ""),
    ("TC-EDIT-003", "页面编辑器", "手风琴动画", "展开 0.5s / 收起 0.25s", "P2", "功能",
     "页面含 Accordion", "1. 展开某项并观察\n2. 收起并观察",
     "展开约 0.5s、收起约 0.25s 完成动画", "近期样式调整"),
    ("TC-EDIT-004", "页面编辑器", "首次保存", "首次保存自动创建页面", "P0", "功能",
     "路径对应页面不存在", "1. 在新路径编辑并点保存",
     "创建 page_index/page_body，状态 draft", ""),
    ("TC-EDIT-005", "页面编辑器", "路径重命名", "保存时修改 URL 路径", "P1", "功能",
     "页面已存在", "1. 修改 root.props.pagePath 后保存",
     "handle/pagePath 更新；路径冲突时报错拦截", ""),
    ("TC-EDIT-006", "页面编辑器", "首页保护", "首页路径不可更改/占用", "P2", "异常",
     "存在首页(/)", "1. 尝试把 / 改成其它路径；或把其它页改成 /",
     "被规则拦截并返回明确错误", ""),

    # ---------------- 页面状态机(重点) ----------------
    ("TC-STAT-001", "页面状态机", "草稿", "新建未保存显示 Draft", "P0", "功能",
     "编辑器中新建但未保存", "1. 进入编辑器不保存\n2. 返回列表",
     "列表显示 Draft", ""),
    ("TC-STAT-002", "页面状态机", "草稿", "保存但未发布仍为 Draft", "P0", "回归",
     "页面从未 publish/schedule", "1. 编辑并点保存(不发布/定时)\n2. 返回列表",
     "列表显示 Draft(非 Outdated)", "本次修复的核心缺陷"),
    ("TC-STAT-003", "页面状态机", "已发布", "发布后显示 Published", "P0", "功能",
     "存在草稿页面", "1. 点立即发布\n2. 返回列表",
     "列表显示 Published", ""),
    ("TC-STAT-004", "页面状态机", "过期", "已发布再编辑保存显示 Outdated", "P0", "功能",
     "页面已 published", "1. 再次编辑并保存\n2. 返回列表",
     "列表显示 Outdated(dirty)，红色高亮", ""),
    ("TC-STAT-005", "页面状态机", "定时", "定时后显示 Scheduled", "P0", "功能",
     "存在页面", "1. 设置定时发布\n2. 返回列表",
     "列表显示 Scheduled", ""),
    ("TC-STAT-006", "页面状态机", "定时", "已定时再保存保持 Scheduled", "P1", "回归",
     "页面为 scheduled", "1. 再次编辑保存\n2. 查看状态",
     "状态保持 Scheduled，定时任务同步最新版本", ""),
    ("TC-STAT-007", "页面状态机", "一致性", "保存响应状态与列表状态一致", "P1", "回归",
     "各状态页面", "1. 保存后对比接口返回 status 与列表显示",
     "两者一致(修复前 draft 保存出现 draft/Outdated 错位)", ""),

    # ---------------- 立即发布 ----------------
    ("TC-PUB-001", "立即发布", "创建", "无 GID 首次发布走 pageCreate", "P0", "功能",
     "页面无 shopifyPageGid", "1. 立即发布",
     "调用 Shopify pageCreate；回写 shopifyPageGid；templateSuffix=visbuild", ""),
    ("TC-PUB-002", "立即发布", "更新", "有 GID 发布走 pageUpdate", "P0", "功能",
     "页面已有 shopifyPageGid", "1. 再次发布",
     "调用 pageUpdate 更新已有 Shopify 页面", ""),
    ("TC-PUB-003", "立即发布", "元数据", "发布后更新页面元数据", "P1", "功能",
     "发布完成", "1. 查看 page_index",
     "status=published、lastPublishedAt 更新、pendingJobId/scheduledPublishAt 清空", ""),
    ("TC-PUB-004", "立即发布", "冲突校验", "handle/path 冲突拦截", "P1", "异常",
     "同店铺已有相同 handle 页面", "1. 用冲突 handle 发布/定时",
     "返回明确的冲突错误，不写入", ""),
    ("TC-PUB-005", "立即发布", "token", "缺少 token 发布失败", "P1", "异常",
     "店铺 token 缺失/占位", "1. 触发发布",
     "抛出 'Shop access token not configured' 类错误", ""),

    # ---------------- 定时发布 ----------------
    ("TC-SCH-001", "定时发布", "创建", "创建定时任务写 EventBridge", "P0", "功能",
     "页面存在、时间≥1min 后", "1. 设置未来时间定时发布",
     "SSR 调用 Schedule Lambda 创建 EventBridge 定时；job=pending", ""),
    ("TC-SCH-002", "定时发布", "最小提前量", "小于 1 分钟的定时被拒", "P1", "边界",
     "-", "1. 选择 <60s 后的时间定时",
     "createScheduleAt 报 '至少 1 分钟' 错误，不创建", ""),
    ("TC-SCH-003", "定时发布", "触发", "到点触发 Publish Lambda 完成发布", "P0", "功能",
     "存在到期的定时任务", "1. 等待到点(或手动触发)",
     "Publish Lambda 执行；页面 published；job=done", ""),
    ("TC-SCH-004", "定时发布", "时区", "本地时间正确换算 UTC", "P1", "功能",
     "浏览器非 UTC 时区", "1. 选择本地时间定时",
     "存储绝对时间(UTC ISO)；到点按预期本地时刻触发；timezone 作为元数据", ""),
    ("TC-SCH-005", "定时发布", "改期", "reschedule 更新定时时间", "P1", "功能",
     "页面已定时", "1. 修改定时时间并提交",
     "取消旧定时、创建新定时；状态保持 scheduled", ""),
    ("TC-SCH-006", "定时发布", "取消", "unschedule 取消定时", "P1", "功能",
     "页面已定时", "1. 取消定时",
     "取消 EventBridge job；页面回落(dirty/draft)；scheduledPublishAt 清空", ""),
    ("TC-SCH-007", "定时发布", "重试", "失败重试提前量≥75s不被拒", "P0", "回归",
     "定时发布首次失败", "1. 制造一次发布失败触发重试",
     "重试排期≥75s，不再被 minLeadMs 拒绝而静默丢任务", "本次修复"),
    ("TC-SCH-008", "定时发布", "重试上限", "达最大重试标记失败并回落", "P1", "异常",
     "持续失败", "1. 连续失败至 maxAttempts(5)",
     "job=failed；页面 pendingJobId 清空；scheduled→dirty", ""),
    ("TC-SCH-009", "定时发布", "删除清理", "删除定时页面前取消 EventBridge", "P1", "功能",
     "存在定时中的页面", "1. 删除该页面",
     "先取消对应 EventBridge job 再删除，无悬挂定时", ""),

    # ---------------- 版本历史 ----------------
    ("TC-VER-001", "版本历史", "追加", "保存/发布追加版本记录", "P1", "功能",
     "页面存在", "1. 多次保存/发布",
     "每次写 version 记录，source 正确(manual_save/publish/scheduled_publish/import)", ""),
    ("TC-VER-002", "版本历史", "裁剪", "每页仅保留最近 10 个版本", "P1", "边界",
     "同页面已有≥10个版本", "1. 再次保存产生第 11 个版本",
     "按时间序裁剪最旧版本，保留最近 10 个", ""),
    ("TC-VER-003", "版本历史", "点查", "getPageVersion 点查不全表扫描", "P2", "性能",
     "已知 versionId", "1. 读取指定版本",
     "按 PK/SK 点查命中(versionId 前缀即 pageId)", ""),

    # ---------------- Webhook / 集成 ----------------
    ("TC-HOOK-001", "Webhook集成", "命中", "pages/update webhook 反查命中标记", "P1", "功能",
     "存在带 GID 的页面", "1. Shopify 发送 pages/update webhook",
     "getPageByGid O(1) 命中；同步内容；标记 dirty", ""),
    ("TC-HOOK-002", "Webhook集成", "未命中", "无匹配 GID 忽略", "P2", "边界",
     "webhook 的 GID 无对应页面", "1. 发送无匹配的 webhook",
     "返回 matched:false，不改动数据", ""),
    ("TC-HOOK-003", "Webhook集成", "非法请求", "非 POST/非法 payload 拒绝", "P2", "异常",
     "-", "1. 用 GET 或错误 body 请求 webhook",
     "拒绝处理并返回错误状态", ""),

    # ---------------- 数据层 ----------------
    ("TC-DATA-001", "数据层", "读写", "DynamoDB 单表读写正确", "P0", "功能",
     "USE_AWS_DATA_LAYER=true", "1. 创建/读取/更新/删除页面",
     "各实体 PK/SK 正确，读写一致", ""),
    ("TC-DATA-002", "数据层", "dev 层", "本地 JSON 数据层可用", "P1", "功能",
     "开发模式", "1. dev 环境执行相同 CRUD",
     "repo.json 正确读写，行为与 DDB 一致", ""),
    ("TC-DATA-003", "数据层", "事务", "putPageIndex 原子写(部分失败无悬挂)", "P1", "异常",
     "USE_AWS_DATA_LAYER=true", "1. 模拟事务中途失败",
     "page_index/page_lookup/gid_lookup 要么全成功要么全失败，无悬挂反查", "TransactWriteItems"),
    ("TC-DATA-004", "数据层", "反查维护", "保存写 gid_lookup、删除清理", "P1", "功能",
     "页面含 shopifyPageGid", "1. 保存后查 GID_LOOKUP\n2. 删除页面后再查",
     "保存时建立、删除时清理反查项", ""),
    ("TC-DATA-005", "数据层", "级联删除", "删除页面级联清理相关项", "P1", "功能",
     "页面含 body/version/lookup", "1. 删除页面",
     "index/page_lookup/gid_lookup/page_body/所有 version 一并清理", ""),
    ("TC-DATA-006", "数据层", "枚举校验", "非法枚举值仅告警不改行为", "P2", "可观测",
     "构造非法 status/source 数据", "1. 读取该记录",
     "console.warn 记录异常，值原样返回，运行不中断", ""),
    ("TC-DATA-007", "数据层", "TTL", "终态 job 30 天后自动清理", "P2", "功能",
     "job 为 done/failed/cancelled", "1. 检查 expiresAt\n2.(长期)观察 TTL 清理",
     "终态 job 写 expiresAt(约30天)，到期由 DynamoDB TTL 删除；pending/running 不设 TTL", ""),

    # ---------------- 资产上传 ----------------
    ("TC-AST-001", "资产上传", "预签", "生成 S3 预签上传 URL", "P2", "功能",
     "配置 ASSETS_BUCKET_NAME", "1. 请求上传预签 URL",
     "返回有效的预签 PUT URL，可上传", ""),
    ("TC-AST-002", "资产上传", "未配置", "未配置桶时的降级行为", "P2", "边界",
     "未配置 ASSETS_BUCKET_NAME", "1. 请求上传",
     "明确提示未启用/降级，不报未捕获异常", ""),

    # ---------------- 基础设施 / 部署 ----------------
    ("TC-INF-001", "基础设施", "数据栈", "CloudFormation 部署数据层", "P1", "功能",
     "AWS 凭证可用", "1. 执行 deploy:data-plane",
     "栈更新成功；表启用 TTL、PITR；DeletionPolicy/UpdateReplacePolicy=Retain", ""),
    ("TC-INF-002", "基础设施", "Lambda", "Lambda 代码部署", "P1", "功能",
     "已构建 CJS 包", "1. deploy:publish-lambda / schedule-lambda",
     "update-function-code 成功，函数名/ARN 不变，仅代码更新", ""),
    ("TC-INF-003", "基础设施", "DLQ", "失败异步调用进入 DLQ", "P2", "功能",
     "Publish Lambda 配 DLQ", "1. 制造 Publish 异步调用失败",
     "失败消息进入 publish-dlq(保留14天)供排查", ""),
    ("TC-INF-004", "基础设施", "告警", "错误/限流告警存在", "P2", "功能",
     "已部署数据层", "1. 检查 CloudWatch 告警",
     "存在 Publish/Schedule Errors 告警与 AppTable ThrottledRequests 告警", ""),
    ("TC-INF-005", "基础设施", "构建门禁", "typecheck 拦截类型错误", "P1", "功能",
     "-", "1. 引入类型错误后执行 npm run verify / Amplify 构建",
     "typecheck 失败阻断部署", ""),
    ("TC-INF-006", "基础设施", "编码", "含中文注释模板可部署", "P2", "回归",
     "template.yaml 含中文注释", "1. 设置 AWS_CLI_FILE_ENCODING=UTF-8 部署",
     "不再出现 gbk 解码错误，部署成功", ""),

    # ---------------- 非功能 ----------------
    ("TC-NFR-001", "非功能", "性能", "店铺解析不做全表 Scan", "P1", "性能",
     "存在较多数据", "1. 监控进入店铺路由的 DDB 调用",
     "域名解析走 O(1) 反查；listShops 走单分区 Query", ""),
    ("TC-NFR-002", "非功能", "安全", "Access Token 不落业务表", "P0", "安全",
     "-", "1. 检查 DynamoDB 与 Secrets Manager",
     "token 仅存于 Secrets Manager，业务表只存引用 tokenSecretRef", "安全"),
    ("TC-NFR-003", "非功能", "健壮性", "冷启动数据层懒加载", "P2", "性能",
     "Lambda/首次请求", "1. 冷启动触发",
     "按 useAwsDataLayer 懒加载单例，AWS 分支动态 import", ""),
    ("TC-NFR-004", "非功能", "兼容", "旧数据字段回填默认值", "P2", "边界",
     "存在缺字段的旧记录", "1. 读取旧 page_index(缺 pagePath/updatedAt 等)",
     "反序列化回填默认值(如 pagePath=/handle)，不报错", ""),
]

COLUMNS = ["用例ID", "模块", "子功能", "用例标题", "优先级", "类型",
           "前置条件", "测试步骤", "预期结果", "备注"]

# ---------------------------------------------------------------------------
# 样式
# ---------------------------------------------------------------------------
HEADER_FILL = PatternFill("solid", fgColor="2F5496")
HEADER_FONT = Font(color="FFFFFF", bold=True, size=11)
TITLE_FONT = Font(bold=True, size=16, color="1F3864")
SUB_FONT = Font(size=10, color="595959")
CELL_FONT = Font(size=10)
WRAP_TOP = Alignment(wrap_text=True, vertical="top")
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
thin = Side(style="thin", color="BFBFBF")
BORDER = Border(left=thin, right=thin, top=thin, bottom=thin)

PRI_FILL = {
    "P0": PatternFill("solid", fgColor="FDE9E9"),
    "P1": PatternFill("solid", fgColor="FFF6E5"),
    "P2": PatternFill("solid", fgColor="EEF6EE"),
}

wb = Workbook()

# ---------------------------------------------------------------------------
# Sheet 1: 说明
# ---------------------------------------------------------------------------
ws0 = wb.active
ws0.title = "说明"
ws0.sheet_view.showGridLines = False
ws0["B2"] = "可视化页面构建器 — 测试用例文档"
ws0["B2"].font = TITLE_FONT
rows_info = [
    "",
    "项目：Shopify 可视化页面构建器（React Router v7 + Puck 编辑器 + AWS 数据面）",
    "架构：Amplify Hosting(SSR) + DynamoDB 单表 + EventBridge Scheduler + Publish/Schedule Lambda + Secrets Manager + S3",
    "",
    "字段说明：",
    "  • 用例ID：TC-{模块}-{序号}",
    "  • 优先级：P0=核心/冒烟，P1=主要，P2=次要",
    "  • 类型：功能 / 边界 / 异常 / 回归 / 性能 / 安全 / 可观测",
    "  • 状态列（明细页最后一列，可手动填写）：未执行 / 通过 / 失败 / 阻塞",
    "",
    "使用建议：",
    "  • 「测试用例」页已开启筛选与冻结表头，可按模块/优先级筛选执行。",
    "  • 「汇总」页统计各模块与优先级分布。",
    "  • P0 用例建议作为每次发布前的冒烟集合。",
    "",
    "重点回归项：",
    "  • TC-STAT-002 保存未发布仍为 Draft（近期修复的状态误标缺陷）。",
    "  • TC-SCH-007 定时重试提前量≥75s，不再被最小提前量拒绝。",
    "  • TC-SHOP-002/003 店铺域名解析去全表 Scan、空目录自愈回填。",
    "  • TC-DATA-003 putPageIndex 事务原子写。",
]
r = 3
for line in rows_info:
    ws0[f"B{r}"] = line
    ws0[f"B{r}"].font = SUB_FONT if line and not line.endswith("：") else Font(bold=True, size=11, color="1F3864")
    r += 1
ws0.column_dimensions["A"].width = 2
ws0.column_dimensions["B"].width = 120

# ---------------------------------------------------------------------------
# Sheet 2: 测试用例
# ---------------------------------------------------------------------------
ws = wb.create_sheet("测试用例")
ws.sheet_view.showGridLines = False
all_cols = COLUMNS + ["执行状态"]
ws.append(all_cols)
for c in range(1, len(all_cols) + 1):
    cell = ws.cell(row=1, column=c)
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
    cell.alignment = CENTER
    cell.border = BORDER

for row in CASES:
    ws.append(list(row) + [""])

# 样式：正文
for ridx in range(2, ws.max_row + 1):
    pri = ws.cell(row=ridx, column=5).value
    for cidx in range(1, len(all_cols) + 1):
        cell = ws.cell(row=ridx, column=cidx)
        cell.font = CELL_FONT
        cell.border = BORDER
        # 居中列：用例ID/模块/子功能/优先级/类型/执行状态
        if cidx in (1, 2, 3, 5, 6, len(all_cols)):
            cell.alignment = CENTER
        else:
            cell.alignment = WRAP_TOP
    if pri in PRI_FILL:
        ws.cell(row=ridx, column=5).fill = PRI_FILL[pri]

widths = [13, 12, 11, 30, 7, 7, 26, 40, 44, 12, 11]
for i, w in enumerate(widths, start=1):
    ws.column_dimensions[get_column_letter(i)].width = w

ws.freeze_panes = "A2"
ws.auto_filter.ref = f"A1:{get_column_letter(len(all_cols))}{ws.max_row}"

# 数据校验：执行状态下拉
from openpyxl.worksheet.datavalidation import DataValidation
dv = DataValidation(type="list", formula1='"未执行,通过,失败,阻塞"', allow_blank=True)
ws.add_data_validation(dv)
dv.add(f"{get_column_letter(len(all_cols))}2:{get_column_letter(len(all_cols))}{ws.max_row}")

# ---------------------------------------------------------------------------
# Sheet 3: 汇总
# ---------------------------------------------------------------------------
ws2 = wb.create_sheet("汇总")
ws2.sheet_view.showGridLines = False
mod_counter = Counter(c[1] for c in CASES)
pri_counter = Counter(c[4] for c in CASES)
type_counter = Counter(c[5] for c in CASES)

def write_table(ws, start_row, title, counter, key_header):
    ws.cell(row=start_row, column=2, value=title).font = Font(bold=True, size=12, color="1F3864")
    hr = start_row + 1
    ws.cell(row=hr, column=2, value=key_header).font = HEADER_FONT
    ws.cell(row=hr, column=3, value="用例数").font = HEADER_FONT
    ws.cell(row=hr, column=2).fill = HEADER_FILL
    ws.cell(row=hr, column=3).fill = HEADER_FILL
    ws.cell(row=hr, column=2).alignment = CENTER
    ws.cell(row=hr, column=3).alignment = CENTER
    ws.cell(row=hr, column=2).border = BORDER
    ws.cell(row=hr, column=3).border = BORDER
    rr = hr + 1
    for k, v in sorted(counter.items(), key=lambda x: (-x[1], x[0])):
        ws.cell(row=rr, column=2, value=k).border = BORDER
        ws.cell(row=rr, column=3, value=v).border = BORDER
        ws.cell(row=rr, column=3).alignment = CENTER
        rr += 1
    ws.cell(row=rr, column=2, value="合计").font = Font(bold=True)
    ws.cell(row=rr, column=3, value=sum(counter.values())).font = Font(bold=True)
    ws.cell(row=rr, column=2).border = BORDER
    ws.cell(row=rr, column=3).border = BORDER
    ws.cell(row=rr, column=3).alignment = CENTER
    return rr + 2

ws2["B2"] = f"测试用例汇总（共 {len(CASES)} 条）"
ws2["B2"].font = TITLE_FONT
nr = 4
nr = write_table(ws2, nr, "按模块", mod_counter, "模块")
nr = write_table(ws2, nr, "按优先级", pri_counter, "优先级")
nr = write_table(ws2, nr, "按类型", type_counter, "类型")
ws2.column_dimensions["A"].width = 2
ws2.column_dimensions["B"].width = 22
ws2.column_dimensions["C"].width = 12

# ---------------------------------------------------------------------------
out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "测试用例.xlsx")
wb.save(out)
print("WROTE", out, "cases=", len(CASES))
