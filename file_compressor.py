import io
import json
import os
import re
import shutil
import subprocess
import tempfile
import unicodedata
from dataclasses import dataclass
from pathlib import Path

try:
    import fitz
except ImportError:
    fitz = None

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None
    ImageOps = None


SUPPORTED_IMAGE_TYPES = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
}
PDF_MIME_TYPE = "application/pdf"
PDF_SWIFT_SCRIPT = Path(__file__).with_name("pdf_compressor.swift")
SWIFT_BINARY = shutil.which("swift")
RESAMPLE_FILTER = (
    Image.Resampling.BILINEAR
    if Image is not None and hasattr(Image, "Resampling")
    else (Image.BILINEAR if Image is not None else None)
)
PDF_RENDER_PRESETS = [
    (0.92, 68, False),
    (0.82, 60, False),
    (0.72, 52, False),
    (0.62, 44, False),
    (0.54, 36, False),
    (0.46, 30, True),
]
LARGE_PDF_RENDER_PRESETS = [
    (0.78, 56, False),
    (0.66, 46, False),
    (0.56, 38, False),
    (0.48, 32, True),
    (0.40, 26, True),
]
MAX_PDF_RASTER_PAGES = 8
FAST_PDF_BYTES_THRESHOLD = 5 * 1024 * 1024
LARGE_PDF_BYTES_THRESHOLD = 6 * 1024 * 1024


@dataclass
class CompressionResult:
    file_name: str
    content_type: str
    data: bytes
    original_bytes: int
    compressed_bytes: int
    target_bytes: int
    status: str
    reached_target: bool
    message: str


def compress_upload(file_name, file_bytes, target_mb):
    if not file_name:
        raise ValueError("Chýba názov súboru.")
    if not file_bytes:
        raise ValueError("Súbor je prázdny.")

    target_bytes = parse_target_mb(target_mb)
    extension = get_extension(file_name)

    if extension == "pdf":
        return compress_pdf(file_name, file_bytes, target_bytes)
    if extension in SUPPORTED_IMAGE_TYPES:
        return compress_image(file_name, file_bytes, target_bytes)

    raise ValueError("Podporované sú len PDF, JPG, JPEG, PNG a WEBP.")


def parse_target_mb(target_mb):
    try:
        value = float(str(target_mb).replace(",", "."))
    except (TypeError, ValueError) as exc:
        raise ValueError("Cieľová veľkosť musí byť číslo v MB.") from exc

    if value < 0.05:
        raise ValueError("Najmenšia povolená cieľová veľkosť je 0.05 MB.")
    if value > 250:
        raise ValueError("Najväčšia povolená cieľová veľkosť je 250 MB.")
    return int(value * 1024 * 1024)


def compress_pdf(file_name, file_bytes, target_bytes):
    original_bytes = len(file_bytes)
    download_name = build_download_name(file_name, "pdf")

    if original_bytes <= target_bytes:
        return build_result(
            download_name,
            PDF_MIME_TYPE,
            file_bytes,
            original_bytes,
            target_bytes,
            "already-small-enough",
        )

    errors = []
    fast_candidate = None

    if fitz is not None:
        try:
            fast_candidate = compress_pdf_fast(download_name, file_bytes, original_bytes, target_bytes)
            if fast_candidate is not None and fast_candidate.reached_target:
                return fast_candidate
        except Exception as exc:
            errors.append(str(exc))

    if fitz is not None and Image is not None:
        try:
            render_presets = LARGE_PDF_RENDER_PRESETS if original_bytes >= LARGE_PDF_BYTES_THRESHOLD else PDF_RENDER_PRESETS
            return compress_pdf_with_pymupdf(
                download_name,
                file_bytes,
                original_bytes,
                target_bytes,
                render_presets=render_presets,
            )
        except Exception as exc:
            errors.append(str(exc))
            if fast_candidate is not None:
                return fast_candidate

    if PDF_SWIFT_SCRIPT.exists() and SWIFT_BINARY:
        try:
            return compress_pdf_with_swift(download_name, file_bytes, original_bytes, target_bytes)
        except Exception as exc:
            errors.append(str(exc))
            if fast_candidate is not None:
                return fast_candidate

    if not errors:
        raise RuntimeError("PDF kompresia vyžaduje PyMuPDF alebo macOS Swift helper.")
    raise RuntimeError(errors[-1])


def compress_pdf_fast(download_name, file_bytes, original_bytes, target_bytes):
    document = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        if document.page_count == 0:
            raise ValueError("PDF je prázdne.")

        optimized_bytes = document.tobytes(garbage=4, deflate=True, clean=True)
        optimized_size = len(optimized_bytes)

        if optimized_size >= original_bytes:
            return None

        status = "compressed" if optimized_size <= target_bytes else "best-effort"
        if optimized_size <= target_bytes or document.page_count > MAX_PDF_RASTER_PAGES:
            return build_result(
                download_name,
                PDF_MIME_TYPE,
                optimized_bytes,
                original_bytes,
                target_bytes,
                status,
            )

        # If we still need to try a deeper rasterization, fall through to the slow path
        return build_result(
            download_name,
            PDF_MIME_TYPE,
            optimized_bytes,
            original_bytes,
            target_bytes,
            "best-effort",
        )
    finally:
        document.close()


def compress_pdf_with_pymupdf(download_name, file_bytes, original_bytes, target_bytes, render_presets=None):
    best_under_target = None
    smallest_candidate = None
    presets = render_presets or PDF_RENDER_PRESETS

    document = fitz.open(stream=file_bytes, filetype="pdf")
    try:
        if document.page_count == 0:
            raise ValueError("PDF je prázdne.")

        for scale, quality, grayscale in presets:
            candidate_data = render_pdf_candidate(document, scale, quality, grayscale=grayscale)
            candidate = {
                "data": candidate_data,
                "size": len(candidate_data),
                "grayscale": grayscale,
                "scale": scale,
                "quality": quality,
            }
            if smallest_candidate is None or candidate["size"] < smallest_candidate["size"]:
                smallest_candidate = candidate
            if candidate["size"] <= target_bytes:
                if best_under_target is None or candidate["size"] > best_under_target["size"]:
                    best_under_target = candidate
    finally:
        document.close()

    chosen = best_under_target or smallest_candidate
    if chosen is None:
        raise RuntimeError("Nepodarilo sa pripraviť zmenšenú PDF verziu.")

    if chosen["size"] >= original_bytes:
        return build_result(
            download_name,
            PDF_MIME_TYPE,
            file_bytes,
            original_bytes,
            target_bytes,
            "already-optimized",
        )

    return build_result(
        download_name,
        PDF_MIME_TYPE,
        chosen["data"],
        original_bytes,
        target_bytes,
        "compressed" if chosen["size"] <= target_bytes else "best-effort",
    )


def render_pdf_candidate(document, scale, quality, grayscale=False):
    output = fitz.open()
    try:
        for page_index in range(document.page_count):
            page = document.load_page(page_index)
            page_rect = page.rect
            pixmap = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
            image_bytes = save_pixmap_as_jpeg(pixmap, quality, grayscale=grayscale)
            new_page = output.new_page(width=page_rect.width, height=page_rect.height)
            new_page.insert_image(page_rect, stream=image_bytes, keep_proportion=False)
        return output.tobytes(garbage=4, deflate=True, clean=True)
    finally:
        output.close()


def save_pixmap_as_jpeg(pixmap, quality, grayscale=False):
    with Image.open(io.BytesIO(pixmap.tobytes("png"))) as image:
        image.load()
        buffer = io.BytesIO()
        working = image.convert("L" if grayscale else "RGB")
        working.save(
            buffer,
            format="JPEG",
            quality=quality,
            optimize=True,
            progressive=True,
        )
        return buffer.getvalue()


def compress_pdf_with_swift(download_name, file_bytes, original_bytes, target_bytes):
    with tempfile.TemporaryDirectory(prefix="unifyo-pdf-compress-") as temp_dir:
        temp_path = Path(temp_dir)
        input_path = temp_path / "input.pdf"
        output_path = temp_path / "output.pdf"
        input_path.write_bytes(file_bytes)

        env = os.environ.copy()
        swift_home = temp_path / "swift-home"
        module_cache = temp_path / "swift-module-cache"
        swift_home.mkdir(parents=True, exist_ok=True)
        module_cache.mkdir(parents=True, exist_ok=True)
        env["HOME"] = str(swift_home)
        env["SWIFT_MODULE_CACHE_PATH"] = str(module_cache)
        env["CLANG_MODULE_CACHE_PATH"] = str(module_cache)

        process = subprocess.run(
            [SWIFT_BINARY, str(PDF_SWIFT_SCRIPT), str(input_path), str(output_path), str(target_bytes)],
            capture_output=True,
            text=True,
            env=env,
        )

        if process.returncode != 0:
            message = process.stderr.strip() or process.stdout.strip() or "PDF kompresia zlyhala."
            raise RuntimeError(message)

        try:
            metadata = json.loads(process.stdout.strip() or "{}")
        except json.JSONDecodeError as exc:
            raise RuntimeError("PDF kompresor vrátil neplatnú odpoveď.") from exc

        if not output_path.exists():
            raise RuntimeError("PDF kompresor nevytvoril výstupný súbor.")

        return build_result(
            download_name,
            PDF_MIME_TYPE,
            output_path.read_bytes(),
            int(metadata.get("original_bytes") or original_bytes),
            int(metadata.get("target_bytes") or target_bytes),
            str(metadata.get("status") or "best-effort"),
        )


def compress_image(file_name, file_bytes, target_bytes):
    ensure_pillow_available()
    original_bytes = len(file_bytes)
    extension = get_extension(file_name)

    if original_bytes <= target_bytes:
        return build_result(
            build_download_name(file_name, extension),
            SUPPORTED_IMAGE_TYPES[extension],
            file_bytes,
            original_bytes,
            target_bytes,
            "already-small-enough",
        )

    try:
        with Image.open(io.BytesIO(file_bytes)) as source:
            image = ImageOps.exif_transpose(source)
            image.load()
    except Exception as exc:
        raise ValueError("Obrázok sa nepodarilo načítať.") from exc

    best_under_target = None
    smallest_candidate = None
    scales = build_image_scale_plan(original_bytes, target_bytes)

    for scale in scales:
        working_image = resize_image(image, scale)
        try:
            for candidate in iter_image_candidates(working_image, extension):
                if smallest_candidate is None or candidate["size"] < smallest_candidate["size"]:
                    smallest_candidate = candidate
                if candidate["size"] <= target_bytes:
                    if best_under_target is None or candidate["size"] > best_under_target["size"]:
                        best_under_target = candidate
                    if candidate["size"] >= int(target_bytes * 0.68):
                        break
            if best_under_target and best_under_target["size"] >= int(target_bytes * 0.68):
                break
        finally:
            if working_image is not image:
                working_image.close()

    image.close()

    chosen = best_under_target or smallest_candidate
    if chosen is None:
        raise RuntimeError("Nepodarilo sa pripraviť zmenšenú verziu obrázka.")

    if chosen["size"] >= original_bytes:
        return build_result(
            build_download_name(file_name, extension),
            SUPPORTED_IMAGE_TYPES[extension],
            file_bytes,
            original_bytes,
            target_bytes,
            "already-optimized",
        )

    return build_result(
        build_download_name(file_name, chosen["extension"]),
        chosen["mime_type"],
        chosen["data"],
        original_bytes,
        target_bytes,
        "compressed" if chosen["size"] <= target_bytes else "best-effort",
    )


def iter_image_candidates(image, extension):
    has_alpha = image_has_alpha(image)
    quality_steps = [74, 56, 42]
    webp_steps = [72, 54, 40]
    png_colors = [64, 32]

    if extension in {"jpg", "jpeg"}:
        for quality in quality_steps:
            data = save_as_jpeg(image, quality)
            yield {"data": data, "size": len(data), "extension": "jpg", "mime_type": "image/jpeg"}
        for quality in webp_steps:
            data = save_as_webp(image, quality)
            if data:
                yield {"data": data, "size": len(data), "extension": "webp", "mime_type": "image/webp"}
        return

    if extension == "webp":
        for quality in webp_steps:
            data = save_as_webp(image, quality)
            if data:
                yield {"data": data, "size": len(data), "extension": "webp", "mime_type": "image/webp"}
        if not has_alpha:
            for quality in quality_steps:
                data = save_as_jpeg(image, quality)
                yield {"data": data, "size": len(data), "extension": "jpg", "mime_type": "image/jpeg"}
        return

    if extension == "png":
        for quality in webp_steps:
            data = save_as_webp(image, quality)
            if data:
                yield {"data": data, "size": len(data), "extension": "webp", "mime_type": "image/webp"}
        for colors in png_colors:
            data = save_as_png(image, colors)
            if data:
                yield {"data": data, "size": len(data), "extension": "png", "mime_type": "image/png"}
        if not has_alpha:
            for quality in quality_steps:
                data = save_as_jpeg(image, quality)
                yield {"data": data, "size": len(data), "extension": "jpg", "mime_type": "image/jpeg"}


def build_image_scale_plan(original_bytes, target_bytes):
    ratio = original_bytes / max(target_bytes, 1)
    if ratio <= 1.4:
        return [1.0, 0.84]
    if ratio <= 2.2:
        return [0.84, 0.66]
    if ratio <= 3.5:
        return [0.72, 0.54]
    return [0.62, 0.44]


def save_as_jpeg(image, quality):
    buffer = io.BytesIO()
    convert_for_jpeg(image).save(buffer, format="JPEG", quality=quality, optimize=False, progressive=False)
    return buffer.getvalue()


def save_as_webp(image, quality):
    buffer = io.BytesIO()
    try:
        image.save(buffer, format="WEBP", quality=quality, method=2)
    except Exception:
        return None
    return buffer.getvalue()


def save_as_png(image, colors):
    buffer = io.BytesIO()
    try:
        quantize_method = Image.FASTOCTREE if hasattr(Image, "FASTOCTREE") else None
        if quantize_method is not None:
            quantized = image.convert("RGBA").quantize(colors=colors, method=quantize_method)
        else:
            quantized = image.convert("P", palette=Image.ADAPTIVE, colors=colors)
    except Exception:
        quantized = image.convert("P", palette=Image.ADAPTIVE, colors=colors)
    try:
        quantized.save(buffer, format="PNG", optimize=True, compress_level=7)
    except Exception:
        return None
    return buffer.getvalue()


def resize_image(image, scale):
    if scale >= 0.999:
        return image.copy()

    new_width = max(1, int(round(image.width * scale)))
    new_height = max(1, int(round(image.height * scale)))
    return image.resize((new_width, new_height), RESAMPLE_FILTER)


def convert_for_jpeg(image):
    if image.mode in {"RGB", "L"}:
        return image

    if image_has_alpha(image):
        background = Image.new("RGB", image.size, (255, 255, 255))
        background.paste(image.convert("RGBA"), mask=image.convert("RGBA").getchannel("A"))
        return background

    return image.convert("RGB")


def image_has_alpha(image):
    return "A" in image.getbands() or image.mode in {"LA", "PA"} or "transparency" in image.info


def build_result(file_name, content_type, data, original_bytes, target_bytes, status):
    compressed_bytes = len(data)
    negligible_gain_threshold = int(original_bytes * 0.995)
    if status not in {"already-small-enough", "already-optimized"} and compressed_bytes >= negligible_gain_threshold:
        status = "already-optimized"
        compressed_bytes = len(data)
    reached_target = compressed_bytes <= target_bytes

    if status == "already-small-enough":
        message = (
            f"Súbor už bol menší než zadaný cieľ {format_megabytes(target_bytes)}, "
            "preto ostal bez zmeny."
        )
    elif status == "already-optimized":
        message = (
            f"Súbor sa nepodarilo zmenšiť pod {format_megabytes(target_bytes)} bez toho, "
            "aby výsledok narástol alebo sa zbytočne zhoršil."
        )
    elif reached_target:
        message = (
            f"Súbor sa zmenšil z {format_megabytes(original_bytes)} na {format_megabytes(compressed_bytes)} "
            f"pri cieli {format_megabytes(target_bytes)}."
        )
    else:
        message = (
            f"Súbor sa zmenšil z {format_megabytes(original_bytes)} na {format_megabytes(compressed_bytes)}, "
            f"ale cieľ {format_megabytes(target_bytes)} sa nepodarilo úplne dosiahnuť."
        )

    return CompressionResult(
        file_name=file_name,
        content_type=content_type,
        data=data,
        original_bytes=original_bytes,
        compressed_bytes=compressed_bytes,
        target_bytes=target_bytes,
        status=status,
        reached_target=reached_target,
        message=message,
    )


def get_extension(file_name):
    return Path(file_name).suffix.lower().lstrip(".")


def build_download_name(file_name, output_extension):
    stem = Path(file_name).stem or "subor"
    normalized = unicodedata.normalize("NFKD", stem).encode("ascii", "ignore").decode("ascii")
    normalized = re.sub(r"[^A-Za-z0-9_-]+", "-", normalized).strip("-_") or "subor"
    return f"{normalized}-zmenseny.{output_extension}"


def format_megabytes(size_bytes):
    return f"{size_bytes / (1024 * 1024):.2f} MB"


def ensure_pillow_available():
    if Image is None or ImageOps is None or RESAMPLE_FILTER is None:
        raise RuntimeError("Kompresia obrázkov vyžaduje knižnicu Pillow.")
