"""Render DOCX through the Documents skill and export slide PDFs with LibreOffice.

NILAZA_DOCUMENTS_SKILL, NILAZA_SOFFICE_DIR and NILAZA_POPPLER_DIR must point to
reviewed runtime tools. No application-wide installation or publication occurs.
"""
from pathlib import Path
import os,sys,subprocess,shutil,json,hashlib
from pypdf import PdfReader
from pdf2image import convert_from_path
root=Path(__file__).resolve().parents[1]
dest=root/'design/launch/open-reflection-v1'
out=dest/'exports'
review=dest/'review/documents';review.mkdir(parents=True,exist_ok=True)
required=['NILAZA_DOCUMENTS_SKILL','NILAZA_SOFFICE_DIR','NILAZA_POPPLER_DIR']
for key in required:
    if not os.environ.get(key):raise RuntimeError(f'Set {key}')
os.environ['PATH']=';'.join([os.environ['NILAZA_SOFFICE_DIR'],os.environ['NILAZA_POPPLER_DIR'],os.environ.get('PATH','')])
skill=Path(os.environ['NILAZA_DOCUMENTS_SKILL'])
records=[]
for name in ['nilaza-quick-start-vi','nilaza-quick-start-en','nilaza-user-guide-vi','nilaza-user-guide-en']:
    temp=root/f'.brand-work/render-docx/{name}'
    subprocess.run([sys.executable,str(skill/'render_docx.py'),str(out/f'{name}.docx'),'--output_dir',str(temp),'--emit_pdf'],check=True,env=os.environ)
    pdf=temp/f'{name}.pdf';reader=PdfReader(pdf)
    if 'quick' in name:assert len(reader.pages)==2,f'{name}: expected exactly 2 pages'
    fonts={str(f.get_object().get('/BaseFont')) for page in reader.pages for f in page['/Resources']['/Font'].values()}
    assert any('EBGaramond' in f for f in fonts),f'Missing heading font: {name}'
    assert any('HankenGrotesk' in f for f in fonts),f'Missing body font: {name}'
    assert all('Calibri' not in f for f in fonts),f'Unexpected theme fallback: {name}'
    shutil.copyfile(pdf,out/f'{name}.pdf')
    target=review/name;target.mkdir(exist_ok=True)
    for previous in target.glob('page-*.png'):previous.unlink()
    for number in range(1,len(reader.pages)+1):
        png=temp/f'page-{number}.png';shutil.copyfile(png,target/png.name)
    records.append(dict(file=f'exports/{name}.pdf',pages=len(reader.pages),fonts=sorted(fonts),renderer='LibreOffice via Documents render_docx.py'))
for locale in ['vi','en']:
    revision=os.environ.get('NILAZA_LAUNCH_REVISION','r4')
    name=f'nilaza-introduction-{locale}-{revision}'
    profile=(root/f'.brand-work/lo-pdf-{locale}').as_uri()
    temp=root/'.brand-work/slide-pdf';temp.mkdir(exist_ok=True)
    subprocess.run([str(Path(os.environ['NILAZA_SOFFICE_DIR'])/'soffice.exe'),f'-env:UserInstallation={profile}','--headless','--convert-to','pdf','--outdir',str(temp),str(out/f'{name}.pptx')],check=True,timeout=120)
    pdf=temp/f'{name}.pdf';reader=PdfReader(pdf);assert len(reader.pages)==8
    final=out/f'nilaza-introduction-{locale}.pdf';shutil.copyfile(pdf,final)
    target=review/f'slides-{locale}';target.mkdir(exist_ok=True)
    for previous in target.glob('slide*.png'):previous.unlink()
    convert_from_path(str(final),dpi=96,output_folder=str(target),fmt='png',output_file='slide',paths_only=True,poppler_path=os.environ['NILAZA_POPPLER_DIR'])
    records.append(dict(file=f'exports/{final.name}',pages=8,renderer='LibreOffice from finalized editable PPTX'))
brand=out/'nilaza-brand-guidelines.pdf';target=review/'brand-guidelines';target.mkdir(exist_ok=True)
for previous in target.glob('page*.png'):previous.unlink()
convert_from_path(str(brand),dpi=120,output_folder=str(target),fmt='png',output_file='page',paths_only=True,poppler_path=os.environ['NILAZA_POPPLER_DIR'])
records.append(dict(file='exports/nilaza-brand-guidelines.pdf',pages=len(PdfReader(brand).pages),renderer='ReportLab; Poppler preview'))
for record in records:record['sha256']=hashlib.sha256((dest/record['file']).read_bytes()).hexdigest()
(review/'render-results.json').write_text(json.dumps(records,indent=2)+'\n','utf-8')
print('Rendered all final DOCX/PDF/PPTX pages; visual inspection remains a separate gate.')
