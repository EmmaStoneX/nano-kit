# Nano Banana Pro 图片工具箱

> 基于 Nano Banana Pro 的图片工具箱，提供各种方便快捷的生图工具，以及本地化图片管理，用户可自定义 API 管理。

## ✨ 亮点介绍

| 功能 | 描述 |
|------|------|
| 📝 文章配图 | 上传文章后，一键生成高质量文章配图，提供 22 个精选模板 |
| 📕 XHS 配图 | 上传文字后，一键生成精美的小红书配图，提供 10 个精选模板 |
| 📊 信息图 | 将内容整理成单页高密度信息图，提供 17 种精选风格模板 |
| 💡 提示词管理 | 拉取网络热门提示词，支持收藏与一键应用 |

## 📋 功能列表

- **普通生成图片** - 输入提示词快速出图
- **文章配图** - 面向文章内容的一键配图生成
- **XHS 配图** - 面向小红书内容的一键配图生成
- **信息图** - 将内容整理成单页高密度信息图，支持 13 种精选风格
- **提示词管理** - 热门提示词拉取、收藏与一键应用
- **图片编辑** - 局部编辑功能（TODO），目前提供切片功能，可一键制作表情包
- **作品管理** - 本地化管理生成作品
- **API 设置** - 自定义 API 管理与切换

## 🛠️ 开发相关

### 技术栈

React 18 + TypeScript + Vite + Tailwind CSS + Zustand

### 开发步骤

```bash
npm install    # 安装依赖
npm run dev    # 启动开发
```

### 发布流程

```bash
npm run build  # 构建产物，部署 dist 目录即可
```

## 🚀 一键部署到 Cloudflare Pages

### 方式一：通过 GitHub 自动部署

1. Fork 本仓库到你的 GitHub
2. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Pages → Create a project
3. 连接你的 GitHub 仓库
4. 构建设置：
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. 在 Environment variables 中添加你的 API 配置：
   ```
   VITE_DEFAULT_API_TYPE=openai
   VITE_DEFAULT_API_HOST=https://your-proxy.example.com
   VITE_DEFAULT_API_KEY=sk-your-api-key
   VITE_DEFAULT_IMAGE_MODEL=gpt-image-1
   VITE_DEFAULT_PROVIDER_NAME=默认渠道
   ```
6. 点击 Deploy，完成！

### 方式二：通过 Wrangler CLI 部署

```bash
# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 创建 .env.local 文件并填入你的配置
cp .env.example .env.local
# 编辑 .env.local 填入你的中转站地址和 key

# 构建并部署
npm run build
wrangler pages deploy dist --project-name=nano-banana-pro
```

### 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `VITE_DEFAULT_API_TYPE` | API 类型 | `openai` 或 `gemini` |
| `VITE_DEFAULT_API_HOST` | 中转站地址 | `https://api.example.com` |
| `VITE_DEFAULT_API_KEY` | API Key | `sk-xxx` |
| `VITE_DEFAULT_IMAGE_MODEL` | 绘图模型 | `gpt-image-1` |
| `VITE_DEFAULT_TEXT_MODEL` | 文本模型（可选） | `gpt-4o` |
| `VITE_DEFAULT_PROVIDER_NAME` | 渠道显示名称 | `我的中转站` |

### R2 云存储配置（可选）

项目支持将生成的图片同步到 Cloudflare R2 存储桶，实现跨设备访问。

1. 在 CF Dashboard 创建 R2 存储桶，命名为 `nano-images`
2. 在 Pages 项目设置中绑定 R2：
   - Settings → Functions → R2 bucket bindings
   - Variable name: `IMAGES_BUCKET`
   - R2 bucket: `nano-images`

图片会自动按设备 ID 分文件夹存储，无需登录系统。

## 🙏 鸣谢

- [JimLiu/baoyu-skills](https://github.com/JimLiu/baoyu-skills) - 文章配图、XHS 配图创意
- [Tansuo2021/gemini-3-pro-image-preview](https://github.com/Tansuo2021/gemini-3-pro-image-preview) - 基础项目架构
