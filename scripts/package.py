"""Build an installable archive from production files only."""
from pathlib import Path
import re
import sys
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
version = re.search(r'\* Version: (.+)', (root / 'uplink-content-explorer-for-bricks.php').read_text()).group(1).strip()
output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root.parent / f'uplink-content-explorer-for-bricks-{version}.zip'
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if not path.is_file() or relative.parts[0] in {'.git', '.github', 'scripts', 'tests', 'docs'}:
            continue
        if relative.parts[0].startswith('.') or path.suffix == '.zip' or str(relative) in {'AGENTS.md', 'README.md', 'notes.md'}:
            continue
        archive.write(path, Path('uplink-content-explorer-for-bricks') / relative)
print(output)
