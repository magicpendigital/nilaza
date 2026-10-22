"""Package the reviewed editable launch files; does not publish or include credentials."""
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
base=root/'design/launch/open-reflection-v1'
files=[base/name for name in ['README.md','manifest.json','index.html','review/documents/render-results.json']]
for folder in ['exports','source','review']:
    files += [p for p in (base/folder).rglob('*') if p.is_file() and 'archive' not in p.parts and 'documents' not in p.parts and 'slides' not in p.parts]
archive=base/'Nilaza-Open-Reflection-v1-preview.zip'
with ZipFile(archive,'w',ZIP_DEFLATED) as bundle:
    for file in sorted(set(files)):bundle.write(file,file.relative_to(base))
with ZipFile(archive) as bundle:
    assert bundle.testzip() is None
print(f'Prepared {len(set(files))} files, {archive.stat().st_size/1024/1024:.1f} MB. Not published.')
