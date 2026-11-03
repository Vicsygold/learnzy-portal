import PDFDocument from "pdfkit";

type PdfLine = { label: string; value: string };

export function createPdf(title: string, lines: PdfLine[], table?: string[][]): Promise<Buffer> {
  return new Promise((resolve) => {
    const document = new PDFDocument({ size: "A4", margin: 48 });
    const chunks: Buffer[] = [];
    document.on("data", (chunk: Buffer) => chunks.push(chunk));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.fontSize(20).fillColor("#176b5b").text(title);
    document.moveDown(0.7);
    for (const line of lines) {
      document.fontSize(10).fillColor("#52627a").text(line.label);
      document.fontSize(13).fillColor("#17243b").text(line.value);
      document.moveDown(0.35);
    }
    if (table?.length) {
      document.moveDown(0.5);
      for (const row of table) {
        document.fontSize(10).fillColor("#17243b").text(row.join("    "));
        document.moveDown(0.25);
      }
    }
    document.end();
  });
}
