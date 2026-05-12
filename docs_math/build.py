# -*- coding: utf-8 -*-
"""Gerador multilingue dos PDFs "A Matemática do Projeto" do Pixel Round.

Compila um PDF por locale (en-US, es-ES, pt-BR, fr-FR, de-DE, zh-CN, ja-JP)
a partir de um único template XeLaTeX + tabela de traduções.

Uso:    python build.py
Saída:  Pixel_Round_Math_<locale>.pdf  (mesmo diretório)
"""
import os, re, shutil, subprocess, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
XELATEX = r"C:\Users\softk\AppData\Local\Programs\MiKTeX\miktex\bin\x64\xelatex.exe"

# ============================================================================
# TEMPLATE (chaves entre «...»)
# ============================================================================
TEX = r"""% !TEX program = xelatex
\documentclass[12pt,a4paper]{scrartcl}

«FONT_SETUP»

\usepackage{amsmath}
\usepackage{mathtools}

\usepackage[a4paper,top=2.8cm,bottom=2.8cm,left=2.6cm,right=2.6cm,
            headheight=16pt]{geometry}
\usepackage{microtype}
\usepackage{xcolor}
\usepackage{booktabs}
\usepackage{array}
\usepackage{tabularx}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{fancyhdr}
\usepackage{graphicx}
\usepackage{csquotes}
\usepackage{tcolorbox}
\tcbuselibrary{skins,breakable}
\usepackage{caption}
\usepackage{subcaption}
\graphicspath{{../docs_aula/img/}}
\usepackage[hidelinks,bookmarks=true,bookmarksopen=true,
            pdftitle={Pixel Round — «PDF_TITLE»},
            pdfauthor={Vinícius Rodrigues de Souza}]{hyperref}

\definecolor{accent}{HTML}{CC2020}
\definecolor{ink}{HTML}{1F1F23}
\definecolor{muted}{HTML}{4E4E58}
\definecolor{bg}{HTML}{FBF6E9}
\definecolor{rule}{HTML}{D8D1BC}

\color{ink}

\titleformat{\section}
  {\sffamily\Large\bfseries\color{accent}}{\thesection.}{0.6em}{}
\titleformat{\subsection}
  {\sffamily\large\bfseries\color{accent!85!ink}}{\thesubsection}{0.6em}{}
\titlespacing*{\section}{0pt}{1.2\baselineskip}{0.6\baselineskip}
\titlespacing*{\subsection}{0pt}{0.8\baselineskip}{0.3\baselineskip}

\pagestyle{fancy}
\fancyhf{}
\fancyhead[L]{\small\sffamily\bfseries\color{accent}PIXEL ROUND}
\fancyhead[R]{\small\sffamily\color{muted}«HEAD_R»}
\fancyfoot[L]{\small\sffamily\color{muted}«FOOT_L»}
\fancyfoot[R]{\small\sffamily\color{muted}«PAGE_WORD» \thepage}
\renewcommand{\headrulewidth}{0.4pt}
\renewcommand{\footrulewidth}{0.4pt}
\renewcommand{\headrule}{{\color{rule}\hrule height \headrulewidth}}
\renewcommand{\footrule}{{\color{rule}\vskip-\footrulewidth\hrule height \footrulewidth\vskip-\footrulewidth}}

\newtcolorbox{formula}{
  colback=bg, colframe=rule, boxrule=0.4pt, arc=2pt,
  left=10pt,right=10pt,top=8pt,bottom=8pt,
  before skip=8pt, after skip=8pt,
  fontupper=\color{accent}, breakable
}

\setlength{\parskip}{0.75em}
\setlength{\parindent}{0pt}
\linespread{1.10}

\newcommand{\code}[1]{\texttt{\small #1}}
\newcommand{\acc}[1]{\textcolor{accent}{\textbf{#1}}}

\captionsetup{font=small, labelfont={bf,color=accent}, textfont={color=muted}, justification=centering}
\captionsetup[sub]{font=footnotesize, labelfont={bf,color=accent!75!ink}, textfont={color=muted}}

\begin{document}

\begin{titlepage}
  \centering
  \vspace*{3.5cm}
  {\sffamily\bfseries\fontsize{56}{60}\selectfont \color{accent} Pixel Round\par}
  \vspace{0.7cm}
  {\sffamily\LARGE\color{muted} «COVER_SUBTITLE»\par}
  \vspace{1.4cm}
  {\color{rule}\rule{0.6\textwidth}{0.6pt}\par}
  \vspace{0.9cm}
  \begin{minipage}{0.82\textwidth}
    \centering\color{ink}\large
    «COVER_DESC»
  \end{minipage}
  \vspace{0.9cm}\\
  {\color{rule}\rule{0.6\textwidth}{0.6pt}\par}
  \vspace{2cm}
  \begin{minipage}{0.78\textwidth}
    \centering\sffamily\small\color{muted}
    \textbf{«COVER_AREAS_LABEL»} «COVER_AREAS_LIST»
  \end{minipage}
\end{titlepage}

\renewcommand{\contentsname}{\color{accent}«TOC_TITLE»}
\tableofcontents
\thispagestyle{fancy}
\newpage

% =============================================================================
\section{«S1_TITLE»}

«S1_P1»

«S1_P2»

«S1_P3_INTRO»
\begin{itemize}[leftmargin=1.3em,itemsep=0.15em,topsep=0.3em]
  \item «S1_AREA_1»;
  \item «S1_AREA_2»;
  \item «S1_AREA_3»;
  \item «S1_AREA_4»;
  \item «S1_AREA_5»;
  \item «S1_AREA_6»;
  \item «S1_AREA_7».
\end{itemize}

% =============================================================================
\section{«S2_TITLE»}

«S2_P1»

\begin{formula}
\centering
$\displaystyle \text{«S2_CENTER_LABEL»}\;=\;\bigl(i+\tfrac{1}{2},\;\; j+\tfrac{1}{2}\bigr)$
\end{formula}

«S2_P2»

% =============================================================================
\section{«S3_TITLE»}

«S3_P1»

\begin{formula}
\centering
$\displaystyle \left(\dfrac{x}{r_x}\right)^{\!2} + \left(\dfrac{y}{r_y}\right)^{\!2} \;=\; 1$
\end{formula}

«S3_P2»

«S3_P3»

\begin{formula}
\centering
$\displaystyle d_x = \dfrac{i+\tfrac{1}{2}-c_x}{r_x},\qquad
                d_y = \dfrac{j+\tfrac{1}{2}-c_y}{r_y},\qquad
                \text{«S3_INSIDE»}\;\Longleftrightarrow\; d_x^2 + d_y^2 \leq 1$
\end{formula}

\begin{figure}[!htb]\centering
\includegraphics[width=0.62\textwidth]{fig04_2d_ellipse_24x12.png}
\caption{«FIG_S3_CAP»}
\end{figure}

% =============================================================================
\section{«S4_TITLE»}

\textbf{«S4_IDEA_LABEL»} «S4_P1»

\begin{formula}
\centering
$\displaystyle x \;=\; c_x \;\pm\; r_x\,\sqrt{\,1 - \left(\dfrac{y-c_y}{r_y}\right)^{\!2}\,}$
\end{formula}

«S4_P2»

\begin{formula}
\centering
$\displaystyle \mathit{dxM} \;=\; r_x\,\sqrt{\,1 - \dfrac{d_y^{\,2}}{r_y^{\,2}}\,}$
\end{formula}

«S4_P3»

\begin{formula}
\centering
$\displaystyle \mathit{lo} = \lceil c_x - \mathit{dxM} - \tfrac{1}{2} \rceil,
                \qquad
                \mathit{hi} = \lfloor c_x + \mathit{dxM} - \tfrac{1}{2} \rfloor$
\end{formula}

\textbf{«S4_JUST_LABEL»} «S4_P4»

\begin{figure}[!htb]\centering
\includegraphics[width=0.48\textwidth]{fig01_2d_d20_euclidean.png}
\caption{«FIG_S4_CAP»}
\end{figure}

% =============================================================================
\section{«S5_TITLE»}

«S5_P1»

\subsection{«S5_SUB1»}

«S5_P2»
\[
d_0 \;=\; 1 - R
\]

«S5_P3»
\[
\begin{cases}
\text{«S5_IF» } d < 0: & \text{«S5_NEXT» } (x{+}1,\;y), \quad d \mathrel{+}= 2x+3 \\[2pt]
\text{«S5_IF» } d \geq 0: & \text{«S5_NEXT» } (x{+}1,\;y{-}1), \quad d \mathrel{+}= 2(x-y)+5
\end{cases}
\]

\textbf{«S5_JUST_LABEL»} «S5_P4»
\[
F\!\left(x+1,\;y-\tfrac{1}{2}\right) \;=\; (x+1)^2 + \left(y-\tfrac{1}{2}\right)^{\!2} - R^2
\]
«S5_P5»

\subsection{«S5_SUB2»}

«S5_P6»
\[
\text{«S5_REGION» I: } 2b^2 x < 2a^2 y \quad \bigl(|dy/dx| < 1\bigr),
\qquad
\text{«S5_REGION» II: «S5_OTHERWISE»}
\]

«S5_P7»
\begin{align*}
p_1 &= b^2 - a^2 b + \tfrac{a^2}{4}, \\
p_2 &= b^2\!\left(x+\tfrac{1}{2}\right)^{\!2} + a^2\!\left(y-1\right)^{\!2} - a^2 b^2.
\end{align*}

«S5_P8»

\begin{figure}[!htb]\centering
\includegraphics[width=0.48\textwidth]{fig02_2d_d20_bresenham.png}
\caption{«FIG_S5_CAP»}
\end{figure}

% =============================================================================
\section{«S6_TITLE»}

«S6_P1»

\begin{formula}
\centering
$\displaystyle n_x = \operatorname{clamp}(c_x,\,i,\,i{+}1),\quad
                n_y = \operatorname{clamp}(c_y,\,j,\,j{+}1)$ \\[6pt]
$\displaystyle \text{«S3_INSIDE»}\;\Longleftrightarrow\;
\left(\dfrac{n_x-c_x}{r_x}\right)^{\!2} + \left(\dfrac{n_y-c_y}{r_y}\right)^{\!2} \leq 0{,}94$
\end{formula}

«S6_P2»

«S6_P3»

\begin{figure}[!htb]\centering
\includegraphics[width=0.48\textwidth]{fig03_2d_d20_threshold.png}
\caption{«FIG_S6_CAP»}
\end{figure}

% =============================================================================
\section{«S7_TITLE»}

«S7_P1»

\subsection{«S7_SUB1»}
«S7_P2»

\subsection{«S7_SUB2»}
«S7_P3»
\[
b(i,j) \;=\; f(i,j) \;\wedge\;
\bigl(\neg f(i{-}1,j)\,\vee\,\neg f(i{+}1,j)\,\vee\,\neg f(i,j{-}1)\,\vee\,\neg f(i,j{+}1)\bigr)
\]
«S7_P4»

\subsection{«S7_SUB3»}
«S7_P5»
\begin{align*}
t(i,j) &= b(i,j) \;\vee\; \bigl(f(i,j) \,\wedge\, h_H \,\wedge\, h_V\bigr), \\
h_H &= b(i{-}1,j) \;\vee\; b(i{+}1,j), \\
h_V &= b(i,j{-}1) \;\vee\; b(i,j{+}1).
\end{align*}

% =============================================================================
\section{«S8_TITLE»}

«S8_P1»
\[
\underset{\text{«S8_CONT»}}{\pi \, r_x \, r_y}
\qquad\longleftrightarrow\qquad
\underset{\text{«S8_DISC»}}{\sum_{j=0}^{G_y-1}\sum_{i=0}^{G_x-1} f(i,j)}
\]
«S8_P2»

% =============================================================================
\section{«S9_TITLE»}

«S9_P1»
\[
\left(\dfrac{x}{r_x}\right)^{\!2} + \left(\dfrac{y}{r_y}\right)^{\!2} + \left(\dfrac{z}{r_z}\right)^{\!2} \;=\; 1
\]

«S9_P2»
\[
a_\xi = \frac{\xi + \tfrac{1}{2} - c_\xi}{r_\xi}\;\;(\xi \in \{x,y,z\}),
\qquad
\text{«S3_INSIDE»}\;\Longleftrightarrow\;a_x^{\,2} + a_y^{\,2} + a_z^{\,2} \leq 1
\]

% =============================================================================
\section{«S10_TITLE»}

«S10_P1»
\[
V \;=\; \dfrac{4}{3}\,\pi\, r_x\, r_y\, r_z
\]
«S10_P2»

\textbf{«S10_SHELL_LABEL»} «S10_P3»

\begin{figure}[!htb]\centering
\begin{subfigure}[t]{0.42\linewidth}\centering
  \includegraphics[width=\linewidth]{fig07_3d_sphere_d12.png}
\end{subfigure}\hfill
\begin{subfigure}[t]{0.42\linewidth}\centering
  \includegraphics[width=\linewidth]{fig08_3d_ellipsoid.png}
\end{subfigure}
\caption{«FIG_S10_CAP»}
\end{figure}

% =============================================================================
\section{«S11_TITLE»}

«S11_P1»
\[
\begin{array}{lcl}
\text{«S11_X»:}    & x \geq \mathit{cut}      & \Rightarrow\; \text{«S11_DISCARD»} \\
\text{«S11_Y»:}    & y \geq \mathit{cut}      & \Rightarrow\; \text{«S11_DISCARD»} \\
\text{«S11_DIAG»:}  & x + y \geq \mathit{cut}  & \Rightarrow\; \text{«S11_DISCARD»}
\end{array}
\]

«S11_P2»
\[
\mathit{cut} \;=\; \mathit{cutPct} \cdot \max_{\text{«S11_AXIS»}}
\]
«S11_P3»

\begin{figure}[!htb]\centering
\begin{subfigure}[t]{0.31\linewidth}\centering
  \includegraphics[width=\linewidth]{fig09_3d_cut_y50.png}
\end{subfigure}\hfill
\begin{subfigure}[t]{0.31\linewidth}\centering
  \includegraphics[width=\linewidth]{fig10_3d_cut_x50.png}
\end{subfigure}\hfill
\begin{subfigure}[t]{0.31\linewidth}\centering
  \includegraphics[width=\linewidth]{fig11_3d_cut_diag50.png}
\end{subfigure}
\caption{«FIG_S11_CAP»}
\end{figure}

% =============================================================================
\section{«S12_TITLE»}

«S12_P1»
\[
\mathit{thick3D} \;=\;
\bigcup_{z} T\bigl(S_z(z)\bigr) \;\cup\;
\bigcup_{y} T\bigl(S_y(y)\bigr) \;\cup\;
\bigcup_{x} T\bigl(S_x(x)\bigr)
\]
«S12_P2»

% =============================================================================
\section{«S13_TITLE»}

«S13_P1»
\[
\begin{aligned}
x &= r\,\sin(\varphi)\,\cos(\theta), \\
y &= r\,\cos(\varphi), \\
z &= r\,\sin(\varphi)\,\sin(\theta).
\end{aligned}
\]
«S13_P2»

% =============================================================================
\section{«S14_TITLE»}

«S14_P1»
\[
R \;=\; \sqrt{\,(D_x/2)^2 + (D_y/2)^2 + (D_z/2)^2\,}
\]

«S14_P2»
\[
\mathit{dist}_V \;=\; \dfrac{R}{\tan(\mathit{fov}_V / 2)}
\]
«S14_P3»
\[
\mathit{fov}_H \;=\; 2\,\arctan\!\left(\,\tan(\mathit{fov}_V/2)\cdot \mathit{aspect}\,\right)
\]
«S14_P4»

% =============================================================================
\section{«S15_TITLE»}

«S15_P1»
\[
R' = \mathrm{clamp}(R \cdot f),\quad
G' = \mathrm{clamp}(G \cdot f),\quad
B' = \mathrm{clamp}(B \cdot f)
\]
«S15_P2»
\[
I \;=\; \max\bigl(0,\;\mathbf{n}\cdot\mathbf{l}\bigr)\cdot \mathit{«S15_BASECOLOR»},
\]
«S15_P3»

% =============================================================================
\section{«S16_TITLE»}

«S16_P1»
\[
s(t) \;=\; A \cdot \sin\!\bigl(2\pi\, f\, t\bigr)
\]
«S16_P2»

\vspace{0.4em}
\begin{center}
\begin{tabular}{@{}llll@{}}
\toprule
\textbf{«TBL_H1»} & \textbf{«TBL_H2»} & \textbf{«TBL_H3»} & \textbf{«TBL_H4»} \\
\midrule
click  & 620                     & $\approx$ D\#5 / E$\flat$5 & «TBL_USE_CLICK» \\
hover  & 1100                    & $\approx$ C\#6            & «TBL_USE_HOVER» \\
tick   & 1300                    & $\approx$ E6              & «TBL_USE_TICK» \\
ok     & $520 \to 720 \to 920$   & «TBL_NOTE_OK»             & «TBL_USE_OK» \\
pop    & $680 + 980$             & «TBL_NOTE_POP»            & «TBL_USE_POP» \\
error  & 200                     & $\approx$ G\#3            & «TBL_USE_ERROR» \\
\bottomrule
\end{tabular}
\end{center}

«S16_P3»

% =============================================================================
\section{«S17_TITLE»}

«S17_P1»

\begin{itemize}[leftmargin=1.3em,itemsep=0.25em,topsep=0.4em]
  \item \acc{«S17_AREA1_NAME»}: «S17_AREA1_DESC»
  \item \acc{«S17_AREA2_NAME»}: «S17_AREA2_DESC»
  \item \acc{«S17_AREA3_NAME»}: «S17_AREA3_DESC»
  \item \acc{«S17_AREA4_NAME»}: «S17_AREA4_DESC»
  \item \acc{«S17_AREA5_NAME»}: «S17_AREA5_DESC»
  \item \acc{«S17_AREA6_NAME»}: «S17_AREA6_DESC»
  \item \acc{«S17_AREA7_NAME»}: «S17_AREA7_DESC»
\end{itemize}

«S17_P2»

\end{document}
"""

# ============================================================================
# CONFIGURAÇÃO DE FONTES POR IDIOMA
# ============================================================================
LATIN_FONTS = r"""\usepackage{fontspec}
\usepackage{polyglossia}
\setdefaultlanguage{«POLYGLOSSIA»}
\PolyglossiaSetup{«POLYGLOSSIA»}{indentfirst=false}
\setmainfont{Latin Modern Roman}[Scale=1.08]
\setsansfont{Latin Modern Sans}[Scale=1.08]
\setmonofont{Latin Modern Mono}[Scale=1.00]
\usepackage{unicode-math}
\setmathfont{Latin Modern Math}[Scale=1.08]"""

CYRILLIC_FONTS = r"""\usepackage{fontspec}
\usepackage{polyglossia}
\setdefaultlanguage{russian}
\setotherlanguage{english}
\PolyglossiaSetup{russian}{indentfirst=false}
\setmainfont{Cambria}[Scale=1.05]
\setsansfont{Cambria}[Scale=1.05]
\setmonofont{Latin Modern Mono}
\usepackage{unicode-math}
\setmathfont{Latin Modern Math}[Scale=1.05]"""

CJK_FONTS_ZH = r"""\usepackage{fontspec}
\usepackage{xeCJK}
\setCJKmainfont{Microsoft YaHei}[Scale=1.05]
\setCJKsansfont{Microsoft YaHei}[Scale=1.05]
\setmainfont{Latin Modern Roman}[Scale=1.05]
\setsansfont{Latin Modern Sans}[Scale=1.05]
\setmonofont{Latin Modern Mono}
\usepackage{unicode-math}
\setmathfont{Latin Modern Math}[Scale=1.05]"""

CJK_FONTS_JA = r"""\usepackage{fontspec}
\usepackage{xeCJK}
\setCJKmainfont{Yu Gothic}[Scale=1.05]
\setCJKsansfont{Yu Gothic}[Scale=1.05]
\setmainfont{Latin Modern Roman}[Scale=1.05]
\setsansfont{Latin Modern Sans}[Scale=1.05]
\setmonofont{Latin Modern Mono}
\usepackage{unicode-math}
\setmathfont{Latin Modern Math}[Scale=1.05]"""

CJK_FONTS_KO = r"""\usepackage{fontspec}
\usepackage{xeCJK}
\xeCJKsetup{CJKspace=true}
\XeTeXlinebreaklocale "ko"
\XeTeXlinebreakskip=0pt plus 1pt minus 0.1pt
\setCJKmainfont{Malgun Gothic}[Scale=1.05]
\setCJKsansfont{Malgun Gothic}[Scale=1.05]
\setmainfont{Latin Modern Roman}[Scale=1.05]
\setsansfont{Latin Modern Sans}[Scale=1.05]
\setmonofont{Latin Modern Mono}
\usepackage{unicode-math}
\setmathfont{Latin Modern Math}[Scale=1.05]"""


def fonts_for(loc):
    if loc == "zh-CN":
        return CJK_FONTS_ZH
    if loc == "ja-JP":
        return CJK_FONTS_JA
    if loc == "ko-KR":
        return CJK_FONTS_KO
    if loc == "ru-RU":
        return CYRILLIC_FONTS
    pg = {"en-US":"english","es-ES":"spanish","pt-BR":"portuguese",
          "fr-FR":"french","de-DE":"german"}[loc]
    return LATIN_FONTS.replace("«POLYGLOSSIA»", pg)


# ============================================================================
# TRADUÇÕES (será importado de translations.py para manter este script enxuto)
# ============================================================================
from translations import T

# ============================================================================
# BUILD
# ============================================================================
def build(loc):
    cfg = dict(T[loc])
    cfg["FONT_SETUP"] = fonts_for(loc)
    out = TEX
    # ordem de substituição não importa porque chaves são únicas
    for k, v in cfg.items():
        out = out.replace("«" + k + "»", v)
    # sanity check
    miss = re.findall(r"«[A-Z0-9_]+»", out)
    if miss:
        print(f"  ⚠ chaves não substituídas em {loc}: {set(miss)}")
    tex_path = HERE / f"Pixel_Round_Math_{loc}.tex"
    tex_path.write_text(out, encoding="utf-8")
    # compila duas vezes (TOC + ref)
    for i in range(2):
        r = subprocess.run(
            [XELATEX, "-interaction=nonstopmode", "-enable-installer",
             tex_path.name],
            cwd=str(HERE), capture_output=True, timeout=300,
        )
    # limpa auxiliares
    for ext in ("aux","log","toc","out"):
        p = tex_path.with_suffix("." + ext)
        if p.exists(): p.unlink()
    return tex_path.with_suffix(".pdf")


if __name__ == "__main__":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    locs = ["en-US","es-ES","pt-BR","fr-FR","de-DE","zh-CN","ja-JP","ru-RU","ko-KR"]
    for loc in locs:
        print(f"[build] {loc}")
        pdf = build(loc)
        if pdf.exists():
            print(f"  OK {pdf.name}  ({pdf.stat().st_size//1024} KB)")
        else:
            print(f"  FAIL")
