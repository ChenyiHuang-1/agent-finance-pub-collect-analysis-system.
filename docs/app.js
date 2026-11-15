(function () {
  'use strict';
  const D = window.LIT_DATA;
  const app = document.getElementById('app');
  const tip = document.getElementById('tip');

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => Number(n).toLocaleString('zh-CN');
  const L1 = [
    { id: 'SIM', name: '智能体模拟经济金融', short: '模拟', color: 'var(--s1)', q: '智能体代表居民、投资者、企业、银行和政府。能否用智能体更好地研究真实的经济金融系统？' },
    { id: 'PAR', name: '智能体参与经济金融', short: '参与', color: 'var(--s2)', q: 'AI 智能体本身作为决策者、交易方或机制设计者进入经济活动。AI 进入后会发生什么？' },
    { id: 'APP', name: '智能体应用于经济金融', short: '应用', color: 'var(--s3)', q: '智能体是完成业务任务的工具。它能否胜任经济金融业务，提高效率和收益？' },
  ];
  const l1 = (id) => L1.find((x) => x.id === id);
  const dirById = Object.fromEntries(D.directions.map((d) => [d.id, d]));
  const paperByRef = Object.fromEntries(D.papers.map((p) => [p.ref, p]));
  const paperById = Object.fromEntries(D.papers.map((p) => [p.id, p]));

  // demo workflow status, derived deterministically
  const OA_HOSTS = ['arxiv.org', 'proceedings.mlr.press', 'openreview.net', '10.18653', 'proceedings.neurips.cc', '10.52202', 'ifaamas.org', 'strategicreasoning.org'];
  function status(p) {
    const oa = OA_HOSTS.some((h) => p.url.includes(h));
    const meta = p.doi ? 'DOI 已核验' : '待补 DOI';
    let pdf, reading, stage;
    if (oa) {
      pdf = '开放获取 · 已下载';
      if (p.ref % 2 === 0) { reading = '全文已读 · 待审核'; stage = 'review_required'; }
      else { reading = '全文解析中'; stage = 'parsed'; }
    } else {
      pdf = '需机构订阅'; reading = '仅摘要分析'; stage = 'pdf_pending';
    }
    return { oa, meta, pdf, reading, stage };
  }
  const STAGES = ['metadata_only', 'pdf_pending', 'pdf_ready', 'parsing', 'parsed', 'summarizing', 'review_required', 'reviewed'];

  function dirChip(id) {
    const d = dirById[id];
    if (!d) return '<span class="chip">未归入二级方向</span>';
    return `<a class="chip" href="#/direction/${d.id}"><span class="dot" style="background:${l1(d.level1Id).color}"></span>${esc(d.id)} ${esc(d.name)}</a>`;
  }
  function incChip(t) {
    const cls = t === '严格纳入' ? 'teal' : t === '方法参考' ? 'gold' : '';
    return `<span class="chip ${cls}">${esc(t)}</span>`;
  }
  function paperLi(p, withNote = true) {
    return `<div class="paper-li"><a class="t" href="#/paper/${p.id}">${esc(p.title)}</a>
      <div class="meta">${esc(p.authors)} · ${p.year} · ${esc(p.venueShort)} · <span class="mono">${p.id}</span></div>
      ${withNote && p.note ? `<div class="s">${esc(p.note)}</div>` : ''}</div>`;
  }
  function head(eyebrow, title, sub, right = '') {
    return `<div class="page-head"><div><div class="eyebrow">${esc(eyebrow)}</div><h1>${esc(title)}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${right}</div>`;
  }
  function showTip(e, html) { tip.innerHTML = html; tip.classList.add('on'); moveTip(e); }
  function moveTip(e) { tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 270) + 'px'; tip.style.top = (e.clientY + 14) + 'px'; }
  function hideTip() { tip.classList.remove('on'); }
  function bindTips(root) {
    root.querySelectorAll('[data-tip]').forEach((el) => {
      el.addEventListener('mouseenter', (e) => showTip(e, el.getAttribute('data-tip')));
      el.addEventListener('mousemove', moveTip);
      el.addEventListener('mouseleave', hideTip);
    });
  }
  function hbars(rows, max, color) {
    return `<div class="bars">${rows.map((r) => `
      <div class="bar-row" data-tip="${esc(r.tip || `${r.name}：${r.n} 篇`)}">
        <span class="name">${r.href ? `<a href="${r.href}">${esc(r.name)}</a>` : esc(r.name)}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${(r.n / max) * 100}%;background:${r.color || color || 'var(--s1)'}"></div></div>
        <span class="num">${r.n}</span>
      </div>`).join('')}</div>`;
  }

  // ---------- pages ----------
  function overview() {
    const total = D.inclusion.reduce((s, r) => s + r.a + r.b + r.c, 0);
    const strict = 257;
    const l1Counts = L1.map((x) => ({ ...x, n: D.directions.filter((d) => d.level1Id === x.id).reduce((s, d) => s + d.count, 0) }));
    const dirs = [...D.directions].sort((a, b) => b.count - a.count);
    const maxY = Math.max(...D.yearly.map((y) => y.n));
    const W = 640, H = 230, pad = { l: 34, r: 8, t: 22, b: 26 };
    const bw = (W - pad.l - pad.r) / D.yearly.length;
    const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / maxY);
    const grid = [0, 25, 50, 75, 100].map((g) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(g)}" y2="${y(g)}" stroke="var(--line)" stroke-width="1"/><text x="${pad.l - 6}" y="${y(g) + 4}" text-anchor="end">${g}</text>`).join('');
    const bars = D.yearly.map((d, i) => {
      const x = pad.l + i * bw + bw * 0.18, w = bw * 0.64, top = y(d.n), h = Math.max(0, y(0) - top);
      const r = Math.min(4, h / 2);
      const path = h > 0 ? `M${x},${y(0)} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${y(0)} Z` : '';
      const label = d.year >= 2024 ? `<text x="${x + w / 2}" y="${top - 6}" text-anchor="middle" style="fill:var(--ink);font-weight:700">${d.n}</text>` : '';
      return `<g data-tip="${d.year} 年：严格纳入 ${d.n} 篇"><rect x="${pad.l + i * bw}" y="${pad.t}" width="${bw}" height="${H - pad.t - pad.b}" fill="transparent"/>${path ? `<path d="${path}" fill="var(--s1)"/>` : ''}${label}<text x="${x + w / 2}" y="${H - 8}" text-anchor="middle">${String(d.year).slice(2)}</text></g>`;
    }).join('');

    app.innerHTML = `
      ${head('总览', '智能体与经济金融交叉研究：文献全景', '围绕三个问题整理文献：智能体在经济金融中研究什么、如何分类、哪些计算机新方法可以迁移。检索范围 2015–2026 年，重点关注 2023 年以来的研究。')}
      <div class="grid g4">
        <div class="card kpi"><div class="v">${fmt(total)}</div><div class="l">候选与收录记录</div><div class="d">三部分来源合并去重后</div></div>
        <div class="card kpi"><div class="v">${strict}</div><div class="l">严格纳入论文</div><div class="d">另有方法参考 87、背景文献 61</div></div>
        <div class="card kpi"><div class="v">3 × 15</div><div class="l">一级 × 二级研究方向</div><div class="d"><a href="#/directions">查看方向图谱 →</a></div></div>
        <div class="card kpi"><div class="v">${D.agreement.level2}%</div><div class="l">二级方向归类一致率</div><div class="d">两轮独立归类，kappa ${D.agreement.kappa}</div></div>
      </div>

      <div class="card mt">
        <div class="card-head"><h3>检索漏斗（ICML、ACL、EMNLP、NAACL 逐年检索）</h3><span class="hint">再加前期积累与补充检索，全库严格纳入 257 篇</span></div>
        <div class="funnel">${D.funnel.map((f, i) => `<div class="step ${i === D.funnel.length - 1 ? 'last' : ''}"><div class="v">${fmt(f.value)}</div><div class="l">${esc(f.label)}</div></div>`).join('')}</div>
      </div>

      <div class="grid g2 mt">
        <div class="card">
          <div class="card-head"><h3>严格纳入论文的年度分布</h3><span class="hint">仅统计完成逐年检索的四个会议</span></div>
          <svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="2015 至 2026 年严格纳入论文数，2026 年 99 篇">${grid}${bars}</svg>
          <p class="hint">2024–2026 年合计 142 篇，占 12 年总数的 86%。</p>
        </div>
        <div class="card">
          <div class="card-head"><h3>三个一级方向</h3><span class="hint">严格纳入 257 篇</span></div>
          <div class="stack" role="img" aria-label="模拟 78 篇，参与 98 篇，应用 81 篇">${l1Counts.map((x) => `<div style="flex:${x.n};background:${x.color}" data-tip="${esc(x.name)}：${x.n} 篇">${x.short} ${x.n}</div>`).join('')}</div>
          <div class="legend mt">${l1Counts.map((x) => `<span><i class="dot" style="background:${x.color}"></i>${esc(x.name)}</span>`).join('')}</div>
          <div class="mt">
            <div class="card-head" style="margin-bottom:8px"><h3 style="font-size:15px">四个会议 166 篇所用方法</h3></div>
            ${hbars(D.methodsMix, 166, 'var(--s1)')}
          </div>
        </div>
      </div>

      <div class="grid g2 mt">
        <div class="card">
          <div class="card-head"><h3>十五个二级方向篇数</h3><div class="legend">${L1.map((x) => `<span><i class="dot" style="background:${x.color}"></i>${x.short}</span>`).join('')}</div></div>
          ${hbars(dirs.map((d) => ({ name: `${d.id} ${d.name}`, n: d.count, color: l1(d.level1Id).color, href: `#/direction/${d.id}`, tip: `${d.name}（${l1(d.level1Id).short}）：${d.count} 篇` })), 45)}
        </div>
        <div>
          <div class="card">
            <div class="card-head"><h3>来源构成</h3><span class="hint">严格纳入 257 篇</span></div>
            ${hbars(D.sources, 214, 'var(--s1)')}
          </div>
          <div class="grid mt">
            <div class="insight"><b>增长来自大模型智能体</b>四个会议 166 篇严格纳入论文中，117 篇使用大模型智能体，约占七成。</div>
            <div class="insight"><b>经济金融期刊仍以 ABM 为主</b>37 篇期刊论文中 33 篇是基于主体的模型，集中在 JEDC 和 JEBO。</div>
            <div class="insight"><b>风险传染是最明显的空白</b>四个会议 12 年只有 1 篇；用大模型研究挤兑的正式论文只有 Kazinnik（2026）。<a href="#/opportunities">看研究机会 →</a></div>
          </div>
        </div>
      </div>`;
  }

  function library(params) {
    const q = params.get('q') || '', fl1 = params.get('l1') || '', fdir = params.get('dir') || '', fgrp = params.get('grp') || '', finc = params.get('inc') || '', fyr = params.get('yr') || '';
    const groups = [...new Set(D.papers.map((p) => p.venueGroup))];
    const dirOpts = D.directions.filter((d) => !fl1 || d.level1Id === fl1);
    app.innerHTML = `
      ${head('文献库', '文献库', '报告附录中的 88 篇代表性文献。每条记录有平台内部生成的 paper_id，点击查看元数据、结构化阅读记录与处理状态。')}
      <div class="filters" id="filters">
        <input id="fq" type="search" placeholder="搜索标题、作者、来源、DOI" value="${esc(q)}">
        <select id="fl1"><option value="">全部一级方向</option>${L1.map((x) => `<option value="${x.id}" ${fl1 === x.id ? 'selected' : ''}>${x.name}</option>`).join('')}</select>
        <select id="fdir"><option value="">全部二级方向</option>${dirOpts.map((d) => `<option value="${d.id}" ${fdir === d.id ? 'selected' : ''}>${d.id} ${esc(d.name)}</option>`).join('')}</select>
        <select id="fgrp"><option value="">全部来源类型</option>${groups.map((g) => `<option ${fgrp === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
        <select id="finc"><option value="">全部收录类型</option>${['严格纳入', '方法参考', '背景文献'].map((g) => `<option ${finc === g ? 'selected' : ''}>${g}</option>`).join('')}</select>
        <select id="fyr"><option value="">全部年份</option>${[...new Set(D.papers.map((p) => p.year))].sort((a, b) => b - a).map((y) => `<option ${String(y) === fyr ? 'selected' : ''}>${y}</option>`).join('')}</select>
        <button class="btn" id="clear" type="button">清除</button>
      </div>
      <div class="card"><div class="card-head"><span class="count" id="count"></span><span class="hint">跨维度取 AND；筛选条件写入网址，可直接分享</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>paper_id</th><th>标题 / 作者</th><th>年份</th><th>来源</th><th>方向</th><th>收录</th><th>全文 / 阅读（演示）</th></tr></thead><tbody id="rows"></tbody></table></div></div>`;

    function apply() {
      const sp = new URLSearchParams();
      const vals = { q: fq.value.trim(), l1: fl1s.value, dir: fdirs.value, grp: fgrps.value, inc: fincs.value, yr: fyrs.value };
      Object.entries(vals).forEach(([k, v]) => v && sp.set(k, v));
      history.replaceState(null, '', '#/library' + (sp.toString() ? '?' + sp : ''));
      const ql = vals.q.toLowerCase();
      const rows = D.papers.filter((p) => {
        const d = dirById[p.dir];
        if (ql && !(p.title + p.authors + p.venue + p.doi + p.id).toLowerCase().includes(ql)) return false;
        if (vals.l1 && (!d || d.level1Id !== vals.l1)) return false;
        if (vals.dir && p.dir !== vals.dir) return false;
        if (vals.grp && p.venueGroup !== vals.grp) return false;
        if (vals.inc && p.inclusion !== vals.inc) return false;
        if (vals.yr && String(p.year) !== vals.yr) return false;
        return true;
      }).sort((a, b) => b.year - a.year || a.ref - b.ref);
      document.getElementById('count').textContent = `共 ${rows.length} 篇`;
      document.getElementById('rows').innerHTML = rows.map((p) => {
        const s = status(p);
        return `<tr class="click" data-id="${p.id}"><td class="mono">${p.id}</td><td><div class="t">${esc(p.title)}</div><div class="meta">${esc(p.authors)}</div></td><td>${p.year}</td><td>${esc(p.venueShort)}<div class="meta">${esc(p.venueGroup)}</div></td><td>${dirChip(p.dir)}</td><td>${incChip(p.inclusion)}</td><td><div class="meta">${esc(s.pdf)}</div><div class="meta">${esc(s.reading)}</div></td></tr>`;
      }).join('') || '<tr><td colspan="7" class="hint">没有符合条件的文献。</td></tr>';
      document.querySelectorAll('#rows tr.click').forEach((tr) => tr.addEventListener('click', (e) => { if (e.target.closest('a')) return; location.hash = '#/paper/' + tr.dataset.id; }));
    }
    const fq = document.getElementById('fq'), fl1s = document.getElementById('fl1'), fdirs = document.getElementById('fdir'), fgrps = document.getElementById('fgrp'), fincs = document.getElementById('finc'), fyrs = document.getElementById('fyr');
    fq.addEventListener('input', apply);
    [fdirs, fgrps, fincs, fyrs].forEach((el) => el.addEventListener('change', apply));
    fl1s.addEventListener('change', () => { fdirs.value = ''; apply(); render(); });
    document.getElementById('clear').addEventListener('click', () => { location.hash = '#/library'; });
    apply();
  }

  function paper(id) {
    const p = paperById[id];
    if (!p) { app.innerHTML = '<p>未找到该文献。</p>'; return; }
    const d = dirById[p.dir];
    const s = status(p);
    const ci = STAGES.indexOf(s.stage);
    const same = d ? D.papers.filter((x) => x.dir === d.id && x.id !== p.id) : [];
    app.innerHTML = `
      <a class="back" href="#/library">← 返回文献库</a>
      ${head(p.id, p.title, `${esc(p.authors)} · ${p.year} · ${esc(p.venue)}`)}
      <div class="grid g2">
        <div class="card">
          <h3>元数据</h3>
          <dl class="kv">
            <dt>paper_id</dt><dd class="mono">${p.id}</dd>
            <dt>标题</dt><dd>${esc(p.title)}</dd>
            <dt>作者</dt><dd>${esc(p.authors)}${p.authors.includes('et al.') ? ' <span class="chip warn">作者待补全</span>' : ''}</dd>
            <dt>发表时间</dt><dd>${p.year}</dd>
            <dt>来源</dt><dd>${esc(p.venue)}<br><span class="chip">${esc(p.venueGroup)}</span></dd>
            <dt>DOI / 链接</dt><dd>${p.doi ? `<a href="https://doi.org/${esc(p.doi)}" target="_blank" rel="noopener">${esc(p.doi)}</a>` : `<a href="${esc(p.url)}" target="_blank" rel="noopener">落地页</a> <span class="chip warn">待补 DOI</span>`}</dd>
            <dt>收录类型</dt><dd>${incChip(p.inclusion)}</dd>
            <dt>研究方向</dt><dd>${dirChip(p.dir)}${d ? `<div class="hint">一级：${esc(d.level1)}</div>` : ''}</dd>
          </dl>
        </div>
        <div class="card">
          <h3>处理状态 <span class="hint">（流程演示）</span></h3>
          <div class="flow">${STAGES.map((st, i) => `<span class="st ${i < ci ? 'done' : i === ci ? 'cur' : ''}">${st}</span>${i < STAGES.length - 1 ? '<span class="ar">→</span>' : ''}`).join('')}</div>
          <dl class="kv mt">
            <dt>元数据</dt><dd>${esc(s.meta)}</dd>
            <dt>全文</dt><dd>${esc(s.pdf)}</dd>
            <dt>阅读</dt><dd>${esc(s.reading)}</dd>
          </dl>
          <p class="note-box mt">需机构订阅的全文由有访问权的成员上传；全文未获取时只做摘要级分析，并明确标注。</p>
        </div>
      </div>
      <div class="card mt">
        <div class="card-head"><h3>结构化阅读记录</h3><span class="chip gold">摘要级 · 来自阶段报告，未经全文核验</span></div>
        <div class="field"><h4>研究方向</h4><p>${d ? `主方向 ${esc(d.id)} ${esc(d.name)}（${esc(d.level1)}）` : '未归入二级方向（背景文献或方法参考）'}</p></div>
        <div class="field"><h4>研究内容与主要发现</h4><p>${p.note ? esc(p.note) : '未报告'}</p></div>
        <div class="field"><h4>主要方法（所属方向常用方法）</h4><p>${d ? esc(d.methods) : '无法判断'}</p></div>
        <div class="field"><h4>局限与可探索问题（所属方向，系统汇总）</h4><p>${d ? esc(d.limits) : '无法判断'}</p></div>
        <div class="field"><h4>证据定位</h4><p class="hint">全文精读后在此绑定 PDF 页码与证据片段；当前为摘要级记录，未绑定证据。</p></div>
      </div>
      ${same.length ? `<div class="card mt"><h3>同方向代表文献</h3>${same.map((x) => paperLi(x, false)).join('')}</div>` : ''}`;
  }

  function directions() {
    app.innerHTML = `
      ${head('研究方向', '两级研究分类：3 个一级、15 个二级方向', '一级按智能体在研究中扮演的角色划分，每个一级对应一个研究问题。篇数为严格纳入论文。')}
      <div class="grid g3">${L1.map((x) => {
        const ds = D.directions.filter((d) => d.level1Id === x.id);
        const n = ds.reduce((s, d) => s + d.count, 0);
        return `<div class="l1-col"><h3><i class="dot" style="background:${x.color}"></i>${x.name} · ${n} 篇</h3><p class="q">${esc(x.q)}</p>
          ${ds.map((d) => `<a class="dir-card" href="#/direction/${d.id}"><div class="top"><b>${d.id} ${esc(d.name)}</b><span class="n">${d.count}</span></div><div class="mini"><i style="width:${(d.count / 45) * 100}%;background:${x.color}"></i></div><p>${esc(d.content)}</p></a>`).join('')}
        </div>`;
      }).join('')}</div>
      <div class="card mt">
        <h3>判别规则：一篇论文只定一个主方向</h3>
        <div class="grid g2">
          <div class="field"><h4>先看智能体的角色</h4><p>代表人类或机构、用来研究真实系统的归入模拟；研究对象是 AI 本身的归入参与；完成业务任务、以效果评价的归入应用。</p></div>
          <div class="field"><h4>替代被试，还是评价 AI</h4><p>以人类数据为对照、替代或校准被试的归入行为实验；只评价 AI 自身理性与偏差的归入 AI 的经济理性。</p></div>
          <div class="field"><h4>研究市场，还是参与交易</h4><p>研究价格形成、市场稳定或构建模拟器的归入金融市场模拟；以交易收益为主要评价的归入交易与资产配置。</p></div>
          <div class="field"><h4>用 AI 审查，还是 AI 有风险</h4><p>AI 执行审查、审计和反洗钱的归入合规审计；研究 AI 被诱导、操纵或违规的归入安全与操纵风险。</p></div>
        </div>
      </div>`;
  }

  function direction(id) {
    const d = dirById[id];
    if (!d) { app.innerHTML = '<p>未找到该方向。</p>'; return; }
    const x = l1(d.level1Id);
    const reps = d.reps.map((r) => paperByRef[r]).filter(Boolean);
    const all = D.papers.filter((p) => p.dir === d.id && !d.reps.includes(p.ref));
    const sibs = D.directions.filter((s) => s.level1Id === d.level1Id);
    app.innerHTML = `
      <a class="back" href="#/directions">← 返回研究方向</a>
      ${head(`${d.level1} · ${d.id}`, d.name, `严格纳入 <b>${d.count}</b> 篇 · 本站收录代表文献 ${reps.length + all.length} 篇`)}
      <div class="chips" style="margin-bottom:16px">${sibs.map((s) => `<a class="chip ${s.id === d.id ? 'teal' : ''}" href="#/direction/${s.id}">${s.id} ${esc(s.name)}</a>`).join('')}</div>
      <div class="grid g2">
        <div class="card"><h3>研究内容</h3><p>${esc(d.content)}</p><h3 class="mt">主要方法</h3><div class="chips">${d.methods.split(/[，,；;]/).filter(Boolean).map((m) => `<span class="chip">${esc(m.replace(/。$/, ''))}</span>`).join('')}</div></div>
        <div class="card" style="border-top:4px solid ${x.color}"><h3>已有发现</h3><p>${esc(d.findings)}</p></div>
      </div>
      <div class="card mt" style="background:var(--accent-soft)"><h3>局限与可探索的问题</h3><p>${esc(d.limits)}</p></div>
      <div class="card mt"><div class="card-head"><h3>代表研究</h3><a class="hint" href="#/library?dir=${d.id}">在文献库中筛选 →</a></div>${reps.map((p) => paperLi(p)).join('')}${all.map((p) => paperLi(p)).join('')}</div>`;
  }

  function opportunities() {
    app.innerHTML = `
      ${head('研究机会', '计算机新方法向经济金融迁移的机会', '六类计算机方法已在经济金融中出现初步应用，但仍有明显空白。选题为基于文献提出的研究建议，需要进一步论证。')}
      <div class="card" style="background:var(--brand);color:#C9D3E3;border:none">
        <div class="eyebrow" style="color:#E3A84B">重点方向</div>
        <h2 style="color:#F7F5F0">风险传染：大模型主体 × 资产负债表约束 × 银行间网络</h2>
        <p style="margin-top:8px">四个会议 12 年的逐年检索中，风险传染与金融稳定方向只有 1 篇；用大模型智能体研究挤兑的正式论文只检索到 Kazinnik（2026）一篇。基于主体的传染模型有完整资产负债表，但行为规则多为预设。把三者结合起来研究信息、预期和行为如何在金融网络中传染，文献很少，可作为课题组重点方向。</p>
        <p style="margin-top:10px"><a style="color:#E3A84B" href="#/direction/D06">查看风险传染方向的 8 篇代表研究 →</a></p>
      </div>
      <div class="grid g2 mt">${D.migration.map((m, i) => `
        <div class="card">
          <div class="eyebrow">机会 ${i + 1}</div>
          <h3>${esc(m.method)}</h3>
          <dl class="kv mt" style="grid-template-columns:96px 1fr">
            <dt>计算机进展</dt><dd>${esc(m.cs)}</dd>
            <dt>已有应用</dt><dd>${esc(m.applied)}</dd>
            <dt>尚待解决</dt><dd>${esc(m.gap)}</dd>
          </dl>
          <p class="note-box mt"><b>可研究的选题：</b>${esc(m.topic)}</p>
          <div class="chips mt">${m.refs.map((r) => paperByRef[r]).filter(Boolean).map((p) => `<a class="chip" href="#/paper/${p.id}">${esc(p.authors.split(',')[0].split(' ').slice(-1)[0])} ${p.year}</a>`).join('')}</div>
        </div>`).join('')}</div>
      <div class="card mt"><h3>下一步工作</h3>
        <ol style="margin:0;padding-left:20px">
          <li>完成其余指定来源的逐年检索：NeurIPS、ICLR、AAAI、IJCAI、AAMAS、ACM EC、CHI、CSCW 等会议，以及 Science、Nature 系列和经济金融期刊。</li>
          <li>逐条核验书目信息，补全作者和 DOI，人工确认严格纳入名单和两级归类。</li>
          <li>根据完整检索结果检验两级分类，重点观察篇数较少的方向。</li>
          <li>按两级分类建立 Zotero 主题库，形成可推广到其他主题的文献整理规范。</li>
        </ol></div>`;
  }

  const REPORT = {
    month: '2026 年 11 月', cutoff: '2026-11-06', status: '草稿 · 待审核', version: 'v0.1',
    highlights: [
      { t: '大模型智能体推动文献快速增长', b: '四个会议严格纳入论文 2024 年 15 篇、2025 年 28 篇、2026 年 99 篇；166 篇中 117 篇使用大模型智能体。', refs: [] },
      { t: '学习型定价智能体普遍表现出合谋倾向', b: '从 Q 学习到大模型，定价智能体都会自发达到超竞争价格；仅检查推理过程无法识别合谋。', refs: [44, 47, 48] },
      { t: '合成被试经校正后偏差明显减小', b: '加入人口特征画像、用少量真实数据校正后，合成数据可以辅助需求弹性与处理效应估计。', refs: [2, 5] },
      { t: '金融智能体评测转向实时与成本收益', b: '新基准在官方发布前做宏观现时预测以避免数据泄露，并开始检验交易智能体能否覆盖自身推理成本。', refs: [70, 76] },
      { t: '风险传染方向空白最明显', b: '四个会议 12 年仅 1 篇；大模型挤兑研究仅 Kazinnik（2026）。适合作为课题组重点方向。', refs: [33] },
    ],
    key: [33, 47, 21, 11, 76],
    order: [
      { ref: 1, why: 'JEL 综述，先建立 ABM 在经济金融中的整体图景。' },
      { ref: 33, why: '与课题组风险传染方向最接近的大模型研究。' },
      { ref: 30, why: '银行与资产管理者两条传染渠道的 ABM 基准。' },
      { ref: 47, why: '大模型定价合谋，参与类研究的代表。' },
      { ref: 5, why: '合成被试与少量真实数据校正的方法，可直接借鉴。' },
    ],
  };
  function reportMarkdown() {
    const lines = [`# 智能体与经济金融交叉研究月报（${REPORT.month}）`, '', `状态：${REPORT.status} · 数据截止：${REPORT.cutoff} · 版本：${REPORT.version}`, '', '## 本月概况', '',
      '- 候选与收录记录 958 条，严格纳入 257 篇，方法参考 87 篇，背景文献 61 篇，扩展阅读 43 篇', '- 完成逐年检索的来源：ICML、ACL、EMNLP、NAACL（2015–2026）', `- 二级方向归类一致率 ${D.agreement.level2}%，kappa ${D.agreement.kappa}`, '', '## 研究亮点', ''];
    REPORT.highlights.forEach((h, i) => lines.push(`${i + 1}. **${h.t}**：${h.b}${h.refs.length ? ' ' + h.refs.map((r) => paperByRef[r].id).join('、') : ''}`));
    lines.push('', '## 重点论文', '');
    REPORT.key.forEach((r) => { const p = paperByRef[r]; lines.push(`- ${p.authors} (${p.year}). ${p.title}. ${p.venue}. ${p.url}`); });
    lines.push('', '## 建议阅读顺序（系统建议）', '');
    REPORT.order.forEach((o, i) => { const p = paperByRef[o.ref]; lines.push(`${i + 1}. ${p.title}（${p.year}）：${o.why}`); });
    return lines.join('\n');
  }
  function report() {
    const l1Counts = L1.map((x) => ({ ...x, ds: D.directions.filter((d) => d.level1Id === x.id) }));
    app.innerHTML = `
      ${head('月报', `智能体与经济金融交叉研究月报 · ${REPORT.month}`, '月报先形成“问题—方法—数据—结论—局限”比较矩阵，再综合同类工作；审核通过后生成固定快照。', '<button class="btn primary" id="dl" type="button">下载 Markdown</button>')}
      <div class="status-row"><span class="chip gold">${REPORT.status}</span><span class="chip">数据截止 ${REPORT.cutoff}</span><span class="chip">${REPORT.version}</span><span class="chip">覆盖：4 个会议逐年检索 + 前期积累 + 补充检索</span></div>
      <div class="report">
        <section><h2>1 本月概况</h2>
          <div class="grid g4">
            <div class="card kpi"><div class="v">958</div><div class="l">候选与收录记录</div></div>
            <div class="card kpi"><div class="v">257</div><div class="l">严格纳入</div></div>
            <div class="card kpi"><div class="v">245</div><div class="l">边界情形独立复核</div></div>
            <div class="card kpi"><div class="v">18</div><div class="l">归类分歧已裁定</div></div>
          </div></section>
        <section><h2>2 研究进展</h2>
          ${l1Counts.map((x) => `<div class="card mt"><h3><i class="dot" style="background:${x.color}"></i> ${x.name}</h3>${x.ds.slice(0, 3).map((d) => `<p style="margin-top:8px"><a href="#/direction/${d.id}"><b>${esc(d.name)}</b></a>：${esc(d.findings)}</p>`).join('')}<p class="hint mt">其余方向见 <a href="#/directions">研究方向页</a></p></div>`).join('')}
        </section>
        <section><h2>3 研究亮点</h2>
          <ol>${REPORT.highlights.map((h) => `<li><b>${esc(h.t)}</b>：${esc(h.b)} ${h.refs.map((r) => `<a class="mono" href="#/paper/${paperByRef[r].id}">${paperByRef[r].id}</a>`).join(' ')}</li>`).join('')}</ol></section>
        <section><h2>4 重点论文</h2><div class="card">${REPORT.key.map((r) => paperLi(paperByRef[r])).join('')}</div></section>
        <section><h2>5 方法与数据趋势</h2>
          <ul><li>市场模拟的参与者规模扩展到上万个，并由真实新闻、政策文件和财报驱动。</li><li>因子挖掘开始把因子表示为代码，由大模型进化搜索迭代改进。</li><li>评测从静态问答转向实时、防数据泄露，以及运行成本与收益诊断。</li></ul></section>
        <section><h2>6 局限与可探索问题</h2>
          <p class="note-box">以下为系统根据各方向“局限”汇总的建议，需要研究者论证。</p>
          <ul>${['D06', 'D02', 'D13'].map((id) => `<li><b>${esc(dirById[id].name)}</b>：${esc(dirById[id].limits)}</li>`).join('')}</ul></section>
        <section><h2>7 建议阅读顺序 <span class="chip gold">系统建议</span></h2>
          <ol>${REPORT.order.map((o) => `<li><a href="#/paper/${paperByRef[o.ref].id}">${esc(paperByRef[o.ref].title)}</a>（${paperByRef[o.ref].year}）：${esc(o.why)}</li>`).join('')}</ol></section>
        <section><h2>8 附录</h2><p>全部纳入文献见 <a href="#/library">文献库</a>；统计口径见 <a href="#/method">收集规范与流程</a>。审核人：待指定。</p></section>
      </div>`;
    document.getElementById('dl').addEventListener('click', () => {
      const blob = new Blob([reportMarkdown()], { type: 'text/markdown;charset=utf-8' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'monthly-report-2026-11.md'; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  let reviewTab = 'doi';
  function review() {
    const noDoi = D.papers.filter((p) => !p.doi);
    const etal = D.papers.filter((p) => p.authors.includes('et al.'));
    const tabs = [
      { id: 'doi', name: '待补 DOI', c: noDoi.length },
      { id: 'author', name: '作者待补全', c: etal.length },
      { id: 'boundary', name: '边界情形复核', c: 245 },
      { id: 'dispute', name: '归类分歧', c: 18 },
      { id: 'report', name: '月报待审', c: 1 },
    ];
    let body = '';
    if (reviewTab === 'doi' || reviewTab === 'author') {
      const list = reviewTab === 'doi' ? noDoi : etal;
      body = `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>paper_id</th><th>文献</th><th>问题</th><th>操作</th></tr></thead><tbody>${list.map((p) => `<tr><td class="mono">${p.id}</td><td><a class="t" href="#/paper/${p.id}">${esc(p.title)}</a><div class="meta">${esc(p.venueShort)} · ${p.year}</div></td><td>${reviewTab === 'doi' ? '仅有落地页链接，缺 DOI' : '作者列表以 et al. 截断'}</td><td><span class="chip warn">待处理</span></td></tr>`).join('')}</tbody></table></div>`;
    } else if (reviewTab === 'boundary') {
      body = `<p>第一轮判读 726 篇候选后，针对以下边界情形细化规则，对把握不足的 245 篇独立复核。</p><div class="grid g4 mt">${['谈判', '契约理论', '电商', '数字资产'].map((x) => `<div class="card"><h3>${x}</h3><span class="chip good">已复核</span></div>`).join('')}</div><p class="note-box mt">结果：严格纳入 166 篇，方法参考 41 篇，背景文献 11 篇，排除 508 篇。</p>`;
    } else if (reviewTab === 'dispute') {
      body = `<p>两轮独立归类：二级方向一致率 ${D.agreement.level2}%，一级 ${D.agreement.level1}%，kappa ${D.agreement.kappa}。18 篇分歧集中在以下方向对，已按判别规则逐篇确定。</p>
        <div class="tbl-wrap mt"><table class="tbl"><thead><tr><th>方向对</th><th>裁定依据</th><th>状态</th></tr></thead><tbody>
        <tr><td>金融分析、投研 ↔ 业务运营与流程自动化</td><td>以研究分析产出为主归前者，以业务流程执行为主归后者</td><td><span class="chip good">已裁定</span></td></tr>
        <tr><td>行为实验与被试替代 ↔ AI 的经济理性与偏好</td><td>以人类数据为对照、替代被试归前者；只评价 AI 本身归后者</td><td><span class="chip good">已裁定</span></td></tr>
        <tr><td>智能体与机制设计 ↔ 政策评估与冲击分析</td><td>设计规则与激励归前者；在模拟经济中评估政策效果归后者</td><td><span class="chip good">已裁定</span></td></tr>
        </tbody></table></div>`;
    } else {
      body = `<div class="card"><div class="card-head"><h3>智能体与经济金融交叉研究月报 · 2026 年 11 月</h3><span class="chip gold">待审核</span></div><p>生成时间 2026-11-06 · 版本 v0.1 · 审核人待指定</p><p class="mt"><a class="btn" href="#/report">打开月报</a></p></div>`;
    }
    app.innerHTML = `
      ${head('审核台', '审核台', '集中处理书目核验、边界判读、归类分歧和月报审核；每次修改保存修改人、时间和理由。')}
      <div class="tabs">${tabs.map((t) => `<button type="button" data-t="${t.id}" class="${t.id === reviewTab ? 'on' : ''}">${t.name}<span class="c">${t.c}</span></button>`).join('')}</div>
      <div class="card">${body}</div>`;
    app.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => { reviewTab = b.dataset.t; review(); }));
  }

  function sources() {
    const count = (names) => D.papers.filter((p) => names.includes(p.venueShort)).length;
    const S = [
      ['计算机会议', 'ICML', '已逐年检索', '2015–2026', count(['ICML'])],
      ['计算机会议', 'ACL', '已逐年检索', '2015–2026', count(['ACL'])],
      ['计算机会议', 'EMNLP', '已逐年检索', '2015–2026', count(['EMNLP'])],
      ['计算机会议', 'NAACL', '已逐年检索', '2015–2026', 0],
      ['计算机会议', 'NeurIPS', '补充检索', '按方向', count(['NeurIPS'])],
      ['计算机会议', 'ICLR', '补充检索', '按方向', count(['ICLR'])],
      ['计算机会议', 'AAMAS', '前期积累', '按方向', count(['AAMAS'])],
      ['计算机会议', 'ACM EC', '前期积累', '按方向', count(['ACM EC'])],
      ['计算机会议', 'AAAI、IJCAI、CHI、CSCW', '待逐年检索', '—', count(['AAAI'])],
      ['计算机会议', 'KDD、WWW（名单外）', '补充检索', '按方向', count(['KDD', 'WWW'])],
      ['综合性期刊', 'Science、Nature、PNAS、Science Advances', '补充检索', '按方向', count(['Nature', 'PNAS', 'Science Advances'])],
      ['综合性期刊', 'Nature 子刊（NMI、NHB、NC）', '待逐年检索', '—', 0],
      ['经济学期刊', '经济学五大期刊、JEL', '前期积累', '按方向', count(['AER', 'JEL'])],
      ['经济学期刊', 'JEDC、JEBO', '前期积累', '按方向', count(['JEDC', 'JEBO'])],
      ['金融学期刊', '金融学四大期刊、Review of Finance', '补充检索', '按方向', count(['JFE'])],
      ['金融学期刊', 'JBF、JFM、JFS', '补充检索', '按方向', count(['JBF', 'JFS'])],
      ['管理学期刊', 'Management Science', '补充检索', '按方向', count(['Management Science'])],
    ];
    const cls = { '已逐年检索': 'good', '前期积累': 'teal', '补充检索': 'gold', '待逐年检索': '' };
    const done = S.filter((s) => s[2] === '已逐年检索').length;
    app.innerHTML = `
      ${head('来源管理', '来源注册表与检索进度', '每个来源记录检索状态、覆盖范围和已收录文献；关闭来源只停止后续采集，不删除历史。未知标识符留空待核验，禁止猜填。')}
      <div class="grid g4">
        <div class="card kpi"><div class="v">${done}</div><div class="l">已完成逐年检索的会议</div><div class="d">62,883 篇论文全量判读</div></div>
        <div class="card kpi"><div class="v">205</div><div class="l">前期积累（去重后）</div><div class="d">去除与逐年检索重复 33 条</div></div>
        <div class="card kpi"><div class="v">27</div><div class="l">补充检索补入</div><div class="d">书目逐条核对 Crossref</div></div>
        <div class="card kpi"><div class="v">${S.filter((s) => s[2] === '待逐年检索').length}</div><div class="l">待逐年检索的来源组</div><div class="d">下一步工作重点</div></div>
      </div>
      <div class="card mt"><div class="card-head"><h3>来源清单</h3><div class="legend"><span><span class="chip good">已逐年检索</span></span><span><span class="chip teal">前期积累</span></span><span><span class="chip gold">补充检索</span></span><span><span class="chip">待逐年检索</span></span></div></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>类别</th><th>来源</th><th>检索状态</th><th>覆盖</th><th>本站代表文献</th></tr></thead><tbody>
      ${S.map((s) => `<tr><td class="meta">${s[0]}</td><td class="t">${esc(s[1])}</td><td><span class="chip ${cls[s[2]]}">${s[2]}</span></td><td>${s[3]}</td><td>${s[4]}</td></tr>`).join('')}
      </tbody></table></div></div>`;
  }

  function method() {
    app.innerHTML = `
      ${head('收集规范与流程', '文献收集规范与平台流程', '检索以 agent、agents、agentic、multi-agent、multiagent、agent-based 等词出现在题名或摘要中为前提，再逐篇判断是否研究经济金融问题。')}
      <h2>平台三阶段流程</h2>
      <div class="pipeline mt">
        <div class="card"><div class="eyebrow">阶段 ①</div><h3>获取并核验文献信息</h3><p>采集 API 获取元数据，去重并核验标题、作者、DOI，生成稳定 paper_id。</p></div><div class="arrow">→</div>
        <div class="card" style="border-top-color:var(--accent)"><div class="eyebrow">阶段 ②</div><h3>下载并核验 PDF</h3><p>按选定清单获取合法全文，核验文件与论文身份。</p></div><div class="arrow">→</div>
        <div class="card" style="border-top-color:var(--ink)"><div class="eyebrow">阶段 ③</div><h3>解析与深度分析</h3><p>解析或 OCR 后由本地 AI 生成结构化阅读记录，人工审核。</p></div>
      </div>
      <div class="card mt"><h3>收录类型与判定标准</h3>
        <div class="tbl-wrap"><table class="tbl"><thead><tr><th>收录类型</th><th>判定标准</th><th>逐年检索</th><th>前期积累</th><th>补充检索</th><th>合计</th></tr></thead><tbody>
        ${D.inclusion.map((r) => `<tr><td>${incChip(r.type)}</td><td>${esc(r.rule)}</td><td>${r.a}</td><td>${r.b}</td><td>${r.c}</td><td><b>${r.a + r.b + r.c}</b></td></tr>`).join('')}
        </tbody></table></div>
        <p class="hint mt">经济学论文中的 agent 常指一般经济主体，计算机论文中的 agent 常指能自主决策、学习或调用工具的系统，文献库分别标注。</p>
      </div>
      <div class="grid g3 mt">
        <div class="card"><div class="eyebrow">第一部分</div><h3>四会议逐年检索</h3><p>ICML、ACL、EMNLP、NAACL 2015–2026 全部论文 62,883 篇，两轮判读，严格纳入 166 篇。</p></div>
        <div class="card"><div class="eyebrow">第二部分</div><h3>前期积累</h3><p>238 条文献统一书目与分类口径，去重 33 条后严格纳入 84 篇。</p></div>
        <div class="card"><div class="eyebrow">第三部分</div><h3>补充检索</h3><p>按方向补充代表研究 27 篇，严格纳入 7 篇；只用于补充代表研究，不参与年度统计。</p></div>
      </div>
      <div class="card mt"><h3>质量控制</h3>
        <div class="grid g3">
          <div class="kpi"><div class="v">${D.agreement.level2}%</div><div class="l">二级方向一致率</div></div>
          <div class="kpi"><div class="v">${D.agreement.level1}%</div><div class="l">一级方向一致率</div></div>
          <div class="kpi"><div class="v">${D.agreement.kappa}</div><div class="l">一致性系数 kappa</div></div>
        </div>
      </div>`;
  }

  // ---------- router ----------
  const routes = { overview, library, paper, directions, direction, opportunities, report, review, sources, method };
  function render() {
    const raw = location.hash.replace(/^#\/?/, '') || 'overview';
    const [path, qs] = raw.split('?');
    const [name, arg] = path.split('/');
    const fn = routes[name] || overview;
    const navKey = { paper: 'library', direction: 'directions' }[name] || name;
    document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.r === navKey));
    hideTip();
    if (name === 'library') fn(new URLSearchParams(qs || ''));
    else fn(arg);
    bindTips(app);
    document.getElementById('side').classList.remove('open');
  }
  window.addEventListener('hashchange', () => { render(); window.scrollTo(0, 0); });
  document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('side').classList.toggle('open'));
  document.getElementById('themeBtn').addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const dark = cur ? cur === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* ignore */ }
  });
  try { const t = localStorage.getItem('theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) { /* ignore */ }
  render();
})();
