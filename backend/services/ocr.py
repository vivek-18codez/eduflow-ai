import easyocr

# Load the OCR model once when the server starts
reader = easyocr.Reader(['en'])


def extract_text(image_path):
    """
    Extract text from an image using EasyOCR.

    EasyOCR detects text in small chunks (sometimes a full line,
    sometimes a single word) and doesn't know which chunks belong
    on the same line. This groups detections by their vertical
    position so words that are roughly at the same height are
    joined into one line (left to right), instead of every
    detected chunk being dumped on its own line.
    """

    results = reader.readtext(image_path)

    if not results:
        return ""

    items = []
    heights = []

    for bbox, text, confidence in results:
        y_coords = [point[1] for point in bbox]
        x_coords = [point[0] for point in bbox]

        y_center = (min(y_coords) + max(y_coords)) / 2
        height = max(y_coords) - min(y_coords)
        x_left = min(x_coords)

        items.append({"y": y_center, "x": x_left, "text": text})
        heights.append(height)

    # Use the median detected text height to decide how close two
    # detections need to be vertically to count as the same line.
    heights.sort()
    median_height = heights[len(heights) // 2] if heights else 20
    line_threshold = max(median_height * 0.6, 8)

    # Process top-to-bottom
    items.sort(key=lambda item: item["y"])

    lines = []
    current_line = []
    current_line_y = None

    for item in items:
        if (
            current_line_y is None
            or abs(item["y"] - current_line_y) <= line_threshold
        ):
            current_line.append(item)
            if current_line_y is None:
                current_line_y = item["y"]
        else:
            # Finish the previous line, sorted left-to-right
            current_line.sort(key=lambda i: i["x"])
            lines.append(" ".join(i["text"] for i in current_line))

            current_line = [item]
            current_line_y = item["y"]

    if current_line:
        current_line.sort(key=lambda i: i["x"])
        lines.append(" ".join(i["text"] for i in current_line))

    return "\n".join(lines)