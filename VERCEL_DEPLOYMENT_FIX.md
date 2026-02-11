# Vercel 部署问题修复指南

## 已修复的问题

### 1. TypeScript 编译错误
修复了以下编译错误，这些错误会导致 Vercel 部署失败：

- ✅ 移除了未使用的导入：`getAllDailyReports`、`ExpenseRecord`、`where`
- ✅ 移除了未使用的状态变量：`tournaments`
- ✅ 修复了类型错误：将 `typeKey` 声明为 `string` 类型以支持自定义赛事类型

### 2. Vercel 配置文件优化
- ✅ 更新了 `vercel.json`，添加了安全头部和安装命令
- ✅ 修复了 `.vercelignore`，移除了 `dist`（Vercel 需要访问构建输出）

## 部署步骤

### 方法 1：通过 Vercel Dashboard（推荐）

1. **登录 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 使用 GitHub/GitLab/Bitbucket 账号登录

2. **导入项目**
   - 点击 "Add New Project"
   - 选择你的 Git 仓库
   - 或直接拖拽项目文件夹

3. **配置项目设置**
   - Framework Preset: **Vite**
   - Root Directory: `./`（默认）
   - Build Command: `npm run build`（自动检测）
   - Output Directory: `dist`（自动检测）
   - Install Command: `npm install`（自动检测）

4. **配置环境变量**
   - 进入项目 Settings → Environment Variables
   - 添加以下 Firebase 环境变量：
     ```
     VITE_FIREBASE_API_KEY=your-api-key
     VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
     VITE_FIREBASE_PROJECT_ID=your-project-id
     VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
     VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
     VITE_FIREBASE_APP_ID=your-app-id
     VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
     ```
   - 选择环境：Production、Preview、Development
   - 点击 Save

5. **部署**
   - 点击 "Deploy"
   - 等待构建完成（通常 1-3 分钟）

### 方法 2：通过 Vercel CLI

1. **安装 Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **登录**
   ```bash
   vercel login
   ```

3. **部署**
   ```bash
   vercel
   ```
   
   首次部署会询问：
   - Set up and deploy? **Yes**
   - Which scope? 选择你的账号
   - Link to existing project? **No**（首次部署）
   - Project name? 输入项目名称
   - Directory? `./`（默认）
   - Override settings? **No**（使用默认配置）

4. **生产环境部署**
   ```bash
   vercel --prod
   ```

## 验证部署

部署成功后：

1. **检查构建日志**
   - 在 Vercel Dashboard 中查看构建日志
   - 确认没有错误或警告

2. **访问网站**
   - 使用 Vercel 提供的 URL 访问网站
   - 检查浏览器控制台是否有错误

3. **测试功能**
   - 测试登录功能
   - 测试创建赛事功能
   - 检查 Firebase 连接是否正常

## 常见问题排查

### 问题 1：构建失败 - TypeScript 错误

**解决方案：**
- 确保所有 TypeScript 错误已修复
- 本地运行 `npm run build` 验证构建成功
- 检查 `tsconfig.json` 配置是否正确

### 问题 2：环境变量未生效

**解决方案：**
- 确认环境变量名称以 `VITE_` 开头
- 重新部署项目（环境变量更改后需要重新部署）
- 检查 Vercel Dashboard 中的环境变量设置

### 问题 3：404 错误（路由问题）

**解决方案：**
- 确认 `vercel.json` 中的 rewrites 配置正确
- 所有路由都应重定向到 `/index.html`

### 问题 4：Firebase 连接失败

**解决方案：**
- 检查环境变量是否正确配置
- 确认 Firebase 项目已启用 Firestore
- 检查 Firestore 安全规则是否允许访问
- 查看浏览器控制台的错误信息

### 问题 5：构建超时

**解决方案：**
- Vercel 免费版构建时间限制为 45 秒
- 如果构建时间过长，考虑：
  - 优化依赖项
  - 使用代码分割
  - 检查是否有不必要的依赖

## 自动部署

配置完成后，每次推送到 Git 仓库的主分支，Vercel 会自动：
1. 检测代码更改
2. 运行构建命令
3. 部署新版本

## 回滚部署

如果需要回滚到之前的版本：
1. 进入 Vercel Dashboard
2. 选择项目 → Deployments
3. 找到之前的部署
4. 点击 "..." → Promote to Production

## 性能优化建议

1. **代码分割**
   - 使用动态导入减少初始包大小
   - 当前构建警告提示包大小超过 500KB

2. **缓存策略**
   - Vercel 自动处理静态资源缓存
   - 确保 `index.html` 不被缓存

3. **CDN**
   - Vercel 自动使用全球 CDN
   - 无需额外配置

## 安全建议

1. **环境变量**
   - 不要将 `.env` 文件提交到 Git
   - 使用 Vercel 的环境变量功能

2. **Firebase 安全规则**
   - 设置适当的 Firestore 安全规则
   - 限制 API Key 的使用范围

3. **HTTPS**
   - Vercel 自动提供 HTTPS
   - 无需额外配置

## 支持

如果遇到问题：
1. 查看 Vercel Dashboard 的构建日志
2. 检查浏览器控制台的错误信息
3. 参考 [Vercel 文档](https://vercel.com/docs)
4. 参考项目的 `DEPLOYMENT.md` 文件
