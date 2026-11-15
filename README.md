# 智能体金融文献收集与分析系统 · Demo

实验室专属文献发现、AI 阅读与研究分析平台的演示站点。演示数据来自课题组 2026-11-06 阶段报告《智能体与经济金融交叉研究：文献分类与研究进展》。

在线访问：<https://chenyihuang-1.github.io/agent-finance-pub-collect-analysis-system./>

## 页面

| 页面 | 内容 |
| --- | --- |
| 总览 | 收录规模、检索漏斗、年度分布、三个一级方向、15 个二级方向、来源构成 |
| 文献库 | 88 篇代表文献，按方向、来源类型、收录类型、年份组合筛选，筛选条件写入网址 |
| 论文详情 | 元数据、平台 paper_id、处理状态流转、结构化阅读记录、同方向文献 |
| 研究方向 | 3 × 15 两级分类图谱与判别规则；每个方向的研究内容、方法、发现、局限与代表研究 |
| 研究机会 | 六类计算机方法的迁移机会，重点方向：风险传染 |
| 月报 | 2026 年 11 月月报草稿，八个部分，可下载 Markdown |
| 审核台 | 待补 DOI、作者待补全、边界情形复核、归类分歧、月报待审 |
| 来源管理 | 来源注册表与检索进度 |
| 收集规范与流程 | 平台三阶段流程、收录类型与判定标准、数据来源、质量控制 |

文献、分类和统计数字来自报告；PDF 状态、审核队列和月报为流程演示。

## 结构

```
docs/            静态站点（GitHub Pages 从此目录发布）
  index.html
  style.css
  app.js         页面与路由（无构建步骤，无第三方库）
  data.js        由 tools/build_data.py 生成
tools/
  build_data.py  把报告（pandoc 转成的 Markdown）解析为 data.js
```

更新数据：

```bash
pandoc 报告.docx -t markdown -o report.md
python tools/build_data.py report.md docs/data.js
```

本地预览：直接用浏览器打开 `docs/index.html`。
