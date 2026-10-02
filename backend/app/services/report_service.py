import io
from pathlib import Path
from typing import Dict, Any, List
from datetime import datetime, timezone

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image as RLImage,
    KeepTogether,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch

from backend.app.core.storage import storage
from backend.app.core.errors import not_found_error

# Custom canvas to print "Page X of Y" and header/footer
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#475569"))

        # Footer
        footer_text = f"CiviSight AI · AI-assisted preliminary visual observation · Page {self._pageNumber} of {page_count}"
        self.drawCentredString(A4[0] / 2.0, 20, footer_text)

        # Thin footer rule
        self.setStrokeColor(colors.HexColor("#E5E7EB"))
        self.setLineWidth(0.5)
        self.line(36, 32, A4[0] - 36, 32)

        self.restoreState()


class ReportService:
    def generate_pdf(self, analysis_id: str) -> bytes:
        result = storage.load_result_json(analysis_id)
        original_img_path = storage.get_file_path(analysis_id, "original")
        annotated_img_path = storage.get_file_path(analysis_id, "annotated")

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=45,
        )

        styles = getSampleStyleSheet()
        
        # Custom typography
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=20,
            leading=24,
            textColor=colors.HexColor("#1E3A8A"),
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#475569"),
        )
        h2_style = ParagraphStyle(
            "DocH2",
            parent=styles["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=10,
            spaceAfter=4,
        )
        body_style = ParagraphStyle(
            "DocBody",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#0F172A"),
        )
        small_style = ParagraphStyle(
            "DocSmall",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#475569"),
        )
        table_cell_style = ParagraphStyle(
            "DocTableCell",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=10,
        )
        table_head_style = ParagraphStyle(
            "DocTableHead",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#0F172A"),
        )

        story = []

        # ---------------------------------------------------------------------
        # 1. Header Banner
        # ---------------------------------------------------------------------
        story.append(Paragraph("CiviSight AI — Inspection Report", title_style))
        story.append(Paragraph("AI-Powered Infrastructure Inspection", subtitle_style))
        story.append(Spacer(1, 4))

        meta_info = [
            f"<b>Analysis ID:</b> {analysis_id}",
            f"<b>Generated:</b> {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
            f"<b>Inspection Type:</b> {result.get('inspection_type', '').replace('_', ' ').title()}",
            f"<b>File:</b> {result.get('image', {}).get('original_filename', 'Unknown')}",
        ]
        meta_table = Table(
            [[Paragraph(meta_info[0], small_style), Paragraph(meta_info[1], small_style)],
             [Paragraph(meta_info[2], small_style), Paragraph(meta_info[3], small_style)]],
            colWidths=[260, 260],
        )
        meta_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
            ('PADDING', (0, 0), (-1, -1), 4),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ]))
        story.append(meta_table)
        story.append(Spacer(1, 10))

        # ---------------------------------------------------------------------
        # 2. Inspection Details & Model
        # ---------------------------------------------------------------------
        model_data = result.get("model", {})
        model_name = model_data.get("name", "N/A")
        if model_data.get("is_baseline"):
            model_name += " (Classical baseline — heuristic)"
        
        detail_rows = [
            [Paragraph("<b>Image Dimensions:</b>", small_style),
             Paragraph(f"{result.get('image', {}).get('width')} × {result.get('image', {}).get('height')} px", small_style),
             Paragraph("<b>Detection Model:</b>", small_style),
             Paragraph(model_name, small_style)],
        ]
        det_table = Table(detail_rows, colWidths=[100, 160, 100, 160])
        det_table.setStyle(TableStyle([
            ('PADDING', (0, 0), (-1, -1), 2),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))
        story.append(det_table)
        story.append(Spacer(1, 10))

        # ---------------------------------------------------------------------
        # 3. Images Side by Side
        # ---------------------------------------------------------------------
        story.append(Paragraph("Visual Evidence", h2_style))
        img_w_pt = 255
        img_h_pt = 180

        orig_rl = None
        annot_rl = None
        if original_img_path.exists():
            orig_rl = RLImage(str(original_img_path), width=img_w_pt, height=img_h_pt)
        if annotated_img_path.exists():
            annot_rl = RLImage(str(annotated_img_path), width=img_w_pt, height=img_h_pt)

        if orig_rl and annot_rl:
            img_table = Table(
                [[orig_rl, annot_rl],
                 [Paragraph("<b>Original Upload</b>", small_style),
                  Paragraph("<b>AI Annotated Findings</b>", small_style)]],
                colWidths=[260, 260],
            )
            img_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('PADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(img_table)
        story.append(Spacer(1, 10))

        # ---------------------------------------------------------------------
        # 4. Summary & Condition Indicator
        # ---------------------------------------------------------------------
        summary = result.get("summary", {})
        cond = result.get("condition_indicator", {})
        cond_val_str = str(cond.get("value")) if cond.get("value") is not None else "Not computed"
        band = cond.get("band", "gray")

        band_color = colors.HexColor("#475569")
        if band == "green":
            band_color = colors.HexColor("#15803D")
        elif band == "amber":
            band_color = colors.HexColor("#B45309")
        elif band == "red":
            band_color = colors.HexColor("#B91C1C")

        summary_p = (
            f"<b>Total Detections:</b> {summary.get('total_detections', 0)} &nbsp;&nbsp;|&nbsp;&nbsp; "
            f"<b>Overall Severity:</b> {(summary.get('overall_severity') or 'None').upper()} &nbsp;&nbsp;|&nbsp;&nbsp; "
            f"<b>Condition Indicator:</b> <font color='{band_color.hexval()}'>{cond_val_str}/100</font>"
        )
        story.append(Paragraph(summary_p, body_style))
        story.append(Spacer(1, 6))

        # Condition breakdown factors
        if cond.get("factors"):
            factor_rows = [[Paragraph("Factor Name", table_head_style), Paragraph("Detail", table_head_style), Paragraph("Penalty", table_head_style)]]
            for f in cond.get("factors", []):
                factor_rows.append([
                    Paragraph(f.get("name", ""), table_cell_style),
                    Paragraph(f.get("detail", ""), table_cell_style),
                    Paragraph(str(f.get("penalty", 0)), table_cell_style),
                ])
            ftable = Table(factor_rows, colWidths=[180, 260, 80])
            ftable.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ('PADDING', (0, 0), (-1, -1), 3),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ]))
            story.append(ftable)
            story.append(Spacer(1, 4))
            story.append(Paragraph(f"<i>Formula: {cond.get('formula_id')} — {cond.get('explanation', '')}</i>", small_style))
            story.append(Spacer(1, 10))

        # Safety Metrics Table if safety module
        safety_metrics = result.get("safety_metrics")
        if safety_metrics:
            story.append(Paragraph("Safety & PPE Metrics", h2_style))
            c_pct = safety_metrics.get("visible_helmet_compliance_pct")
            c_str = f"{c_pct:.1f}%" if c_pct is not None else "Unavailable"
            s_rows = [
                [Paragraph("People Detected", table_head_style), Paragraph("Assessable People", table_head_style), Paragraph("Helmets Detected", table_head_style), Paragraph("Visible Helmet Compliance", table_head_style)],
                [Paragraph(str(safety_metrics.get("people_detected", 0)), table_cell_style),
                 Paragraph(str(safety_metrics.get("people_assessable", 0)), table_cell_style),
                 Paragraph(str(safety_metrics.get("helmets_detected", 0)), table_cell_style),
                 Paragraph(f"<b>{c_str}</b>", table_cell_style)],
            ]
            s_table = Table(s_rows, colWidths=[130, 130, 130, 130])
            s_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('PADDING', (0, 0), (-1, -1), 4),
            ]))
            story.append(s_table)
            story.append(Spacer(1, 10))

        # ---------------------------------------------------------------------
        # 5. Findings Table
        # ---------------------------------------------------------------------
        detections = result.get("detections", [])
        if detections:
            story.append(Paragraph("Detailed Findings", h2_style))
            score_col_header = "Confidence" if result.get("model", {}).get("score_type") == "model_confidence" else "Detection Score (heuristic)"
            
            f_rows = [[
                Paragraph("#", table_head_style),
                Paragraph("Type", table_head_style),
                Paragraph(score_col_header, table_head_style),
                Paragraph("Severity / Status", table_head_style),
                Paragraph("Location", table_head_style),
                Paragraph("Rel. Size / Length", table_head_style),
            ]]

            for d in detections:
                det_type = d.get("type", "")
                sev_or_status = d.get("severity") or ""
                if result.get("inspection_type") == "safety_detection":
                    sev_or_status = d.get("attributes", {}).get("helmet_status", "").replace("_", " ")

                area_p = f"{d.get('area_ratio', 0)*100:.2f}%"
                if d.get("relative_length") is not None:
                    area_p += f" | len {d.get('relative_length', 0):.2f}"

                f_rows.append([
                    Paragraph(str(d.get("id", 1)), table_cell_style),
                    Paragraph(det_type, table_cell_style),
                    Paragraph(f"{d.get('score', 0):.2f}", table_cell_style),
                    Paragraph(str(sev_or_status), table_cell_style),
                    Paragraph(str(d.get("location", "")), table_cell_style),
                    Paragraph(area_p, table_cell_style),
                ])

            findings_table = Table(f_rows, colWidths=[25, 75, 120, 110, 85, 105])
            findings_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('PADDING', (0, 0), (-1, -1), 3),
            ]))
            story.append(findings_table)
            story.append(Spacer(1, 10))

        # ---------------------------------------------------------------------
        # 6. Engineering Interpretation
        # ---------------------------------------------------------------------
        story.append(Paragraph("Engineering Interpretation", h2_style))
        story.append(Paragraph(result.get("interpretation", ""), body_style))
        story.append(Spacer(1, 10))

        # ---------------------------------------------------------------------
        # 7. Recommendations
        # ---------------------------------------------------------------------
        recs = result.get("recommendations", [])
        if recs:
            story.append(Paragraph("Preliminary Guidance & Recommendations", h2_style))
            for r in recs:
                story.append(Paragraph(f"• {r.get('text', '')}", body_style))
                story.append(Spacer(1, 2))
            story.append(Spacer(1, 8))

        # ---------------------------------------------------------------------
        # 8. Limitations & Legal Disclaimer
        # ---------------------------------------------------------------------
        story.append(Paragraph("Limitations & Engineering Disclaimer", h2_style))
        story.append(Paragraph(f"<b>Notice:</b> {result.get('disclaimer', '')}", small_style))
        story.append(Spacer(1, 2))
        story.append(Paragraph("Severity and scores are heuristic visual indicators, not engineering measurements.", small_style))
        story.append(Spacer(1, 2))
        for lim in result.get("limitations", []):
            story.append(Paragraph(f"• {lim}", small_style))
            story.append(Spacer(1, 1))

        # Build PDF with NumberedCanvas
        doc.build(story, canvasmaker=NumberedCanvas)
        return buf.getvalue()


report_service = ReportService()
