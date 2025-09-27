// Clean PDF export module with ASCII-safe arrows and correct Android permissions
// Use require to avoid TS ESM default export mismatch
// eslint-disable-next-line @typescript-eslint/no-var-requires
const RNHTMLtoPDF = require('react-native-html-to-pdf');
import { Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import RNFS from 'react-native-fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import FileSaver from './FileSaver';

export type ExpenseRecord = {
  description: string;
  amount: number;
  paidBy: string;
  splitWith: string[];
  date: string;
  time: string;
  category: string;
};

export type SettlementItem =
  | { text: string; key: string }
  | { key: string; from: string; to: string; amount: number };

export type ExportResult = { filePath: string | undefined; success: boolean; error?: string };

export async function requestStoragePermissionInApp(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const apiLevel = Number(Platform.Version) || 0;
  try {
    if (apiLevel >= 30) {
      const hasPermission = await checkManageExternalStoragePermission();
      if (hasPermission) return true;
      return new Promise((resolve) => {
        Alert.alert(
          'Allow Mates to access photos, media, and files on your device?',
          'This lets you save PDF exports to your Downloads folder where you can easily find and share them.',
          [
            { text: 'Deny', style: 'cancel', onPress: () => resolve(false) },
            {
              text: 'Allow',
              onPress: async () => {
                try {
                  const url = 'android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION';
                  await Linking.sendIntent(url, []);
                  setTimeout(async () => {
                    const granted = await checkManageExternalStoragePermission();
                    resolve(granted);
                  }, 1000);
                } catch (e) {
                  Linking.openSettings();
                  resolve(false);
                }
              },
            },
          ],
          { cancelable: false }
        );
      });
    } else if (apiLevel >= 23) {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
      );
      if (granted) return true;
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        {
          title:
            'Allow Mates to access photos, media, and files on your device?',
          message:
            'This lets you save PDF exports to your Downloads folder where you can easily find and share them.',
          buttonPositive: 'Allow',
          buttonNegative: 'Deny',
        }
      );
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } else {
      return true;
    }
  } catch (error) {
    console.log('Permission request error:', error);
    return false;
  }
}

async function checkManageExternalStoragePermission(): Promise<boolean> {
  try {
    const testFile = `${RNFS.DownloadDirectoryPath}/mates_permission_test.txt`;
    await RNFS.writeFile(testFile, 'test', 'utf8');
    await RNFS.unlink(testFile);
    return true;
  } catch {
    return false;
  }
}

export async function shouldRequestStoragePermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const apiLevel = Number(Platform.Version) || 0;
  if (apiLevel >= 30) return !(await checkManageExternalStoragePermission());
  if (apiLevel >= 23) {
    const granted = await PermissionsAndroid.check(
      PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE
    );
    return !granted;
  }
  return false;
}

export async function exportExpensesToPdf(
  expenses: ExpenseRecord[],
  settlements: SettlementItem[] = []
): Promise<ExportResult> {
  if (!expenses || expenses.length === 0) {
    return { filePath: undefined, success: false, error: 'No expenses to export' };
  }

  const permissionGranted = await requestStoragePermissionInApp();
  if (!permissionGranted) {
    return {
      filePath: undefined,
      success: false,
      error:
        'Storage permission is required to save PDF files to Downloads folder.',
    };
  }

  const total = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const dateStr = new Date().toISOString().slice(0, 10);
  const safeFileName = `ExpenseHistory_${dateStr}`;

  const rows = expenses
    .map((e) => {
      const amountStr = Number(e.amount).toFixed(2);
      const splitText =
        Array.isArray(e.splitWith) && e.splitWith.length > 0
          ? e.splitWith.join(', ')
          : '-';
      return `<tr>
        <td>${e.date || ''}</td>
        <td>${e.category || ''}</td>
        <td style="text-align:right">${amountStr}</td>
        <td>${e.description || ''}</td>
        <td>${e.paidBy || ''}</td>
        <td>${splitText}</td>
      </tr>`;
    })
    .join('');

  const settlementRows = settlements
    .filter((s) => 'from' in s && 'to' in s && 'amount' in s)
    .map((s) => {
      if ('from' in s && 'to' in s && 'amount' in s) {
        return `<tr>
          <td>${s.from}</td>
          <td style="text-align:center">-&gt;</td>
          <td>${s.to}</td>
          <td style="text-align:right">${s.amount.toFixed(2)}</td>
        </tr>`;
      }
      return '';
    })
    .join('');

  const hasSettlements = settlementRows.length > 0;

  const html = `
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        body { font-family: -apple-system, Roboto, Arial, sans-serif; padding: 16px; margin: 0; background: #fff; }
        h1, h2 { font-size: 22px; margin: 0 0 16px 0; color: #333; font-weight: 600; }
        h2 { font-size: 18px; margin-top: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; background: white; border: 2px solid #333; }
        th, td { border: 1px solid #333; padding: 8px 10px; font-size: 11px; word-break: break-word; white-space: normal; vertical-align: top; }
        th { background: #e6e6e6; text-align: left; font-weight: bold; color: #333; border: 1px solid #333; }
        tfoot td { font-weight: bold; background: #f5f5f5; border: 1px solid #333; }
        tbody tr:nth-child(even) { background: #f9f9f9; }
        tbody tr:nth-child(odd) { background: #fff; }
        .settlements-table th { background: #e8f4fd; }
        .settlements-table tbody tr:nth-child(even) { background: #f8fcff; }
        .settlements-table tbody tr:nth-child(odd) { background: #fff; }
      </style>
    </head>
    <body>
      <h1>Expense History (${dateStr})</h1>
      <div style="margin: 10px 0 16px; text-align: center; font-size: 12px;">
        <span style="display:inline-block; padding:6px 10px; border-radius:8px; font-weight:700; color:#2563eb; background:#eaf2ff; border:1px solid #cfe0ff;">This PDF is powered by Bill Buddy</span>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th style="text-align:right">Amount</th>
            <th>Description</th>
            <th>Paid By</th>
            <th>Split With</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2"><strong>Total</strong></td>
            <td style="text-align:right"><strong>${total.toFixed(2)}</strong></td>
            <td colspan="3"></td>
          </tr>
        </tfoot>
      </table>
      ${hasSettlements ? `
      <h2>Recommended Settlements</h2>
      <table class="settlements-table">
        <thead>
          <tr>
            <th>From</th>
            <th style="width:40px; text-align:center"></th>
            <th>To</th>
            <th style="text-align:right">Amount</th>
          </tr>
        </thead>
        <tbody>${settlementRows}</tbody>
      </table>
      ` : '<h2>Settlements</h2><p>No settlements needed at this time.</p>'}
    </body>
    </html>`;

  const optionsPrimary = {
    html,
    fileName: safeFileName,
    directory: Platform.OS === 'android' ? 'Downloads' : 'Documents',
  };

  try {
    if (!RNHTMLtoPDF || typeof (RNHTMLtoPDF as any).convert !== 'function') {
      return await fallbackExportWithPdfLib(expenses, safeFileName, settlements);
    }
    const result = await (RNHTMLtoPDF as any).convert(optionsPrimary);
    if (result?.filePath) return { filePath: result.filePath, success: true };
    const resultFallback = await (RNHTMLtoPDF as any).convert({ html, fileName: safeFileName });
    return {
      filePath: resultFallback?.filePath,
      success: !!resultFallback?.filePath,
      error: resultFallback?.filePath ? undefined : 'Unknown export error',
    };
  } catch (e: any) {
    try {
      const resultFallback = await (RNHTMLtoPDF as any).convert({ html, fileName: safeFileName });
      return {
        filePath: resultFallback?.filePath,
        success: !!resultFallback?.filePath,
        error: resultFallback?.filePath ? undefined : String(e?.message || e),
      };
    } catch (e2: any) {
      const fallback = await fallbackExportWithPdfLib(expenses, safeFileName, settlements);
      return fallback.filePath
        ? fallback
        : { filePath: undefined, success: false, error: String(e2?.message || e2) };
    }
  }
}

async function fallbackExportWithPdfLib(
  expenses: ExpenseRecord[],
  safeFileName: string,
  settlements: SettlementItem[] = []
): Promise<ExportResult> {
  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pageWidth = 595; // A4 width
    const pageHeight = 842; // A4 height
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 40;
    const fontSizeTitle = 18;
    const fontSize = 10;
    const margin = 24;
    const lineHeight = 14;

    page.drawText(`Expense History (${new Date().toISOString().slice(0, 10)})`, {
      x: margin,
      y,
      size: fontSizeTitle,
      font,
      color: rgb(0, 0, 0),
    });
    y -= 16;
    // Credit badge background
    const creditText = 'This PDF is powered by Bill Buddy';
    const creditPaddingX = 8;
    const creditPaddingY = 4;
    const creditTextWidth = font.widthOfTextAtSize(creditText, 10);
    const badgeWidth = creditTextWidth + creditPaddingX * 2;
    const badgeHeight = 14 + creditPaddingY * 2;
    page.drawRectangle({
      x: margin,
      y: y - (badgeHeight - 10),
      width: badgeWidth,
      height: badgeHeight,
      color: rgb(0.92, 0.95, 1), // light blue background
      borderColor: rgb(0.81, 0.88, 1),
      borderWidth: 1,
    });
    page.drawText(creditText, {
      x: margin + creditPaddingX,
      y: y,
      size: 10,
      font,
      color: rgb(0.15, 0.39, 0.92),
    });
    y -= badgeHeight + 4;

    const headers = ['Date', 'Category', 'Amount', 'Description', 'Paid By', 'Split With'];
    const colWidths = [80, 80, 60, 160, 80, 100];

    function wrapText(text: string, maxWidth: number, size: number): string[] {
      const words = String(text || '').split(/\s+/);
      const lines: string[] = [];
      let current = '';
      words.forEach((word) => {
        const test = current ? `${current} ${word}` : word;
        const width = font.widthOfTextAtSize(test, size);
        if (width > maxWidth && current) {
          lines.push(current);
          current = word;
        } else {
          current = test;
        }
      });
      if (current) lines.push(current);
      return lines;
    }

    const drawRow = (cells: string[], bold = false) => {
      let x = margin;
      const size = bold ? 11 : fontSize;
      let rowHeight = lineHeight;
      const wrappedPerCol: string[][] = cells.map((text, idx) =>
        wrapText(String(text ?? ''), colWidths[idx] - 6, size)
      );
      rowHeight = Math.max(...wrappedPerCol.map((lines) => Math.max(lines.length, 1))) * lineHeight;
      if (y - rowHeight < margin) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      cells.forEach((text, idx) => {
        const colWidth = colWidths[idx];
        const wrappedLines = wrappedPerCol[idx];
        page.drawRectangle({
          x: x - 1,
          y: y - rowHeight + 2,
          width: colWidth + 2,
          height: rowHeight,
          borderColor: rgb(0, 0, 0),
          borderWidth: 1,
          color: bold ? rgb(0.9, 0.9, 0.9) : rgb(1, 1, 1),
        });
        let yy = y;
        wrappedLines.forEach((line) => {
          page.drawText(line, { x: x + 4, y: yy - 8, size, font, color: rgb(0, 0, 0) });
          yy -= lineHeight;
        });
        x += colWidth;
      });
      y -= rowHeight;
    };

    drawRow(headers, true);

    let total = 0;
    expenses.forEach((e) => {
      total += Number(e.amount || 0);
      const splitText =
        Array.isArray(e.splitWith) && e.splitWith.length > 0
          ? e.splitWith.join(', ')
          : '-';
      drawRow([
        e.date || '',
        e.category || '',
        Number(e.amount || 0).toFixed(2),
        e.description || '',
        e.paidBy || '',
        splitText,
      ]);
    });

    y -= 6;
    drawRow(['Total', '', total.toFixed(2), '', '', ''], true);

    const settlementPayments = settlements.filter(
      (s) => 'from' in s && 'to' in s && 'amount' in s
    );
    if (settlementPayments.length > 0) {
      y -= 20;
      page.drawText('Recommended Settlements', {
        x: margin,
        y,
        size: 16,
        font,
        color: rgb(0, 0, 0),
      });
      y -= 20;
      const settlementHeaders = ['From', '', 'To', 'Amount'];
      const settlementColWidths = [140, 40, 140, 100];
      const drawSettlementRow = (cells: string[], bold = false) => {
        let x = margin;
        const size = bold ? 11 : fontSize;
        const rowHeight = lineHeight;
        if (y - rowHeight < margin) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          y = pageHeight - margin;
        }
        cells.forEach((text, idx) => {
          const colWidth = settlementColWidths[idx];
          page.drawRectangle({
            x: x - 1,
            y: y - rowHeight + 2,
            width: colWidth + 2,
            height: rowHeight,
            borderColor: rgb(0, 0, 0),
            borderWidth: 1,
            color: bold ? rgb(0.9, 0.9, 0.9) : rgb(1, 1, 1),
          });
          page.drawText(String(text || ''), {
            x: x + 4,
            y: y - 8,
            size,
            font,
            color: rgb(0, 0, 0),
          });
          x += colWidth;
        });
        y -= rowHeight;
      };

      drawSettlementRow(settlementHeaders, true);
      settlementPayments.forEach((s) => {
        if ('from' in s && 'to' in s && 'amount' in s) {
          drawSettlementRow([s.from, '->', s.to, s.amount.toFixed(2)]);
        }
      });
    } else {
      y -= 20;
      page.drawText('Settlements', { x: margin, y, size: 16, font, color: rgb(0, 0, 0) });
      y -= 16;
      page.drawText('No settlements needed at this time.', {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    // Credit at top below title area
    // Move cursor back near top for the credit line only when first page
    // Draw this right after the title, but since we already advanced, we will keep future docs drawing at top in HTML path.

    const base64 = await pdfDoc.saveAsBase64({ dataUri: false });
    const fileName = `${safeFileName}.pdf`;
    if (Platform.OS === 'android') {
      try {
        const result = await FileSaver.savePdfToDownloads(fileName, base64);
        if (result.success) return { filePath: result.filePath, success: true };
        throw new Error('Native FileSaver failed');
      } catch (nativeError) {
        try {
          const publicPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
          await RNFS.writeFile(publicPath, base64, 'base64');
          return { filePath: publicPath, success: true };
        } catch (rnfsError) {
          return {
            filePath: undefined,
            success: false,
            error: `Both native and RNFS failed: ${String(nativeError)} | ${String(
              rnfsError
            )}`,
          };
        }
      }
    } else {
      const dir = RNFS.DocumentDirectoryPath;
      const filePath = `${dir}/${fileName}`;
      await RNFS.writeFile(filePath, base64, 'base64');
      return { filePath, success: true };
    }
  } catch (err: any) {
    return { filePath: undefined, success: false, error: String(err?.message || err) };
  }
}
