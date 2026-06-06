export function getReadableTextColor(backgroundColor?: string) {
  const rgb = parseHexColor(backgroundColor);
  if (!rgb) return "white";

  const [red, green, blue] = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.03928
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  return luminance > 0.75 ? "#1f2937" : "white";
}

function parseHexColor(color?: string): [number, number, number] | null {
  if (!color) return null;
  const normalized = color.trim().replace(/^#/, "");

  if (/^[0-9a-fA-F]{3}$/.test(normalized)) {
    return normalized.split("").map((digit) =>
      Number.parseInt(`${digit}${digit}`, 16),
    ) as [number, number, number];
  }

  if (/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return [
      Number.parseInt(normalized.slice(0, 2), 16),
      Number.parseInt(normalized.slice(2, 4), 16),
      Number.parseInt(normalized.slice(4, 6), 16),
    ];
  }

  return null;
}
