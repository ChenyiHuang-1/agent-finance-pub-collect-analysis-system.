"""Build site/data.js from the demo literature report (converted to Markdown with pandoc).

Usage:
    pandoc report.docx -t markdown -o report.md
    python tools/build_data.py report.md docs/data.js
"""
import json
import re
import sys

src, out = sys.argv[1], sys.argv[2]
md = open(src, encoding="utf-8").read()

# ---------- references ----------
appendix = md.split("**附录　代表性文献**", 1)[1]
blocks = re.split(r"\n\s*\n", appendix.strip())
refs = {}
for b in blocks:
    b = " ".join(x.strip() for x in b.splitlines())
    m = re.match(r"\\\[(\d+)\\\]\s+(.*)", b)
    if not m:
        continue
    n = int(m.group(1))
    body = m.group(2)
    am = re.match(r"(.+?)\s+\((\d{4})\)\.\s+(.*)", body)
    authors, year, rest = am.group(1), int(am.group(2)), am.group(3)
    vm = re.search(r"\*(.+?)\*", rest)
    venue = vm.group(1).strip().rstrip(".") if vm else ""
    title = rest[: vm.start()].strip().rstrip(".") if vm else rest
    um = re.search(r"(https?://\S+)", rest)
    url = um.group(1).rstrip(".") if um else ""
    doi = ""
    dm = re.search(r"doi\.org/(\S+)", url)
    if dm:
        doi = dm.group(1)
    title = title.replace("\\\"", "\"").replace("\\", "")
    authors = authors.replace("\\", "")
    refs[n] = dict(ref=n, authors=authors, year=year, title=title, venue=venue.replace("\\", ""), url=url, doi=doi)


def venue_info(v):
    s = v.lower()
    table = [
        ("neural information processing", "NeurIPS"), ("machine learning (icml", "ICML"),
        ("learning representations", "ICLR"), ("aaai", "AAAI"), ("autonomous agents", "AAMAS"),
        ("economics and computation", "ACM EC"), ("web conference", "WWW"), ("sigkdd", "KDD"),
        ("ai in finance", "ICAIF"), ("acl 20", "ACL"), ("computational linguistics (volume", "ACL"),
        ("emnlp", "EMNLP"), ("empirical methods", "EMNLP"),
        ("journal of economic literature", "JEL"), ("journal of financial economics", "JFE"),
        ("economic dynamics and control", "JEDC"), ("economic behavior", "JEBO"),
        ("banking & finance", "JBF"), ("financial stability", "JFS"), ("management science", "Management Science"),
        ("american economic review", "AER"), ("science advances", "Science Advances"),
        ("national academy", "PNAS"), ("nature", "Nature"),
    ]
    short = next((name for key, name in table if key in s), v[:24])
    if short in ("JEL", "JEDC", "JEBO", "AER"):
        group = "经济学期刊"
    elif short in ("JFE", "JBF", "JFS"):
        group = "金融学期刊"
    elif short == "Management Science":
        group = "管理学期刊"
    elif short in ("Science Advances", "PNAS", "Nature"):
        group = "综合性期刊"
    else:
        group = "计算机会议"
    return short, group


# ---------- directions ----------
main = md.split("**四、各方向的研究进展**", 1)[1].split("**五、计算机新方法", 1)[0]
level1_names = {"（一）": "智能体模拟经济金融", "（二）": "智能体参与经济金融", "（三）": "智能体应用于经济金融"}
level1_ids = {"智能体模拟经济金融": "SIM", "智能体参与经济金融": "PAR", "智能体应用于经济金融": "APP"}
directions = []
cur_l1 = None
paper_dir = {}
paper_note = {}
parts = re.split(r"\n(?=\*\*(?:（[一二三]）|\d+\. ))", main)
for p in parts:
    h = re.match(r"\*\*(（[一二三]）)", p)
    if h:
        cur_l1 = level1_names[h.group(1)]
        continue
    h = re.match(r"\*\*(\d+)\. (.+?)（(\d+)篇）\*\*", p)
    if not h:
        continue
    num, name, count = int(h.group(1)), h.group(2), int(h.group(3))
    text = " ".join(p.split("\n"))

    def field(label):
        m = re.search(r"\*\*" + label + r"\*\*：(.+?)(?=\s*\*\*|$)", text)
        return m.group(1).strip() if m else ""

    reps = []
    rep_part = p.split("**代表研究**：", 1)[1].split("**已有发现**", 1)[0]
    for item in re.split(r"\n-\s+", "\n" + rep_part):
        item = " ".join(item.split())
        if not item:
            continue
        ns = [int(x) for x in re.findall(r"\\\[(\d+)\\\]", item)]
        clean = re.sub(r"\\\[\d+\\\]", "", item).replace("\\", "").strip()
        for n in ns:
            paper_dir.setdefault(n, num)
            paper_note.setdefault(n, clean)
        reps.extend(ns)
    lim = field("局限与可探索的问题")
    for n in re.findall(r"\\\[(\d+)\\\]", lim):
        paper_dir.setdefault(int(n), num)
    directions.append(dict(
        id=f"D{num:02d}", num=num, name=name, count=count, level1=cur_l1, level1Id=level1_ids[cur_l1],
        content=re.sub(r"\\\[\d+\\\]", "", field("研究内容")).replace("\\", ""),
        methods=field("主要方法").replace("\\", ""),
        findings=re.sub(r"\\\[\d+\\\]", "", field("已有发现")).replace("\\", ""),
        limits=re.sub(r"\\\[\d+\\\]", "", lim).replace("\\", ""),
        reps=reps,
    ))

# ---------- papers ----------
background = {1, 44, 53}
method_ref = {65}
papers = []
for n, r in sorted(refs.items()):
    short, group = venue_info(r["venue"])
    d = paper_dir.get(n)
    if n in (87,):
        d = 5
    if n in (88,):
        d = 8
    inc = "背景文献" if n in background else ("方法参考" if n in method_ref else "严格纳入")
    note = paper_note.get(n, "")
    papers.append(dict(
        id=f"AFL-{r['year']}-{n:04d}", **r, venueShort=short, venueGroup=group,
        dir=f"D{d:02d}" if d else None, inclusion=inc, note=note,
        pdf="未获取" if n % 3 else "已获取",
        reading="摘要级" if n % 3 else "全文待审",
    ))

# ---------- migration table ----------
mig_part = md.split("**表5　计算机新方法的迁移机会**", 1)[1].split("其中，风险传染方向", 1)[0]
migration = []
for line in mig_part.splitlines():
    cols = [c.strip() for c in re.split(r"\s{2,}", line.strip())]
    if len(cols) == 5 and not cols[0].startswith("**") and not cols[0].startswith("-"):
        clean = [re.sub(r"\\\[\d+\\\]", "", c).replace("\\", "") for c in cols]
        refs_in = [int(x) for x in re.findall(r"\\\[(\d+)\\\]", line)]
        migration.append(dict(method=clean[0], cs=clean[1], applied=clean[2], gap=clean[3], topic=clean[4], refs=refs_in))

data = dict(
    report=dict(title="智能体与经济金融交叉研究：文献分类与研究进展", date="2026-11-06", author="课题组（纯金融背景同学整理）"),
    funnel=[
        dict(label="四会议全部论文", value=62883), dict(label="含智能体相关词", value=5970),
        dict(label="结合经济金融词的候选", value=726), dict(label="全库严格纳入", value=257),
    ],
    inclusion=[
        dict(type="严格纳入", rule="研究经济或金融问题、市场、制度或经济机制，并以智能体为研究对象或建模单元", a=166, b=84, c=7),
        dict(type="方法参考", rule="研究带有经济结构的智能体方法，或明确指出经济金融应用场景，但尚未开展经济金融应用", a=41, b=44, c=2),
        dict(type="背景文献", rule="经济金融内容相关，但智能体只是一般经济主体或泛称，或属于行为证据类研究", a=11, b=32, c=18),
        dict(type="扩展阅读", rule="研究内容相关，但来源不在指定会议和期刊名单之内", a=0, b=43, c=0),
        dict(type="排除", rule="经济金融词汇只是偶然出现，或研究领域与经济金融无关", a=508, b=2, c=0),
    ],
    yearly=[dict(year=y, n=v) for y, v in zip(range(2015, 2027), [0, 1, 0, 1, 2, 6, 5, 4, 5, 15, 28, 99])],
    sources=[
        dict(name="计算机会议", n=214), dict(name="经济学期刊", n=31), dict(name="金融学期刊", n=6),
        dict(name="综合性期刊", n=4), dict(name="Management Science", n=2),
    ],
    methodsMix=[dict(name="大模型智能体", n=117), dict(name="一般经济主体", n=26), dict(name="多智能体强化学习", n=22)],
    agreement=dict(level2=92.7, level1=97.2, kappa=0.92, disputed=18, rechecked=245),
    directions=directions,
    papers=papers,
    migration=migration,
)
with open(out, "w", encoding="utf-8") as f:
    f.write("// 由 tools/build_data.py 从演示文献报告生成，请勿手工编辑\n")
    f.write("window.LIT_DATA = ")
    json.dump(data, f, ensure_ascii=False, indent=1)
    f.write(";\n")
print(len(papers), "papers;", len(directions), "directions;", len(migration), "migration rows;",
      sum(1 for p in papers if p["dir"]), "with direction")
