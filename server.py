#!/usr/bin/env python3
import csv
import io
import json
import os
from datetime import date, datetime
from email import policy
from email.parser import BytesParser
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

import openpyxl
import xlrd
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from contact_importer import OUTPUT_HEADERS, process_uploads


HOST = os.environ.get("HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", "8080"))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))


def normalize_cell(value):
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.strftime("%Y-%m-%d %H:%M:%S")
    if isinstance(value, date):
        return value.strftime("%Y-%m-%d")
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def infer_python_cell_type(value):
    if value is None:
        return "empty"
    if isinstance(value, datetime):
        return "datetime"
    if isinstance(value, date):
        return "date"
    if isinstance(value, (int, float)):
        return "number"
    return "text"


def table_from_csv(file_bytes):
    for encoding in ("utf-8-sig", "utf-8", "cp1250", "latin-1"):
        try:
            text = file_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    else:
        raise ValueError("CSV sa nepodarilo dekódovať.")

    reader = csv.reader(io.StringIO(text))
    rows = [row for row in reader if any(normalize_cell(cell) for cell in row)]
    return table_from_rows(rows)


def table_from_xlsx(file_bytes):
    workbook = openpyxl.load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    sheet = workbook[workbook.sheetnames[0]]
    rows = []
    row_types = []
    for row in sheet.iter_rows():
        values = []
        types = []
        for cell in row:
            values.append(normalize_cell(cell.value))
            if cell.is_date:
                types.append("datetime")
            else:
                types.append(infer_python_cell_type(cell.value))
        rows.append(values)
        row_types.append(types)
    return table_from_rows(rows, row_types)


def table_from_xls(file_bytes):
    workbook = xlrd.open_workbook(file_contents=file_bytes)
    sheet = workbook.sheet_by_index(0)
    rows = []
    row_types = []
    for row_index in range(sheet.nrows):
        current_row = []
        current_types = []
        for column_index in range(sheet.ncols):
            cell = sheet.cell(row_index, column_index)
            current_row.append(normalize_cell(cell.value))
            if cell.ctype == xlrd.XL_CELL_DATE:
                current_types.append("datetime")
            elif cell.ctype == xlrd.XL_CELL_NUMBER:
                current_types.append("number")
            elif cell.ctype == xlrd.XL_CELL_EMPTY:
                current_types.append("empty")
            else:
                current_types.append("text")
        rows.append(current_row)
        row_types.append(current_types)
    return table_from_rows(rows, row_types)


def table_from_rows(rows, row_types=None):
    if not rows:
        raise ValueError("Súbor je prázdny.")

    header_row = rows[0]
    headers = []
    for index, value in enumerate(header_row):
        label = normalize_cell(value) or f"Stĺpec {index + 1}"
        headers.append(label)

    structured_rows = []
    structured_types = []
    for row in rows[1:]:
        padded = list(row) + [""] * max(0, len(headers) - len(row))
        structured_rows.append([normalize_cell(padded[index]) for index in range(len(headers))])
    if row_types:
        for row in row_types[1:]:
            padded_types = list(row) + ["empty"] * max(0, len(headers) - len(row))
            structured_types.append([padded_types[index] for index in range(len(headers))])
    else:
        structured_types = [["text" if cell else "empty" for cell in row] for row in structured_rows]

    filtered_rows = []
    filtered_types = []
    for index, row in enumerate(structured_rows):
        if any(cell for cell in row):
            filtered_rows.append(row)
            filtered_types.append(structured_types[index])

    return {
        "headers": headers,
        "rows": filtered_rows,
        "types": filtered_types,
    }


def parse_multipart_form(headers, body):
    content_type = headers.get("Content-Type", "")
    if "multipart/form-data" not in content_type.lower():
        raise ValueError("Požiadavka musí byť multipart/form-data.")

    raw_message = (
        f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode("utf-8")
        + body
    )
    message = BytesParser(policy=policy.default).parsebytes(raw_message)

    fields = {}
    for part in message.iter_parts():
        if part.get_content_disposition() != "form-data":
            continue

        name = part.get_param("name", header="content-disposition")
        if not name:
            continue

        entry = {
            "filename": part.get_filename(),
            "content": part.get_payload(decode=True) or b"",
            "content_type": part.get_content_type(),
        }
        fields.setdefault(name, []).append(entry)

    return fields


class AppHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def do_POST(self):
        if self.path == "/api/process":
            self.handle_process()
            return
        if self.path == "/api/parse":
            self.handle_parse()
            return
        if self.path == "/api/export-xlsx":
            self.handle_export_xlsx()
            return
        self.send_error(HTTPStatus.NOT_FOUND, "Endpoint neexistuje.")

    def read_request_body(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise ValueError("Neplatná Content-Length hlavička.")
        return self.rfile.read(content_length)

    def handle_parse(self):
        try:
            form = parse_multipart_form(self.headers, self.read_request_body())
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        file_items = form.get("file", [])
        if not file_items:
            self.write_json({"error": "Súbor nebol prijatý."}, status=HTTPStatus.BAD_REQUEST)
            return

        file_item = file_items[0]
        file_name = file_item.get("filename") or "upload"
        extension = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""
        file_bytes = file_item.get("content", b"")

        try:
            if extension == "csv":
                table = table_from_csv(file_bytes)
            elif extension == "xlsx":
                table = table_from_xlsx(file_bytes)
            elif extension == "xls":
                table = table_from_xls(file_bytes)
            else:
                raise ValueError("Podporované sú len CSV, XLSX a XLS.")
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        self.write_json(table)

    def handle_process(self):
        try:
            form = parse_multipart_form(self.headers, self.read_request_body())
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        if "files" not in form:
            self.write_json({"error": "Neboli prijaté žiadne súbory."}, status=HTTPStatus.BAD_REQUEST)
            return

        file_items = form["files"]
        uploads = []
        for file_item in file_items:
            file_name = file_item.get("filename") or "upload"
            file_bytes = file_item.get("content", b"")
            if not file_bytes:
                continue
            uploads.append((file_name, file_bytes))

        if not uploads:
            self.write_json({"error": "Neboli prijaté žiadne súbory."}, status=HTTPStatus.BAD_REQUEST)
            return

        try:
            payload = process_uploads(uploads)
        except Exception as exc:
            self.write_json({"error": str(exc)}, status=HTTPStatus.BAD_REQUEST)
            return

        self.write_json(payload)

    def handle_export_xlsx(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(content_length).decode("utf-8"))
        except Exception:
            self.write_json({"error": "Neplatné dáta pre export."}, status=HTTPStatus.BAD_REQUEST)
            return

        rows = payload.get("rows", [])
        filename = payload.get("filename", "merged_contacts.xlsx")
        if not rows:
            self.write_json({"error": "Nie sú dáta na export."}, status=HTTPStatus.BAD_REQUEST)
            return

        workbook = openpyxl.Workbook()
        sheet = workbook.active
        sheet.title = "Kontakty"

        sheet.append(OUTPUT_HEADERS)
        for row in rows:
            sheet.append([row.get(header, "") for header in OUTPUT_HEADERS])

        header_fill = PatternFill(fill_type="solid", fgColor="1F4E78")
        header_font = Font(color="FFFFFF", bold=True)
        for cell in sheet[1]:
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center", vertical="center")

        sheet.auto_filter.ref = sheet.dimensions
        sheet.freeze_panes = "A2"

        for column_cells in sheet.columns:
            max_length = max(len(str(cell.value or "")) for cell in column_cells)
            letter = get_column_letter(column_cells[0].column)
            sheet.column_dimensions[letter].width = min(max(max_length + 2, 12), 40)

        buffer = io.BytesIO()
        workbook.save(buffer)
        body = buffer.getvalue()

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.send_header("Content-Disposition", f'attachment; filename="{filename}"')
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def write_json(self, payload, status=HTTPStatus.OK):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    server = ThreadingHTTPServer((HOST, PORT), AppHandler)
    print(f"Serving Kontakt Merge on http://{HOST}:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
