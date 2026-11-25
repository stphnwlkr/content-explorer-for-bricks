"""Keep the GitHub description identical to the WordPress.org description."""
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
source = (root / "readme.txt").read_text()
description = source.split("== Description ==\n\n", 1)[1].split("\n== Installation ==", 1)[0].rstrip()
readme = root / "README.md"
text = readme.read_text()
start = "<!-- wporg-description:start -->\n"
end = "\n<!-- wporg-description:end -->"
before, remainder = text.split(start, 1)
current, after = remainder.split(end, 1)
if "--check" in sys.argv:
    if current != description:
        raise SystemExit("GitHub and WordPress.org descriptions differ; run scripts/sync-readme.py")
    print("GitHub and WordPress.org descriptions match exactly.")
else:
    readme.write_text(before + start + description + end + after)
    print("GitHub description synchronized with readme.txt.")
