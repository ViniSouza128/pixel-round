# Pixel Round — Math documents

Localized PDFs documenting the mathematical foundations of the project,
one file per locale supported by the app:

| Locale  | File                              |
|---------|-----------------------------------|
| en-US   | `Pixel_Round_Math_en-US.pdf`      |
| es-ES   | `Pixel_Round_Math_es-ES.pdf`      |
| pt-BR   | `Pixel_Round_Math_pt-BR.pdf`      |
| fr-FR   | `Pixel_Round_Math_fr-FR.pdf`      |
| de-DE   | `Pixel_Round_Math_de-DE.pdf`      |
| zh-CN   | `Pixel_Round_Math_zh-CN.pdf`      |
| ja-JP   | `Pixel_Round_Math_ja-JP.pdf`      |
| ru-RU   | `Pixel_Round_Math_ru-RU.pdf`      |
| ko-KR   | `Pixel_Round_Math_ko-KR.pdf`      |

Each PDF covers the same 17 sections in its respective language: coordinate
system and pixel grid, the implicit ellipse equation, the three 2D
rasterization algorithms (Euclidean, Bresenham, Threshold), rendering modes,
discrete-area computation, the ellipsoid equation and voxel volume, cutting
planes (including the 45° diagonal), thick-3D slice composition, the 3D
camera in spherical coordinates, auto-zoom via bounding sphere and FOV,
shading as Lambertian approximation, and the audio synthesis with the
12-tone equal temperament.

## Rebuilding

The PDFs are typeset with XeLaTeX. Requires a TeX distribution (e.g.\ MiKTeX)
with `unicode-math`, `polyglossia`, `xeCJK`, `tcolorbox`, `booktabs` and
`csquotes`. Non-Latin locales additionally require the system fonts
**Microsoft YaHei** (zh-CN), **Yu Gothic** (ja-JP), **Malgun Gothic**
(ko-KR) and **Cambria** (ru-RU).

```bash
cd docs_math
python build.py
```

The builder script is `build.py`; all translations live in `translations.py`
plus the two appended modules. Math content is shared across locales — only
the prose varies.
