from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
import os
import tempfile
from datetime import datetime


# ── Color palette ─────────────────────────────────────────────────────────────
COLOR_BLACK      = colors.HexColor("#1a1a18")
COLOR_RED        = colors.HexColor("#dc2626")
COLOR_ORANGE     = colors.HexColor("#d97706")
COLOR_GREEN      = colors.HexColor("#16a34a")
COLOR_LIGHT_GRAY = colors.HexColor("#f8f7f4")
COLOR_BORDER     = colors.HexColor("#e0dedd")
COLOR_GEMINI     = colors.HexColor("#4285F4")   # Google blue for footer


def _score_color(score: int):
    """Returns a reportlab color based on how biased the system is."""
    if score < 50:
        return COLOR_RED
    elif score < 75:
        return COLOR_ORANGE
    else:
        return COLOR_GREEN


def _score_label(score: int) -> str:
    if score < 50:
        return "HIGH RISK"
    elif score < 75:
        return "MEDIUM RISK"
    else:
        return "LOW RISK"


# ── TXT fallback ──────────────────────────────────────────────────────────────
# If ReportLab crashes, we write a plain .txt file instead.
# main.py can still serve this as a download — just change the media type.
def _generate_txt_fallback(audit_id: str, result: dict) -> str:
    path = os.path.join(tempfile.gettempdir(), f"fairscan_{audit_id[:8]}.txt")

    score     = result.get("fairness_score", 0)
    memo      = result.get("report", {}).get("memo", "No memo generated.")
    violations = result.get("legal", {}).get("violations", [])
    date_str  = datetime.now().strftime("%B %d, %Y")

    lines = [
        "=" * 60,
        "FAIRSCAN — AI BIAS AUDIT REPORT",
        f"Model: {result.get('model_name', 'Unknown')}",
        f"Audit ID: {audit_id[:8]}",
        f"Date: {date_str}",
        "=" * 60,
        "",
        f"FAIRNESS SCORE: {score}/100  [{_score_label(score)}]",
        "",
        "-" * 60,
        memo,
        "",
        "-" * 60,
        "REGULATORY FINDINGS",
        "-" * 60,
    ]

    for v in violations:
        lines.append(f"[{v.get('risk_level','').upper()}] {v.get('regulation','')}")
        lines.append(f"  Finding: {v.get('finding','')}")
        lines.append(f"  Action:  {v.get('required_action','')}")
        lines.append(f"  Deadline:{v.get('deadline','')}")
        lines.append("")

    lines += [
        "=" * 60,
        "Powered by Google Gemini | FairScan",
        "=" * 60,
    ]

    with open(path, "w") as f:
        f.write("\n".join(lines))

    return path


# ── Add footer to every page ──────────────────────────────────────────────────
def _make_page_footer(canvas, doc):
    """Called by ReportLab on every page — draws the footer."""
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(COLOR_GEMINI)
    canvas.drawCentredString(
        A4[0] / 2,   # horizontally centred
        1.2 * cm,    # near bottom
        "Powered by Google Gemini  |  FairScan AI Bias Audit"
    )
    canvas.setFillColor(COLOR_BORDER)
    canvas.line(2 * cm, 1.5 * cm, A4[0] - 2 * cm, 1.5 * cm)  # thin line above footer
    canvas.restoreState()


# ── Main function ─────────────────────────────────────────────────────────────
def generate_pdf(audit_id: str, result: dict) -> str:
    """
    Builds a professional compliance PDF report.
    Returns the file path so main.py can serve it as a download.
    Falls back to a .txt file if ReportLab crashes.
    """
    pdf_path = os.path.join(tempfile.gettempdir(), f"fairscan_{audit_id[:8]}.pdf")

    try:
        _build_pdf(pdf_path, audit_id, result)
        print(f"[PDF] Generated successfully at {pdf_path}")
        return pdf_path

    except Exception as e:
        # If PDF building crashes for any reason, fall back to a .txt file
        print(f"[PDF] ReportLab error: {e} — falling back to .txt")
        return _generate_txt_fallback(audit_id, result)


def _build_pdf(path: str, audit_id: str, result: dict):
    """Does the actual ReportLab work. Separated so generate_pdf can catch errors."""

    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2.5 * cm,  # extra space for footer
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "Title",
        parent=styles["h1"],
        fontSize=22,
        textColor=COLOR_BLACK,
        spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    subtitle_style = ParagraphStyle(
        "Subtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#555555"),
        spaceAfter=2,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["h2"],
        fontSize=13,
        textColor=COLOR_BLACK,
        spaceBefore=14,
        spaceAfter=6,
        fontName="Helvetica-Bold",
    )
    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontSize=10,
        leading=15,
        textColor=COLOR_BLACK,
    )
    bullet_style = ParagraphStyle(
        "Bullet",
        parent=body_style,
        leftIndent=16,
        spaceAfter=4,
    )

    # Pull data from result object
    score       = result.get("fairness_score", 0)
    model_name  = result.get("model_name", "Unknown Model")
    date_str    = datetime.now().strftime("%B %d, %Y")
    memo        = result.get("report", {}).get("memo", "No report generated.")
    violations  = result.get("legal", {}).get("violations", [])

    story = []

    # ── 1. HEADER ──────────────────────────────────────────────────────────────
    story.append(Paragraph("FairScan", title_style))
    story.append(Paragraph("AI Bias Audit Report", subtitle_style))
    story.append(Paragraph(f"<b>Model:</b> {model_name}", subtitle_style))
    story.append(Paragraph(f"<b>Date:</b> {date_str}", subtitle_style))
    story.append(Paragraph(f"<b>Audit ID:</b> {audit_id[:8]}", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=COLOR_BORDER, spaceAfter=10))

    # ── 2. FAIRNESS SCORE BANNER ───────────────────────────────────────────────
    # A colored table cell acts as the "banner box"
    banner_color = _score_color(score)
    banner_label = _score_label(score)

    score_table = Table(
        [[
            Paragraph(
                f'<font color="white"><b>{score}/100</b></font>',
                ParagraphStyle("ScoreNum", fontSize=32, fontName="Helvetica-Bold",
                               alignment=1, leading=38)
            ),
            Paragraph(
                f'<font color="white"><b>{banner_label}</b></font><br/>'
                f'<font color="white">Fairness Score — lower means more biased</font>',
                ParagraphStyle("ScoreLabel", fontSize=12, fontName="Helvetica-Bold",
                               leading=18, textColor=colors.white)
            )
        ]],
        colWidths=[4 * cm, 12 * cm]
    )
    score_table.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), banner_color),
        ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING",    (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
        ("LEFTPADDING",   (0, 0), (-1, -1), 16),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 16),
        ("ROUNDEDCORNERS", [6]),
    ]))
    story.append(score_table)
    story.append(Spacer(1, 0.5 * cm))

    # ── 3. EXECUTIVE SUMMARY ───────────────────────────────────────────────────
    story.append(Paragraph("Executive Summary", section_style))

    # The memo has labelled sections separated by newlines — parse them out
    memo_lines = memo.split("\n")
    in_exec_summary = False
    exec_lines = []

    for line in memo_lines:
        stripped = line.strip()
        if stripped.upper().startswith("EXECUTIVE SUMMARY"):
            in_exec_summary = True
            # Grab text on the same line after the label, if any
            after_colon = stripped.split(":", 1)[-1].strip()
            if after_colon:
                exec_lines.append(after_colon)
        elif in_exec_summary:
            # Stop at the next labelled section
            if any(stripped.upper().startswith(k) for k in
                   ["KEY FINDINGS", "ROOT CAUSE", "REQUIRED ACTIONS", "RISK IF IGNORED"]):
                break
            if stripped:
                exec_lines.append(stripped)

    # If parsing found nothing, just show the first 2 lines of the memo
    if not exec_lines:
        exec_lines = [l.strip() for l in memo_lines if l.strip()][:2]

    for line in exec_lines:
        story.append(Paragraph(line, body_style))
        story.append(Spacer(1, 0.15 * cm))

    # ── 4. KEY FINDINGS (bullet points) ───────────────────────────────────────
    story.append(Paragraph("Key Findings", section_style))

    in_findings = False
    findings_lines = []
    for line in memo_lines:
        stripped = line.strip()
        if stripped.upper().startswith("KEY FINDINGS"):
            in_findings = True
        elif in_findings:
            if any(stripped.upper().startswith(k) for k in
                   ["ROOT CAUSE", "REQUIRED ACTIONS", "RISK IF IGNORED"]):
                break
            if stripped:
                findings_lines.append(stripped)

    if findings_lines:
        for bullet in findings_lines:
            # Remove leading dash/bullet if Gemini added one
            clean = bullet.lstrip("-•* ").strip()
            story.append(Paragraph(f"• {clean}", bullet_style))
    else:
        # Fallback: pull from stat results
        story.append(Paragraph(f"• Fairness score: {score}/100", bullet_style))

    story.append(Spacer(1, 0.3 * cm))

    # ── 5. LEGAL VIOLATIONS TABLE ──────────────────────────────────────────────
    if violations:
        story.append(Paragraph("Regulatory Findings", section_style))

        # Header row
        table_data = [[
            Paragraph("<b>Regulation</b>", body_style),
            Paragraph("<b>Risk Level</b>", body_style),
            Paragraph("<b>Required Action</b>", body_style),
            Paragraph("<b>Deadline</b>", body_style),
        ]]

        for v in violations:
            risk = v.get("risk_level", "low").lower()
            risk_color = {
                "high": COLOR_RED,
                "medium": COLOR_ORANGE,
                "low": COLOR_GREEN
            }.get(risk, COLOR_BLACK)

            table_data.append([
                Paragraph(v.get("regulation", ""), body_style),
                Paragraph(
                    f'<font color="{risk_color.hexval() if hasattr(risk_color, "hexval") else "#000"}">'
                    f'<b>{risk.upper()}</b></font>',
                    body_style
                ),
                Paragraph(v.get("required_action", ""), body_style),
                Paragraph(v.get("deadline", ""), body_style),
            ])

        t = Table(table_data, colWidths=[4.5 * cm, 2.2 * cm, 7.3 * cm, 3 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0), COLOR_BLACK),
            ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
            ("FONTSIZE",      (0, 0), (-1, -1), 9),
            ("BACKGROUND",    (0, 1), (-1, -1), COLOR_LIGHT_GRAY),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, COLOR_LIGHT_GRAY]),
            ("GRID",          (0, 0), (-1, -1), 0.5, COLOR_BORDER),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ]))
        story.append(t)

    # ── 6. REQUIRED ACTIONS (numbered list) ───────────────────────────────────
    story.append(Paragraph("Required Actions", section_style))

    in_actions = False
    action_lines = []
    for line in memo_lines:
        stripped = line.strip()
        if stripped.upper().startswith("REQUIRED ACTIONS"):
            in_actions = True
        elif in_actions:
            if any(stripped.upper().startswith(k) for k in ["RISK IF IGNORED", "EXECUTIVE"]):
                break
            if stripped:
                action_lines.append(stripped)

    if action_lines:
        for i, action in enumerate(action_lines, start=1):
            clean = action.lstrip("0123456789.-) ").strip()
            story.append(Paragraph(f"{i}. {clean}", bullet_style))
    else:
        # Fallback: pull required_action from violations
        for i, v in enumerate(violations, start=1):
            story.append(Paragraph(f"{i}. {v.get('required_action', '')}", bullet_style))

    # ── 7. RISK IF IGNORED ────────────────────────────────────────────────────
    in_risk = False
    risk_lines = []
    for line in memo_lines:
        stripped = line.strip()
        if stripped.upper().startswith("RISK IF IGNORED"):
            in_risk = True
            after = stripped.split(":", 1)[-1].strip()
            if after:
                risk_lines.append(after)
        elif in_risk and stripped:
            risk_lines.append(stripped)
            break  # only one sentence needed

    if risk_lines:
        story.append(Spacer(1, 0.3 * cm))
        risk_box = Table(
            [[Paragraph(f"⚠ Risk if ignored: {' '.join(risk_lines)}", body_style)]],
            colWidths=[17 * cm]
        )
        risk_box.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), colors.HexColor("#fff7ed")),
            ("BOX",           (0, 0), (-1, -1), 1, COLOR_ORANGE),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ]))
        story.append(risk_box)

    # ── Build the doc (footer is added via onPage callback) ───────────────────
    doc.build(story, onFirstPage=_make_page_footer, onLaterPages=_make_page_footer)