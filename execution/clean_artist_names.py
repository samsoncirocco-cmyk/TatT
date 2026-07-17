#!/usr/bin/env python3
"""Clean junk artist names in data/master.json.

Deterministic, stdlib-only. Reads data/master.json and writes:
  - data/national-artists-clean.json  (same shape, compact JSON)
  - data/cleanup-report.json          (counts, dropped ids, normalization samples)

Policy (conservative — when unsure, KEEP unchanged):
  NORMALIZE recoverable names:
    - "More About Michelle" / "About Anna" / "Meet Sarah"      -> person name
    - "Jade Chen Guest Spot"                                    -> "Jade Chen"
    - "Matt's Page" / "jared's work" / "Check out Kris's ..."   -> person name
    - "M A R I E L   B A Y O N A" (spaced letters)              -> "Mariel Bayona"
    - "Heather Moss, Owner" / "Mallory Blalock (Owner)"         -> strip owner tag
  DROP pure junk (nav/UI text, section headers, marketing copy, dates,
  addresses, cart widgets, team/crew headers, shop-name-as-artist).
  DEDUPE exact duplicates after normalization: same (name, shopName, city,
  state) case-insensitively -> keep first, drop rest.
Shops/cities/styles are passed through untouched.
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IN_PATH = ROOT / "data" / "master.json"
OUT_PATH = ROOT / "data" / "national-artists-clean.json"
REPORT_PATH = ROOT / "data" / "cleanup-report.json"

# ---------------------------------------------------------------------------
# Exact-match junk (case-insensitive, compared after collapsing whitespace and
# stripping trailing ':', '!', '.'). Built from a frequency inventory of the
# actual dataset — every entry was observed in the data.
# ---------------------------------------------------------------------------
EXACT_JUNK = {
    # nav / page chrome
    "home", "contact", "contact us", "contact me", "contact directly", "about",
    "about me", "about us", "hours", "hours and location", "location", "info",
    "information", "services", "our services", "faqs", "faq", "links",
    "my links", "navigate", "next", "enter", "enter site", "button", "mail",
    "email", "email me", "envelope", "print", "like", "share this", "website",
    "find out more", "get in touch", "get a quote", "address", "current",
    "design", "travel", "dining", "events", "coming up", "here", "flash here",
    "book now", "read more", "learn more", "meet",
    # social widgets
    "social", "socials", "social media", "social media links",
    "social accounts", "stay social", "tiktok", "instragram", "instagram",
    "facebook", "lnk.bio", "collabs",
    # bio / work section headers
    "bio", "biography", "read bio", "my work", "works", "our work",
    "more examples of my work", "his latest works", "her latest works",
    "latest body art", "check out my", "check out my work", "see her work",
    "see his work", "portfolio", "gallery", "preferred styles",
    "style favorites", "slide title",
    # team / staff headers
    "our team", "the team", "team", "the crew", "our staff", "our talent",
    "artists", "artist", "artistas", "artisits", "a rtists",
    "slow ride a rtists", "piercers", "our piercers", "piercer", "piercing",
    "piercings", "apprentices", "guests", "owner", "owners", "staff", "crew",
    "resident inkslingers", "conozca nuestro equipo",
    # store / commerce widgets
    "shop categories", "body jewelry", "jewelry", "tooth gems",
    "permanent makeup", "brands we carry", "our nil deals", "pricing",
    "subscribe form", "subscribe now", "visit the shop", "shop", "merch",
    "aftercare", "gift cards",
    # events / promos / misc site copy
    "ink for icons", "free love day", "vendor markets", "galaxycon",
    "convention information", "current art show", "special guest",
    "guest spot", "guest spots", "conventions & guest spots",
    "studio policies", "studio updates", "guaranteed job offer", "our story",
    "the journal", "welcome", "welcome to", "our location", "fh colorado",
    "fh florida", "consult form", "download apps", "dermatology clinics",
    "skatepark", "special bula eclipse event", "tangled up in hue is home to",
    "now one location,",
    # location-menu entries observed 3+ times as "artist" names
    "duluth", "easthampton", "hudson", "boston", "northampton", "stillwater",
    "eau claire", "river falls", "charleston", "culpeper", "dayton",
    "jacksonville nc", "ft. drum", "falls laughlin",
}

# Whole-string regex junk (case-insensitive, fullmatch).
JUNK_PATTERNS = [
    # collective headers: anything ending in team/crew/staff/bunnies etc.
    r".+\b(team|crew|staff|bunnies|weirdos|family|apprentices|piercers)s?\s*!?",
    r"(meet|contact) (the|our|your)\b.*",
    # cart / subscribe / welcome / walk-ins copy
    r".*\b(added to your cart|your cart|subscribe|walk-?ins welcome)\b.*",
    r"welcome\b.*",
    r".*\bwe (carry|do not offer)\b.*",
    # contains a calendar year -> event / "serving since" copy
    r".*\b(19|20)\d{2}\b.*",
    # street addresses ("310 north 7th street ...", "3383 Telegraph RD. ...")
    r"\d+\s.*\b(street|avenue|ave|road|rd|blvd|boulevard|drive|lane|hwy|highway|suite|ste)\b\.?.*",
    # phone-number-led strings
    r"\(?\d{3}\)?[\s\-.]\d{3}[\s\-.]\d{4}\b.*",
    # month + day -> guest-spot / event / sale announcements
    r".*\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(st|nd|rd|th)?\b.*",
    # exclamatory marketing sentences (4+ words ending in !)
    r"(\S+\s+){3,}\S+\s*!",
    # spanish boilerplate ("Artista de Tatuajes Galardonado", ...)
    r".*\b(artista|maestr[ao])\b.*",
    # nav sentences pointing at work/galleries
    r"(check out|see)\b.*\b(works?)\b.*",
    r"here\s*\.?",
]
JUNK_RES = [re.compile(p, re.IGNORECASE) for p in JUNK_PATTERNS]

# Words that disqualify the remainder of a "Meet X" / "About X" match from
# being treated as a person name.
NON_NAME_FIRST_WORDS = {
    "the", "our", "us", "me", "my", "your", "a", "an", "this", "these",
    "all", "everyone",
}
# Tokens that may never appear anywhere inside a person-name candidate.
NON_NAME_ANY_WORDS = NON_NAME_FIRST_WORDS | {
    "meet", "about", "contact", "team", "staff", "crew", "owner", "shop",
}

# Tokens allowed inside a person name: letters plus common name punctuation,
# or a parenthetical (pronouns, nicknames).
NAME_TOKEN_RE = re.compile(r"^[“\"]?[A-Za-z][A-Za-z.'’\-]*[”\"]?$")
PAREN_TOKEN_RE = re.compile(r"^\([A-Za-z/.'’\- ]+\)$")

PREFIX_RE = re.compile(
    r"^(?:more\s+about|all\s+about|read\s+more\s+about|about|meet)[\s:]+(.+)$",
    re.IGNORECASE,
)
GUEST_SPOT_RE = re.compile(r"^(.+?)\s+guest\s+spots?$", re.IGNORECASE)
POSSESSIVE_RE = re.compile(
    r"^(?:check\s+out\s+|see\s+)?(.+?)['’][sS]?\s+(?:recent\s+)?"
    r"(?:page|work|works)(?:\s+here)?\.?$",
    re.IGNORECASE,
)
OWNER_SUFFIX_RE = re.compile(
    r"^(.*?[A-Za-z]),?\s*\(?\s*(?:owner|shop\s+owner|co-?owner)\s*\)?$",
    re.IGNORECASE,
)
SPACED_LETTERS_RE = re.compile(r"^(?:[A-Za-z] +)+[A-Za-z]$")

NBSP = " "


def squash(s):
    """Collapse whitespace (incl. NBSP) to single spaces and trim."""
    return re.sub(r"\s+", " ", s.replace(NBSP, " ")).strip()


def canon(s):
    """Whitespace-collapsed, punctuation-trimmed, lowercase form for matching."""
    return squash(s).strip(":!.… ").strip().lower()


def is_exact_junk(name):
    if canon(name) in EXACT_JUNK:
        return True
    # Spaced-out letters that collapse to a junk word: "A R T I S T S"
    raw = name.replace(NBSP, " ").strip()
    if SPACED_LETTERS_RE.match(squash(raw)):
        words = ["".join(w.split()) for w in re.split(r"\s{2,}", raw) if w.strip()]
        if canon(" ".join(words)) in EXACT_JUNK:
            return True
    return False


def is_pattern_junk(name):
    c = squash(name)
    return any(r.fullmatch(c) for r in JUNK_RES)


def looks_like_person_name(s):
    """True if s plausibly names a person/alias: 1-4 name-ish tokens."""
    s = squash(s).strip(":!.…").strip()
    if not s:
        return False
    tokens = s.split(" ")
    if not 1 <= len(tokens) <= 4:
        return False
    for t in tokens:
        if t.lower().strip(".'’") in NON_NAME_ANY_WORDS:
            return False
        if not (NAME_TOKEN_RE.match(t) or PAREN_TOKEN_RE.match(t)):
            return False
    if canon(s) in EXACT_JUNK:
        return False
    return True


def smart_title(s):
    """Title-case all-lower tokens and long all-upper tokens; keep short
    all-caps (initials like "BB", "G") and mixed case as-is."""
    out = []
    for t in s.split(" "):
        if not t or PAREN_TOKEN_RE.match(t):
            out.append(t)
        elif t.islower() or (t.isupper() and len(t) >= 4):
            out.append(t[:1].upper() + t[1:].lower())
        else:
            out.append(t)
    return " ".join(out)


def try_normalize(name):
    """Return (new_name, rule) if a recoverable-name rule applies, else None."""
    c = squash(name)

    # Spaced-out letters: word gaps are runs of 2+ spaces in the raw string.
    raw = name.replace(NBSP, " ").strip()
    if SPACED_LETTERS_RE.match(squash(raw)):
        words = ["".join(w.split()) for w in re.split(r"\s{2,}", raw) if w.strip()]
        collapsed = " ".join(words)
        if canon(collapsed) in EXACT_JUNK:
            return None  # e.g. "A R T I S T S" -> "artists": junk, drop path
        if looks_like_person_name(collapsed):
            return smart_title(collapsed), "spaced_letters"
        return None

    m = PREFIX_RE.match(c)
    if m and looks_like_person_name(m.group(1)):
        return smart_title(m.group(1).strip().strip(":!.…").strip()), "about_meet_prefix"

    m = GUEST_SPOT_RE.match(c)
    if m and looks_like_person_name(m.group(1)):
        return smart_title(m.group(1).strip()), "guest_spot_suffix"

    m = POSSESSIVE_RE.match(c)
    if m and looks_like_person_name(m.group(1)):
        return smart_title(m.group(1).strip()), "possessive_page_work"

    m = OWNER_SUFFIX_RE.match(c)
    if m and looks_like_person_name(m.group(1).rstrip(",")):
        return smart_title(m.group(1).strip().rstrip(",")), "owner_suffix"

    return None


def classify(artist):
    """Return ("keep"|"drop", final_name, rule_or_reason)."""
    name = artist.get("name")
    if not isinstance(name, str) or not name.strip():
        return "drop", None, "empty_name"

    shop = artist.get("shopName")
    if isinstance(shop, str) and shop.strip() and canon(name) == canon(shop):
        return "drop", None, "name_equals_shop"

    norm = try_normalize(name)
    if norm:
        new_name, rule = norm
        return "keep", new_name, rule

    if is_exact_junk(name):
        return "drop", None, "exact_junk"
    if is_pattern_junk(name):
        return "drop", None, "pattern_junk"

    # A "Meet/About <something>" that is not a person name is nav text.
    m = PREFIX_RE.match(squash(name))
    if m and not looks_like_person_name(m.group(1)):
        return "drop", None, "about_meet_nonname"

    return "keep", name, None


def main():
    data = json.loads(IN_PATH.read_text())
    artists = data["artists"]

    kept = []
    dropped_junk = []       # (id, name, reason)
    normalized = []         # (id, old, new, rule)

    for a in artists:
        action, final_name, rule = classify(a)
        if action == "drop":
            dropped_junk.append((a.get("id"), a.get("name"), rule))
            continue
        if rule is not None and final_name != a.get("name"):
            normalized.append((a.get("id"), a.get("name"), final_name, rule))
            a = dict(a)
            a["name"] = final_name
        kept.append(a)

    # Dedupe: same normalized name + shopName + city + state -> keep first.
    seen = {}
    deduped = []
    dropped_dupes = []      # (id, name, kept_id)
    for a in kept:
        key = (
            canon(a.get("name") or ""),
            canon(a.get("shopName") or ""),
            canon(a.get("city") or ""),
            canon(a.get("state") or ""),
        )
        if key in seen:
            dropped_dupes.append((a.get("id"), a.get("name"), seen[key]))
        else:
            seen[key] = a.get("id")
            deduped.append(a)

    out = {
        "artists": deduped,
        "cities": data["cities"],
        "styles": data["styles"],
        "shops": data["shops"],
    }
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")))

    # Report: samples of each normalization rule + drop reason.
    norm_samples = {}
    for aid, old, new, rule in normalized:
        norm_samples.setdefault(rule, [])
        if len(norm_samples[rule]) < 15:
            norm_samples[rule].append({"id": aid, "from": old, "to": new})
    drop_samples = {}
    for aid, nm, reason in dropped_junk:
        drop_samples.setdefault(reason, [])
        if len(drop_samples[reason]) < 15:
            drop_samples[reason].append({"id": aid, "name": nm})

    report = {
        "input_artists": len(artists),
        "counts": {
            "kept": len(deduped),
            "normalized": len(normalized),
            "dropped_junk": len(dropped_junk),
            "dropped_duplicates": len(dropped_dupes),
            "dropped_total": len(dropped_junk) + len(dropped_dupes),
        },
        "dropped_junk_ids": [aid for aid, _, _ in dropped_junk],
        "dropped_duplicate_ids": [aid for aid, _, _ in dropped_dupes],
        "normalization_samples": norm_samples,
        "drop_samples": drop_samples,
        "normalizations": [
            {"id": aid, "from": old, "to": new, "rule": rule}
            for aid, old, new, rule in normalized
        ],
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2))

    print(f"input: {len(artists)}")
    print(f"kept: {len(deduped)}  (normalized: {len(normalized)})")
    print(f"dropped junk: {len(dropped_junk)}  dropped dupes: {len(dropped_dupes)}")
    print(f"wrote {OUT_PATH}")
    print(f"wrote {REPORT_PATH}")


if __name__ == "__main__":
    main()
