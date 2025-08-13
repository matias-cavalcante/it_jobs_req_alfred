#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import json, os
from datetime import datetime

COUNTS_PATH = "tech_counts.json"
HISTORY_PATH = "history.json"

def load_json(path, default):
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return default

def save_json(path, obj):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=2)

def main():
    # 1) Read today's counts
    if not os.path.exists(COUNTS_PATH):
        print(f"[warn] {COUNTS_PATH} not found; run your collector first.")
        return
    counts = load_json(COUNTS_PATH, {})
    today = datetime.utcnow().strftime("%Y-%m-%d")

    # 2) Read existing history (or initialize)
    history = load_json(HISTORY_PATH, {"dates": [], "series": {}})

    dates = history["dates"]
    series = history["series"]  # dict: tech -> [counts aligned with dates]

    # 3) Ensure union of tech keys
    techs = set(series.keys()) | set(counts.keys())
    for t in techs:
        series.setdefault(t, [])
    # 4) If new date, append; if same date, overwrite last point
    if dates and dates[-1] == today:
        # overwrite today's values
        for t in techs:
            val = int(counts.get(t, 0))
            if series[t]:
                series[t][-1] = val
            else:
                series[t].append(val)
    else:
        # append a new day and pad any shorter series with zeros
        dates.append(today)
        max_len = len(dates)
        for t in techs:
            while len(series[t]) < max_len - 1:
                series[t].append(0)
            series[t].append(int(counts.get(t, 0)))

    # 5) (Optional) prune dead series that are all zeros
    # series = {k:v for k,v in series.items() if any(v)}

    save_json(HISTORY_PATH, {"dates": dates, "series": series})
    print(f"Updated {HISTORY_PATH} for {today}")

if __name__ == "__main__":
    main()
