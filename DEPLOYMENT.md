# Vercel + Neon 部署指南

**零废话部署流程** - 5 分钟上线。

## 前置条件

- GitHub 账号
- Vercel 账号（用 GitHub 登录）
- Neon 账号（用 GitHub 登录）
- OpenAI API Key

---

## Step 1: 创建 Neon 数据库（2 分钟）

1. 访问 [Neon Console](https://console.neon.tech)
2. 点击 **New Project**
3. 配置：
   - Project name: `skillforge`
   - Region: 选最近的（国内选 `Asia Pacific (Singapore)`）
   - PostgreSQL version: **16**（默认）
4. 复制连接字符串（格式：`postgresql://user:password@xxx.neon.tech/neondb?sslmode=require`）

**关键**：Neon 自带连接池，URL 末尾加 `?sslmode=require&pgbouncer=true` 优化 serverless 性能。

---

## Step 2: 配置 GitHub OAuth（2 分钟）

1. 访问 [GitHub Developer Settings](https://github.com/settings/developers)
2. 点击 **New OAuth App**
3. 填写：
   - Application name: `SkillForge`
   - Homepage URL: `https://your-app.vercel.app`（先用占位符，部署后改）
   - Authorization callback URL: `https://your-app.vercel.app/api/auth/callback/github`
4. 复制 **Client ID** 和 **Client Secret**

---

## Step 3: 部署到 Vercel（1 分钟）

### 方式 A：一键部署（推荐）

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署（会自动链接到你的 GitHub repo）
vercel
```

跟着提示操作即可。

### 方式 B：GitHub 集成

1. 访问 [Vercel Dashboard](https://vercel.com/new)
2. 导入 GitHub repo
3. Vercel 自动检测 Next.js，无需额外配置
4. 点击 **Deploy**

---

## Step 4: 配置环境变量（关键）

在 Vercel 项目设置中添加以下环境变量：

### 必需变量

```bash
# Database (从 Neon 复制，末尾加连接池参数)
DATABASE_URL="postgresql://user:password@xxx.neon.tech/neondb?sslmode=require&pgbouncer=true"

# NextAuth (生成密钥: openssl rand -base64 32)
NEXTAUTH_URL="https://your-app.vercel.app"
NEXTAUTH_SECRET="your-generated-secret-key"

# GitHub OAuth (从 Step 2 获取)
AUTH_GITHUB_ID="your-github-client-id"
AUTH_GITHUB_SECRET="your-github-client-secret"

# OpenAI
OPENAI_API_KEY="sk-..."
```

### 可选变量

```bash
# 使用自定义 OpenAI 端点（如国内代理）
OPENAI_BASE_URL="https://api.openai.com/v1"

# 更换模型
OPENAI_MODEL="gpt-4o-mini"

# 调整 token 限制
OPENAI_MAX_TOKENS="16384"
```

**配置路径**：
`Vercel Dashboard → 你的项目 → Settings → Environment Variables`

---

## Step 5: 运行数据库迁移（自动）

**好消息**：`vercel-build` 脚本已经包含 `prisma migrate deploy`，部署时自动执行。

**手动触发**（如果需要）：
```bash
# 本地连接生产数据库运行迁移
DATABASE_URL="your-neon-url" npx prisma migrate deploy
```

---

## Step 6: 初始化成就数据（首次部署）

```bash
# 本地运行 seed 脚本
DATABASE_URL="your-neon-url" npx tsx prisma/seed-achievements.ts
```

或者直接在 Neon SQL Editor 执行（更快）：
```sql
-- 复制 seed-achievements.ts 的 SQL INSERT 语句粘贴执行
```

---

## 验证部署

1. 访问 `https://your-app.vercel.app`
2. 点击 "开始学习" → GitHub 登录
3. 生成技能树 → 验证 AI 功能
4. 查看 Dashboard → 确认数据持久化

---

## 故障排查

### 问题 1: "Prisma Client not found"

**原因**：构建时未生成 Prisma 客户端

**解决**：
```bash
# package.json 已包含 postinstall，检查 Vercel 构建日志是否执行
# 如未执行，手动触发重新部署：
vercel --prod
```

### 问题 2: Database connection timeout

**原因**：Neon 连接池配置缺失

**解决**：确保 `DATABASE_URL` 末尾有 `?sslmode=require&pgbouncer=true`

### 问题 3: NextAuth session error

**原因**：环境变量配置错误

**检查清单**：
- `NEXTAUTH_URL` 必须是完整 URL（含 https://）
- `NEXTAUTH_SECRET` 至少 32 字符
- GitHub OAuth callback URL 与 `NEXTAUTH_URL` 匹配

### 问题 4: OpenAI API timeout

**原因**：国内网络或 API 额度耗尽

**解决**：
1. 检查 OpenAI 账户余额
2. 设置 `OPENAI_BASE_URL` 使用代理
3. 或切换到 `gpt-4o-mini`（更便宜）

---

## 成本估算

**免费层配额**：

- **Vercel**：100 GB 带宽/月，无限部署
- **Neon**：512 MB 数据库，3 GB 数据传输/月
- **GitHub OAuth**：免费（无限用户）
- **OpenAI**：按使用付费（技能树生成 ~$0.05/次，任务评估 ~$0.01/次）

**预计费用**（100 活跃用户/月）：
- Vercel: $0（免费层够用）
- Neon: $0（免费层够用）
- OpenAI: ~$10-20（取决于使用频率）

**扩容方案**：
- 用户 > 500：Neon Pro ($19/月，3 GB 数据库)
- 流量 > 1 TB：Vercel Pro ($20/月)
- AI 成本优化：缓存常见技能树模板，减少 API 调用

---

## 生产环境优化

### 1. 启用 Neon Autoscaling
```bash
# Neon Dashboard → Compute → Enable Autoscaling
# 自动扩展计算资源，按需付费
```

### 2. 配置 Vercel Edge Regions
```json
// vercel.json
{
  "regions": ["hnd1", "sin1"]  // 日本+新加坡双区部署
}
```

### 3. 添加 Sentry 错误监控
```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 4. Redis 缓存层（可选）
```bash
# Vercel KV (Redis)：免费 256 MB
# 用于缓存 AI 生成的技能树模板
```

---

## 快速回滚

```bash
# 查看部署历史
vercel ls

# 回滚到上一个版本
vercel rollback
```

---

## 监控面板

- **Vercel Analytics**: 自动启用（实时流量、性能指标）
- **Neon Monitoring**: CPU/内存/连接数实时监控
- **Prisma Studio**: `npx prisma studio` 可视化管理生产数据库

---

**完成。现在去部署，有问题直接看 Vercel 构建日志。**
