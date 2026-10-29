#!/usr/bin/env python3
"""
按修复 diff 给这次修复分级：要不要起 Fable 做独立检查。

用法：python3 classify.py <fix.diff> [root-cause.md] [--round2]

分级只看「改动碰到了什么」，不看 issue 听上去难不难：
- CHECK：改了判断 / 实例状态 / 事件绑定，或落在核心与公开 API，或修法依赖 jsdom 验证不了的前提，或是第二轮修复
- CONFIRM：没有新增逻辑，但删掉了带条件的行，或 locale 里带了小函数——主会话逐条确认，确认不了就按 CHECK
- SKIP：只动文档 / 注释 / 样式 / 测试 / 翻译文案，或代码里只改了字符串字面量

脚本只给下限：主会话可以升级，不能自己降级。
"""
import json
import re
import sys
from collections import Counter

# 核心与公开 API：改到这里，影响面就是所有用户和所有插件
RISK_PATHS = [
    (r"^src/index\.ts$", "核心 src/index.ts"),
    (r"^src/utils/", "共享工具 src/utils"),
    (r"^src/types/", "选项默认值与类型 src/types"),
    (r"^src/typings\.d\.ts$", "公开类型声明"),
    (r"^(package\.json|package-lock\.json|build\.ts|config/|tsconfig[^/]*\.json$|\.github/)", "构建 / 依赖 / 发布配置"),
]
# 不影响运行时行为的文件
TEXT_FILE = re.compile(r"\.(md|styl|css)$|^__tests__/|^openspec/|^\.claude/|^LICENSE")
# locale 是翻译数据，但偶尔带 ordinal 这类小函数
LOCALE_FILE = re.compile(r"^src/l10n/")
# 每个 locale 文件都照抄的挂载模板，和新增 locale 时在 key 联合类型里登记的一行
LOCALE_BOILERPLATE = re.compile(
    r'^\s*(typeof window !== "undefined" && window\.flatpickr !== undefined'
    r"|\? window\.flatpickr|fp\.l10ns\.\w+ = \w+;)\s*$"
)
LOCALE_KEY = re.compile(r'^\s*\|\s*"[\w-]+"\s*$')
LOCALE_KEY_FILE = "src/types/locale.ts"
CODE_FILE = re.compile(r"\.(ts|js|mjs)$")
# 一行里出现这些，说明在做判断、改状态或挂副作用
LOGIC_TOKENS = [
    (r"\bif\s*\(", "if"),
    (r"\s\?\s", "三元"),
    (r"&&|\|\||\?\?", "逻辑运算"),
    (r"===|!==|==|!=|>=|<=|\s[<>]\s", "比较"),
    (r"\bswitch\s*\(|\bcase\s", "switch"),
    (r"\b(for|while)\s*\(", "循环"),
    (r"\b(self|fp|instance)\.[\w.]+\s*(=[^=]|\+\+|--|[-+]=)", "写实例状态"),
    (r"triggerEvent\(|\.(_bind|bind)\(|addEventListener|removeEventListener", "事件"),
    (r"setTimeout|setInterval|requestAnimationFrame|\bawait\b|\.then\(", "定时 / 异步"),
]
COMMENT = re.compile(r"^\s*(//|/\*|\*)")
IMPORT = re.compile(r"^\s*(import\s|export\s.*\sfrom\s)")
STRING_LITERAL = re.compile(r'"(?:[^"\\]|\\.)*"|\'(?:[^\'\\]|\\.)*\'|`(?:[^`\\]|\\.)*`')
# 根因陈述的「假设」段（到下一个「xx：」段落或文末为止）里提到这些，说明修法成立依赖 jsdom 验证不了的前提
ASSUMPTION_SECTION = re.compile(r"^\s*假设[^\n]*[:：]([\s\S]*?)(?=^\S[^\n]{0,12}[:：]|\Z)", re.M)
UNVERIFIED_WORDS = re.compile(r"浏览器|真机|移动端|布局|定位|jsdom|iOS|Android|Safari|Firefox|Chrome|Edge|IE", re.I)
# 「无」「不涉及浏览器差异」这类否定句不算
NEGATED = re.compile(r"(无|没有|不涉及|不依赖)[^，。；\n]*")


def parse(diff_text):
    files, current = {}, None
    for line in diff_text.splitlines():
        if line.startswith("+++ "):
            path = line[4:].strip().split("\t")[0]
            if path == "/dev/null":
                continue
            current = re.sub(r"^[ab]/", "", path)
            files.setdefault(current, {"added": [], "removed": []})
        elif line.startswith("--- "):
            # 删除整个文件时 +++ 是 /dev/null，用 --- 的路径记账
            path = re.sub(r"^[ab]/", "", line[4:].strip().split("\t")[0])
            current = path if path != "/dev/null" else None
            if current:
                files.setdefault(current, {"added": [], "removed": []})
        elif current is None:
            continue
        elif line.startswith("+"):
            files[current]["added"].append(line[1:])
        elif line.startswith("-"):
            files[current]["removed"].append(line[1:])
    return {path: change for path, change in files.items() if change["added"] or change["removed"]}


def logic_kinds(text):
    return [name for pattern, name in LOGIC_TOKENS if re.search(pattern, STRING_LITERAL.sub('""', text))]


def drop_literal_only_pairs(added, removed):
    """增删两侧抹掉字符串字面量后相同、且不带逻辑的行只是改文案，两侧都不再参与判断"""
    normalize = lambda text: STRING_LITERAL.sub('""', text).strip()
    common = Counter(normalize(t) for t in added if not logic_kinds(t)) & Counter(
        normalize(t) for t in removed if not logic_kinds(t)
    )

    def drop(lines):
        left, kept = common.copy(), []
        for text in lines:
            key = normalize(text)
            if left[key] > 0:
                left[key] -= 1
            else:
                kept.append(text)
        return kept

    return drop(added), drop(removed)


def logic_hits(lines):
    hits = []
    for text in lines:
        if not text.strip() or COMMENT.match(text) or IMPORT.match(text):
            continue
        kinds = logic_kinds(text)
        if kinds:
            hits.append({"line": text.strip()[:120], "kinds": kinds})
    return hits


def describe(path, hit, verb):
    return f"{path}：{verb} [{'、'.join(hit['kinds'])}] {hit['line']}"


def classify(diff_text, root_cause="", round2=False):
    files = parse(diff_text)
    check, confirm = [], []
    if round2:
        check.append("同一问题的第二轮修复")
    if any(UNVERIFIED_WORDS.search(NEGATED.sub("", section)) for section in ASSUMPTION_SECTION.findall(root_cause)):
        check.append("根因陈述依赖 jsdom 验证不了的前提（「假设」里提到浏览器 / 移动端 / 布局）")
    for path, change in files.items():
        if TEXT_FILE.search(path):
            continue
        if path == LOCALE_KEY_FILE and all(LOCALE_KEY.match(t) for t in change["added"] + change["removed"]):
            continue
        risky = next((label for pattern, label in RISK_PATHS if re.search(pattern, path)), None)
        if risky:
            check.append(f"{path}：落在{risky}")
            continue
        if not CODE_FILE.search(path):
            check.append(f"{path}：无法判断的文件类型")
            continue
        added, removed = drop_literal_only_pairs(change["added"], change["removed"])
        if LOCALE_FILE.search(path):
            added = [t for t in added if not LOCALE_BOILERPLATE.match(t)]
            confirm += [describe(path, hit, "locale 里的逻辑") for hit in logic_hits(added)]
            continue
        check += [describe(path, hit, "新增 / 改动逻辑") for hit in logic_hits(added)]
        confirm += [describe(path, hit, "删掉了带条件的行") for hit in logic_hits(removed)]
    if check:
        tier = "CHECK"
    elif confirm:
        tier = "CONFIRM"
    else:
        tier = "SKIP"
    return {"tier": tier, "files": list(files), "check_reasons": check, "confirm_items": confirm}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(2)
    diff_text = open(args[0], encoding="utf-8").read()
    root_cause = open(args[1], encoding="utf-8").read() if len(args) > 1 else ""
    if not parse(diff_text):
        # 空 diff 多半是取错了范围（改动已提交、路径写错），判 SKIP 会让检查被静默跳过
        print("diff 为空：确认 fix.diff 取的是这次修复的改动", file=sys.stderr)
        sys.exit(1)
    result = classify(diff_text, root_cause, "--round2" in sys.argv)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
