export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Load the Node-only PDF.js runtime only when an upload is processed. This
  // prevents native canvas dependencies from being evaluated while Next.js
  // builds the route module.
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: buffer });

  try {
    const data = await parser.getText();
    return data.text || '';
  } finally {
    await parser.destroy();
  }
}
