# Firebase Studio

这是一个 Firebase Studio 中的 NextJS 入门项目。

要开始使用，请查看 `src/app/page.tsx`。

## 使用宝塔面板部署到远程服务器 (中文教程)

本指南详细说明了如何将此 Next.js 应用程序部署到由宝塔面板管理的远程服务器。

**前提条件:**

1.  **远程服务器:** 一台具有 SSH 访问权限的 Linux 服务器 (例如 CentOS, Ubuntu)。
2.  **已安装宝塔面板:** 确保您的服务器上已安装并可以访问宝塔面板。
3.  **域名:** 一个指向您服务器 IP 地址的域名 (可选但推荐)。

**部署步骤:**

1.  **安装 Node.js:**
    *   登录您的宝塔面板。
    *   进入“软件商店”。
    *   找到“PM2 管理器”并安装它。这通常会自动安装 Node.js。如果未安装，或者您需要特定版本：
    *   在软件商店中找到“Node.js 版本管理器”(或类似名称) 并安装。
    *   使用 Node.js 版本管理器安装您需要的 Node.js 版本 (请检查您项目的 `package.json` 文件或项目要求，例如 v18 或更高版本)。

2.  **上传项目文件:**
    *   **方法 A: Git (推荐)**
        *   如果服务器尚未安装 Git，请先安装 (`yum install git` 或 `apt install git`)。
        *   通过宝塔面板的“文件”功能或 SSH 进入您想要存放项目文件的目录 (例如 `/www/wwwroot/your_project_name`)。
        *   克隆您的仓库: `git clone <your-repository-url> .`
        *   更新时拉取最新代码: `git pull`
    *   **方法 B: 手动上传**
        *   在本地构建项目: `npm run build` (或 `pnpm build`)
        *   创建一个包含以下内容的 `.zip` 压缩包:
            *   `.next` 文件夹
            *   `public` 文件夹
            *   `package.json`
            *   `node_modules` (可选, 可以在服务器上安装)
            *   其他必要文件 (例如 `.env.production`, `next.config.js`)
        *   进入宝塔面板的“文件”部分。
        *   导航到目标目录 (例如 `/www/wwwroot/your_project_name`)。
        *   上传 `.zip` 文件并解压缩。

3.  **安装依赖 (如果未上传):**
    *   打开宝塔面板终端或通过 SSH 连接。
    *   进入您的项目目录: `cd /www/wwwroot/your_project_name`
    *   安装依赖:
        ```bash
        # 如果使用 npm
        npm install --production
        # 或者如果使用 pnpm
        pnpm install --prod
        ```
    *   *注意:* 确保已安装正确的包管理器 (npm, pnpm, yarn) 或全局安装它。

4.  **构建应用程序 (如果未上传预构建版本):**
    *   在项目目录的终端中执行:
        ```bash
        # 如果使用 npm
        npm run build
        # 或者如果使用 pnpm
        pnpm build
        ```

5.  **在宝塔面板中设置网站:**
    *   进入“网站” -> “添加站点”。
    *   输入您的域名 (例如 `yourdomain.com`) 或服务器 IP (如果您还没有域名)。
    *   设置 **根目录** 为您的项目文件夹 (例如 `/www/wwwroot/your_project_name`)。**重要提示:** 这主要是为了宝塔的组织管理；Nginx 会将请求代理到 Node 应用，而不是直接从这里提供静态文件。
    *   如果需要，选择“创建 FTP”和“创建数据库”，否则禁用它们。
    *   PHP 版本选择“纯静态”。
    *   提交。

6.  **配置 PM2 管理器:**
    *   进入“软件商店” -> “PM2 管理器” -> “设置”。
    *   点击“添加项目”。
    *   **项目名称:** 输入一个描述性的名称 (例如 `my-nextjs-app`)。
    *   **项目执行目录:** 选择您的项目根目录 (`/www/wwwroot/your_project_name`)。
    *   **启动文件类型:** 选择 `npm`。
    *   **启动脚本:** 输入 `start`。这将执行您 `package.json` 中定义的 `start` 脚本 (`next start`)。
        *   *备选方案:* 如果您的 `npm start` 脚本没有指向 `next start`，您可能需要不同的配置，例如选择 “Nodejs” 作为启动文件类型，并使用 `/www/wwwroot/your_project_name/node_modules/.bin/next` 作为启动文件，`start` 作为参数。但使用 `npm start` 脚本是标准做法。
    *   **端口:** 输入您的 Next.js 应用将运行的端口 (例如 `3000`)。确保此端口未被占用。`start` 脚本通常默认为 3000 (`next start -p 3000`)。
    *   **运行用户:** 选择 `www` (通用实践)。
    *   **环境变量 (关键):** 点击“环境变量”并添加必要的变量，例如:
        *   `NODE_ENV=production`
        *   `PORT=3000` (必须与上面指定的端口匹配)
        *   `DATABASE_URL=您的数据库连接字符串`
        *   `NEXTAUTH_URL=https://yourdomain.com` (使用您的实际域名)
        *   `NEXTAUTH_SECRET=生成一个强密钥` (在终端中使用 `openssl rand -base64 32` 生成)
        *   添加您的应用程序所需的任何其他环境变量。
    *   点击“确认”。

7.  **配置 Nginx 反向代理:**
    *   进入“网站”。
    *   找到您在步骤 5 中创建的站点，点击“设置”。
    *   进入“反向代理” -> “添加反向代理”。
    *   **代理名称:** 选择一个名称 (例如 `nextjs-proxy`)。
    *   **目标 URL:** 输入 `http://127.0.0.1:3000` (将 `3000` 替换为您的 Node/Next.js 应用正在运行的端口，即在 PM2 中配置的端口)。
    *   **发送域名:** 输入 `$host` 或您的特定域名。
    *   点击“提交”。Nginx 现在会将访问您域名的请求转发到在指定端口上运行的 Next.js 应用程序。

8.  **设置 SSL (HTTPS):**
    *   在站点设置中 (“网站” -> 您的站点 -> “设置”)，进入“SSL”。
    *   选择“Let's Encrypt”选项卡。
    *   选择您的域名。
    *   点击“申请”。宝塔面板将处理获取和安装 SSL 证书的过程。
    *   证书成功安装后，启用“强制HTTPS”。

9.  **配置防火墙:**
    *   进入宝塔面板的“安全”部分。
    *   确保 HTTP (80) 和 HTTPS (443) 端口已打开。宝塔在创建站点和设置 SSL 时通常会处理此问题。
    *   内部端口 (例如 3000) *不需要* 对公网开放，因为 Nginx 在本地代理请求。

10. **启动应用程序:**
    *   返回“软件商店” -> “PM2 管理器” -> “设置”。
    *   您的项目应该会列出。如果它没有运行，请点击“启动”。
    *   如果应用程序启动失败，请检查“日志”。

11. **访问您的应用程序:**
    *   打开浏览器并访问 `https://yourdomain.com`。

**故障排除:**

*   **检查日志:** PM2 日志 (“软件商店” -> “PM2 管理器” -> “日志”) 和 Nginx 日志 (“网站” -> 您的站点 -> “设置” -> “日志”) 对于诊断问题至关重要。
*   **端口冲突:** 确保您的 Next.js 应用使用的端口 (例如 3000) 没有被其他进程占用。在服务器终端中使用 `netstat -tulnp | grep <port>` 进行检查。
*   **防火墙:** 再次检查端口 80 和 443 是否在宝塔安全部分 *以及* 任何外部防火墙 (如 AWS 安全组、Google Cloud 防火墙规则等) 中都已打开。
*   **环境变量:** 验证所有必需的环境变量是否已在 PM2 配置中正确设置。缺少或不正确的变量是启动失败的常见原因。
*   **文件权限:** 确保 `www` 用户 (或运行 PM2 进程的用户) 对您的项目目录具有必要的读/写权限，特别是对于 `.next`、`node_modules` 以及可能写入日志或上传文件的任何目录。您可能需要在终端中运行 `chown -R www:www /www/wwwroot/your_project_name`。
*   **构建问题:** 确保 `npm run build` (或等效命令) 已成功完成且没有错误。检查终端中的构建输出。
*   **数据库/服务连接:** 确保服务器可以连接到您的数据库或环境变量中定义的任何外部服务。

## What's new?

While the name has changed, the core features you love remain the same. You can still expect:

* A cloud-based development environment accessible from any device.
* AI coding assistance using Gemini models.
* The ability to import existing repos and customize your workspace.
* Support for popular frameworks and languages, including (but not limited to!) Go, Java, .NET, Python, Android, Flutter, and web (React, Angular, Vue.js, and more).
* Built-in support for emulation, testing, and debugging.
* Real-time collaboration features.

In addition to the rebranding, we're also introducing some exciting new features and improvements:
