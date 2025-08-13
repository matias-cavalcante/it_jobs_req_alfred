#!/usr/bin/env python3 
# -*- coding: utf-8 -*-

import time
import html
import re
import requests
from collections import Counter
import json, os

from datetime import date


LIST_URL   = "https://userapi.alfred.is/api/v1/front-web/jobs"
DETAIL_URL = "https://userapi.alfred.is/api/v1/front-web/jobs"
HEADERS    = {"User-Agent": "alfred-parser/1.0 (polite)"}

PAGE_SLEEP   = 0.13
DETAIL_SLEEP = 0.06

# ------------------------------
# 1) Controlled tech vocabulary
#    (label -> list of variants)
#    Keep it small and explicit.
# ------------------------------
TECH_TERMS = {
    # Web / JS
    "React":        ["react", "reactjs", "react.js"],
    "Next.js":      ["nextjs", "next.js"],
    "Vue.js":       ["vue", "vuejs", "vue.js"],
    "Angular":      ["angular"],
    "JavaScript":   ["javascript", "js"],     # keep 'js' but boundary-protected
    "TypeScript":   ["typescript", "type script"],

    # Back-end / languages
    "Node.js":      ["node", "nodejs", "node.js"],
    "Python":       ["python"],
    "Django":       ["django"],
    "Flask":        ["flask"],
    "FastAPI":      ["fastapi"],
    ".NET":         [".net", "dotnet"],       # split from C#
    "C#":           ["c#"],                   # separate label now
    "Java":         ["java"],
    "PHP":          ["php"],
    "Ruby":         ["ruby"],
    # Unify under one label: match 'Golang' (case-insensitive) or exact 'Go' (case-sensitive)
    "Go":           ["golang", "Go"],
    "C++":          ["c++", "cpp"],

    # Databases
    "PostgreSQL":   ["postgres", "postgresql"],
    "MySQL":        ["mysql"],
    "SQL":          ["sql"],
    "MongoDB":      ["mongodb"],
    "Redis":        ["redis"],
    "SQLite":       ["sqlite"],

    # DevOps / Cloud / OS
    "Docker":       ["docker"],
    "Kubernetes":   ["kubernetes", "k8s"],
    "AWS":          ["aws"],
    "Azure":        ["azure"],
    "GCP":          ["gcp"],
    "Linux":        ["linux"],
    "Windows":      ["windows"],
    "macOS":        ["macos", "mac os"],
    "Bash/Shell":   ["bash", "shell"],
    "CI/CD":        ["ci/cd", "cicd", "continuous integration", "continuous deployment"],
    "DevOps":       ["devops", "dev-ops"],
    "QA / Testing": ["qa", "testing", "test automation"],
    "Ubuntu":       ["ubuntu"],

    # Web basics / tools
    "HTML":         ["html"],
    "CSS":          ["css"],
    "Sass/SCSS":    ["sass", "scss"],
    "Git":          ["git"],
    "Tailwind CSS": ["tailwind", "tailwindcss"],
    "GitHub":       ["github"],

    # Design
    "Figma":              ["figma"],
    "Adobe Photoshop":    ["photoshop"],
    "Adobe Illustrator":  ["illustrator"],

    # Networking
    "Cisco":        ["cisco"],

    # Other common terms
    "Salesforce":        ["salesforce"],
    "Microsoft 365":     ["microsoft 365", "office 365", "microsoft365"],
    "Power BI":          ["power bi", "powerbi"],
    "Fortinet":          ["fortinet"],
    "Active Directory":  ["active directory", "ad"],
}

# Suppress child techs when a parent is also found — per job only
IMPLIES_DROP = {
    "Tailwind CSS": {"CSS"},       # Tailwind implies CSS, don't also list bare CSS
    "React": {"JavaScript"},       # React implies JS, don't also list JavaScript
    # NOTE: per your preference, we do NOT drop SQL when specific DBs appear
}

# For variants that must be case-sensitive (e.g., exact "Go")
CASE_SENSITIVE_VARIANTS = {("Go", "Go")}  # (label, variant)

# Build boundary-aware regexes and flatten to a single list ordered by longest variant first.
VARIANTS = []  # list of (label, regex, length)
for label, variants in TECH_TERMS.items():
    for v in variants:
        pattern = r"(?<![A-Za-z0-9])" + re.escape(v) + r"(?![A-Za-z0-9])"
        flags = 0 if (label, v) in CASE_SENSITIVE_VARIANTS else re.I
        rx = re.compile(pattern, flags)
        VARIANTS.append((label, rx, len(v)))

# Longest-match-first helps avoid SQL matching inside PostgreSQL, etc.
VARIANTS.sort(key=lambda t: t[2], reverse=True)


# ------------------------------
# 2) Very small HTTP helpers
# ------------------------------
def get_json(url, params=None, timeout=20):
    r = requests.get(url, params=params, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return r.json()


def list_all_slugs():
    slugs = []
    seen  = set()
    page  = 1
    while True:
        data = get_json(LIST_URL, params={"page": page})
        jobs = data.get("jobs", [])
        if not jobs:
            break
        for j in jobs:
            s = j.get("slug")
            if s and s not in seen:
                seen.add(s)
                slugs.append(s)
        page += 1
        time.sleep(PAGE_SLEEP)
    return slugs


def fetch_job_detail(slug):
    data = get_json(DETAIL_URL, params={
        "slug": slug,
        "mergetobody": "false",
        "translate": "false",
    })
    time.sleep(DETAIL_SLEEP)
    return data.get("job") or {}


# ------------------------------
# 3) Simple HTML → text
#    + prevent token gluing
# ------------------------------
def strip_html(s):
    if not s:
        return ""
    s = html.unescape(s)
    # Remove tags
    s = re.sub(r"<[^>]+>", " ", s)
    # Insert spaces around common joiners to avoid "C++PostgreSQL"
    s = re.sub(r"[,\;/]", " ", s)          # commas, semicolons, slashes -> spaces
    s = re.sub(r"[-–—]", " ", s)           # dashes -> spaces
    # Collapse whitespace
    s = re.sub(r"\s+", " ", s).strip()
    return s


# ------------------------------
# 4) Build high-signal text
#    (title + description + custom sections)
#    Ignore address / benefits.
# ------------------------------
def build_text(job):
    parts = []

    title = job.get("title") or ""
    parts.append(title)

    body = job.get("bodyhtml") or job.get("description") or ""
    parts.append(body)

    for sec in job.get("customSections") or []:
        label = (sec.get("label") or "").lower()
        title = (sec.get("title") or "").lower()
        if any(k in label for k in ["qualifications", "responsibilities"]) or \
           any(k in title for k in ["menntunar", "hæfni", "verkefni"]):
            parts.append(sec.get("content") or "")

    for q in job.get("jobQualifications") or []:
        if isinstance(q, dict):
            parts.append(q.get("description") or "")
        else:
            parts.append(str(q))

    text = " \n ".join(p for p in parts if p)
    return strip_html(text).lower()


# ------------------------------
# 5) Find tech terms in text
#    (once per job per label)
#    Longest-match-first + implications.
# ------------------------------
def apply_implications(labels):
    """Drop child labels if a parent is present (per IMPLIES_DROP)."""
    present = set(labels)
    for parent, children in IMPLIES_DROP.items():
        if parent in present:
            present -= children
    # Preserve original order from 'labels'
    return [lbl for lbl in labels if lbl in present]


def find_tech(text):
    found = []
    seen  = set()
    for label, rx, _length in VARIANTS:
        if label in seen:
            continue
        if rx.search(text):
            seen.add(label)
            found.append(label)
    # Apply implication suppression (per job)
    found = apply_implications(found)
    return found


# ------------------------------
# 6) Optional: keep to IT jobs
#    (filter by category slug/name)
# ------------------------------
def is_it_job(job):
    cats = job.get("categories") or []
    if not cats:
        return False
    for c in cats:
        name = (c.get("name") or "").lower()
        slug = (c.get("slug") or "").lower()
        if "upplysingataekni" in slug or "upplýsingatækni" in name or "information technology" in name:
            return True
    return False


# ------------------------------
# 7) Main
# ------------------------------
def main():
    print("Fetching slugs…")
    slugs = list_all_slugs()
    print(f"Total slugs: {len(slugs)}\n")

    tech_counter = Counter()
    printed_jobs = 0

    for i, slug in enumerate(slugs, 1):
        try:
            job = fetch_job_detail(slug)
        except Exception as e:
            print(f"[warn] {slug}: {e}")
            continue

        # keep only IT jobs
        if not is_it_job(job):
            continue

        text = build_text(job)
        hits = find_tech(text)

        if hits:
            company = (job.get("brand") or {}).get("name") or "—"
            title   = job.get("title") or "—"
            print(f"- {company} — {title}")
            print(f"  Tech: {', '.join(hits)}\n")
            printed_jobs += 1
            for h in hits:
                tech_counter[h] += 1

    print("\nSummary:")
    print(f"Printed IT jobs with at least one tech hit: {printed_jobs}")

    if not tech_counter:
        print("No technology terms found.")
        return

    print("\nMost common technologies:")
    width = max(len(k) for k in tech_counter)
    for label, count in tech_counter.most_common():
        print(f"{label:<{width}}  {count}")

    #Update for history.json takes place here

    today_str = str(date.today())  # e.g., "2025-08-13"
    history_path = "history.json"

    # Load existing history if present
    if os.path.exists(history_path):
        with open(history_path, "r", encoding="utf-8") as f:
            history = json.load(f)
    else:
        history = {"dates": [], "series": {}}

    # If today's date already exists, skip writing (or overwrite if you prefer)
    if today_str in history["dates"]:
        print("Today’s data already recorded. Skipping update.")
    else:
        history["dates"].append(today_str)
    for label in tech_counter:
            if label not in history["series"]:
                history["series"][label] = []
            history["series"][label].append(tech_counter[label])
    # Fill other techs with 0 for today if they had no hits today
    for label in history["series"]:
        if len(history["series"][label]) < len(history["dates"]):
            history["series"][label].append(0)

    # Save updated history
    with open(history_path, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)
    print(f"\nSaved updated history to: {os.path.abspath(history_path)}")

if __name__ == "__main__":
    main()
