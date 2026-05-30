# 轻图压缩 · 在线图片压缩工具

一个**纯前端、零构建、零服务器成本**的在线图片压缩网站。图片在浏览器本地用 Canvas 处理，**不上传服务器**。这是「做项目 → 上线 → 挂广告」最简单能跑通的起点。

---

## 一、它能做什么

- 拖拽 / 选择多张图片，**批量压缩**
- 支持 **JPG / PNG / WebP** 压缩与互相转换
- 自定义压缩质量、最大宽度（等比缩放）
- 显示压缩**前后体积对比**与节省比例
- 一键下载 / 打包下载全部
- 已内置：广告位、关于/隐私/联系页、SEO 标签、`ads.txt`、`robots.txt`、`sitemap.xml`

## 二、文件结构

```
app_advence/
├── index.html      # 主页面（压缩工具）
├── styles.css      # 样式
├── script.js       # 压缩逻辑（纯前端 Canvas）
├── about.html      # 关于我们（AdSense 必备）
├── privacy.html    # 隐私政策（AdSense 必备）
├── contact.html    # 联系我们（AdSense 必备）
├── ads.txt         # AdSense 防盗用文件
├── robots.txt      # 搜索引擎抓取规则
└── sitemap.xml     # 站点地图（利于 SEO 收录）
```

---

## 三、本地预览

**最简单**：直接双击 `index.html` 用浏览器打开即可使用。

**推荐（更贴近线上环境）**：用任意静态服务器启动。任选一种：

```bash
# 方式 A：Python（电脑一般自带）
python -m http.server 8000

# 方式 B：Node.js
npx serve .
```

然后浏览器访问 `http://localhost:8000`。

---

## 四、部署上线（推荐 Vercel，免费 + 自动 HTTPS）

### 方式 A：拖拽部署（最快，3 分钟）
1. 注册 [vercel.com](https://vercel.com)（用 GitHub/邮箱登录）。
2. 进入 [vercel.com/new](https://vercel.com/new)，找到 **Deploy** 区域，把整个 `app_advence` 文件夹拖进去。
3. 等 1–2 分钟，分配一个 `xxx.vercel.app` 网址，立即可访问。

### 方式 B：GitHub 自动部署（推荐长期用）
1. 把代码推到 GitHub 仓库。
2. Vercel → Add New → Project → Import 该仓库 → Deploy。
3. 以后每次 `git push`，Vercel 自动重新部署。

### 绑定独立域名（强烈建议）
- 域名十几块钱一年（阿里云/腾讯云/Namecheap 均可）。
- Vercel 项目 → Settings → Domains → 添加你的域名，按提示改 DNS 解析。
- **申请 Google AdSense 时，独立域名通过率远高于免费二级域名。**

> 国内访问加速：可同时部署到腾讯云 CloudBase / Cloudflare Pages。

---

## 五、挂广告变现（核心）

> 国内流量走「百度联盟」，海外流量走「Google AdSense」，两者可同时接。

### 方案 1：Google AdSense（赚海外流量，美金，点击单价高）

**门槛（务必先满足）**：
- ✅ 独立域名 + HTTPS（Vercel 自带 HTTPS）
- ✅ 有「关于我们 / 隐私政策 / 联系我们」三页（本项目已内置）
- ✅ 有一定量原创内容（建议再写 15–20 篇与图片/工具相关的教程文章）

**接入步骤**：
1. 用 Gmail 登录 [Google AdSense](https://adsense.google.com)，添加你的网站，提交审核（2–14 天）。
2. 审核通过后，把后台给的脚本粘到 `index.html` 的 `<head>` 里——
   搜索注释 **`【广告 1/2】`** 的位置，取消注释并替换 `ca-pub-XXXXXXXXXXXXXXXX`。
3. 在后台「广告 → 按广告单元」创建**展示广告**，复制代码。
4. 把广告代码粘进页面里 `class="ad-slot"` 的 `<div>` 内部（删掉里面的占位 `<span>`）。
   本项目已预留 3 个广告位：顶部横幅、内容中部、（可自行再加侧边/底部）。
5. 把 `ads.txt` 里的 `pub-XXXXXXXXXXXXXXXX` 换成你的发布商 ID。

### 方案 2：百度联盟（赚国内流量）

**硬门槛**：
- ⚠️ 网站必须**已完成工信部备案**，且使用**中国大陆境内服务器**。未备案 / 境外或香港主机会被直接拒绝。
- （因此国内变现这条，要么用国内云主机 + 备案，要么先只做 AdSense。）

**接入步骤**：
1. 登录 [union.baidu.com](https://union.baidu.com)，用**没注册过百度产品**的手机号注册。
2. 填写网站信息（域名、名称、简介、备案号）。简介**别出现**“赚钱/刷量/高收益”等敏感词。
3. 提交审核（3–7 天）。期间保持网站正常访问、内容更新。
4. 通过后「合作管理 → 广告位管理」创建代码位（Banner / 自适应），复制 JS 代码。
5. 把代码**原样**粘进 `class="ad-slot"` 的 `<div>` 内部（代码不能改任何字符）。
6. 把 `index.html` 底部注释里的备案号 `京ICP备XXXXXXXX号` 换成你的真实备案号。

**提通过率技巧**：提交前先写 ≥3 篇原创深度文章（每篇 ≥1500 字），被搜索引擎收录后再申请。

---

## 六、引流（免费，效果持续）

| 渠道 | 玩法 |
|------|------|
| 小红书 | 发「压缩前 vs 后」对比图，标题如“我不允许还有人不知道这个免费图片压缩工具” |
| 知乎 | 回答“图片太大怎么压缩”“怎么免费压缩图片”等问题，把工具作为方案推荐 |
| SEO | title 写核心词（已配置），围绕“图片压缩/格式转换”写教程文章 |
| 微信搜一搜 | 公众号写工具教程，标题含“免费在线XX” |
| 出海 | 用工具把界面翻成英文版，发到 Reddit / ProductHunt（AdSense 英文单价是中文的 20 倍+） |

---

## 七、心法：不要只做一个，做十个

> 第一个项目挑最简单的（就像这个）快速跑通流程；上线后观察 1 个月数据；跑通了立刻复制做第二个，项目间互相导流，形成流量矩阵。**别追求完美，先上线**——只要能跑通「有人用 → 看到第一笔广告收入」，你就赢了 90% 只收藏不行动的人。

---

## 八、上线前替换清单（Ctrl+F 搜 `example.com` 和 `XXXX`）

- [ ] `index.html` / `about.html` 等所有页面里的 `https://example.com/` → 你的真实域名
- [ ] `index.html` `<head>` 里的 AdSense 脚本（`ca-pub-XXXX`）
- [ ] 各 `.ad-slot` 里的占位 → 真实广告代码
- [ ] `ads.txt` 里的 `pub-XXXXXXXXXXXXXXXX`
- [ ] `robots.txt` / `sitemap.xml` 里的 `example.com`
- [ ] `contact.html` 里的 `your-email@example.com` → 真实邮箱
- [ ] （走百度联盟）`index.html` 底部备案号
