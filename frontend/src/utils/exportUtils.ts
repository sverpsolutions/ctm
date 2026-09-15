/**
 * Dynamic on-demand export helpers for Excel (.xlsx) and PDF (.pdf)
 * Uses dynamic imports to keep initial bundle size minimal and prevent CommonJS loading issues.
 */

export async function exportDataToExcel(
  data: Record<string, any>[],
  sheetName: string,
  fileName: string
): Promise<void> {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}

export async function exportDataToPdf(
  title: string,
  headers: string[],
  rows: (string | number)[][],
  fileName: string,
  headerColor: [number, number, number] = [79, 70, 229]
): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF('landscape');
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 28,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: headerColor },
  });

  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
