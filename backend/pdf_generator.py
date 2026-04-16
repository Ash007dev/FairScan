from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.units import cm
import os
import tempfile


RISK_COLORS = {
    "high": colors.HexColor("#dc2626"),
    "medium": colors.HexColor("#d97706"),
    "low": colors.HexColor("#16a34a"),
}


def generate_pdf(audit_id: str, result: dict) -> str:
    path = os.path.join(tempfile.gettempdir(), f"fairscan_{audit_id[:8]}.pdf")

    doc = SimpleDocTemplate(
        path, pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm
    )

    styles = getSampleStyleSheet()
    story = []

    # Header
    story.append(Paragraph("<b>FairScan — AI Bias Audit Report</b>", styles["h1"]))
    story.append(Paragraph(f"Model: {result.get('model_name', 'Unknown')}", styles["Normal"]))

    score = result.get("fairness_score", 0)
    score_color = "#dc2626" if score < 50 else "#d97706" if score < 75 else "#16a34a"
    story.append(Paragraph(
        f'<font color="{score_color}"><b>Fairness Score: {score}/100</b></font>',
        styles["Normal"]
    ))
    story.append(Spacer(1, 0.5 * cm))

    # Memo
    story.append(Paragraph("Compliance Memo", styles["h2"]))
    memo_text = result.get("report", {}).get("memo", "No memo generated.")
    for line in memo_text.split("\n"):
        if line.strip():
            story.append(Paragraph(line.strip(), styles["Normal"]))
            story.append(Spacer(1, 0.15 * cm))

    story.append(Spacer(1, 0.5 * cm))

    # Legal violations table
    violations = result.get("legal", {}).get("violations", [])
    if violations:
        story.append(Paragraph("Regulatory Findings", styles["h2"]))
        table_data = [["Regulation", "Risk", "Required Action", "Deadline"]]
        for v in violations:
            table_data.append([
                v.get("regulation", ""),
                v.get("risk_level", "").upper(),
                v.get("required_action", ""),
                v.get("deadline", ""),
            ])

        t = Table(table_data, colWidths=[4.5 * cm, 2 * cm, 7 * cm, 3 * cm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a18")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f7f4")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e0dedd")),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t)

    doc.build(story)
    return path