"""過去問などのスキャンPDFを、読むためのページ画像にする（作業用。出力先はリポジトリの外にする）。

  python scripts/pdf-pages.py <PDF> <出力フォルダ> --sheets
      20ページずつの一覧画像（sheet01.png…）を作る。年度や大問の位置を探す用
  python scripts/pdf-pages.py <PDF> <出力フォルダ> --pages 142-150 [--rotate 180] [--dpi 170]
      指定ページを上下半分ずつ高解像度で書き出す（p142_0.png = 142ページの上半分）
      スキャンが上下さかさまのページは --rotate 180

必要なもの: pip install pymupdf
"""
import argparse
import os
import sys

import pymupdf

sys.stdout.reconfigure(encoding="utf-8")


def sheets(doc, out):
    w, h = doc[0].rect.width * 0.5, doc[0].rect.height * 0.5
    for k in range(0, len(doc), 20):
        sheet = pymupdf.open()
        page = sheet.new_page(width=w * 5, height=h * 4)
        for j in range(min(20, len(doc) - k)):
            r = pymupdf.Rect((j % 5) * w, (j // 5) * h, (j % 5 + 1) * w, (j // 5 + 1) * h)
            page.show_pdf_page(r, doc, k + j)
        path = os.path.join(out, f"sheet{k // 20 + 1:02d}.png")
        page.get_pixmap(dpi=72).save(path)
        print(f"{path}  (p{k + 1}-{min(k + 20, len(doc))})")


def pages(doc, out, first, last, rotate, dpi):
    tmp = pymupdf.open()
    for n in range(first, last + 1):
        r = doc[n - 1].rect
        page = tmp.new_page(width=r.width, height=r.height)
        page.show_pdf_page(page.rect, doc, n - 1, rotate=rotate)
        for k, (y0, y1) in enumerate([(0, 0.52), (0.48, 1)]):
            clip = pymupdf.Rect(0, r.height * y0, r.width, r.height * y1)
            page.get_pixmap(dpi=dpi, clip=clip).save(os.path.join(out, f"p{n}_{k}.png"))
    print(f"p{first}-p{last} を {out} に書き出しました")


ap = argparse.ArgumentParser()
ap.add_argument("pdf")
ap.add_argument("out")
ap.add_argument("--sheets", action="store_true")
ap.add_argument("--pages")
ap.add_argument("--rotate", type=int, default=0)
ap.add_argument("--dpi", type=int, default=170)
a = ap.parse_args()

os.makedirs(a.out, exist_ok=True)
doc = pymupdf.open(a.pdf)
print(f"{len(doc)}ページ")
if a.sheets:
    sheets(doc, a.out)
if a.pages:
    first, _, last = a.pages.partition("-")
    pages(doc, a.out, int(first), int(last or first), a.rotate, a.dpi)
