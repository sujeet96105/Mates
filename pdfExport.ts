export { 
  requestStoragePermissionInApp,
  shouldRequestStoragePermission,
  exportExpensesToPdf
} from './pdfExport_clean';

/*
type SettlementItem = { text: string; key: string } | { key: string; from: string; to: string; amount: number };

type ExportResult = { filePath: string | undefined; success: boolean; error?: string };

// WhatsApp-style in-app permission system
{{ ... }}
*/
/*
export async function requestStoragePermissionInApp(): Promise<boolean> {
    if (Platform.OS !== 'android') {
        return true;
    }

    const apiLevel = Number(Platform.Version) || 0;

    try {
        // Android 11+ (API 30+) - Request MANAGE_EXTERNAL_STORAGE
        if (apiLevel >= 30) {
            const hasPermission = await checkManageExternalStoragePermission();
            if (hasPermission) {
                return true;
            }

            // Show WhatsApp-style permission dialog
            return new Promise((resolve) => {
                Alert.alert(
                    'Allow Mates to access photos, media, and files on your device?',
                    'This lets you save PDF exports to your Downloads folder where you can easily find and share them.',
                    [
                        { 
                            text: 'Deny', 
                            style: 'cancel', 
                            onPress: () => resolve(false) 
                        { 
                            text: 'Allow', 
                            onPress: async () => {
                                try {
                                    // Open the specific MANAGE_ALL_FILES_ACCESS_PERMISSION intent
                                    const url = 'android.settings.MANAGE_ALL_FILES_ACCESS_PERMISSION';
                                    await Linking.sendIntent(url, []);
                                    
                                    // Give user time to enable permission, then check
                                    setTimeout(async () => {
                                        const granted = await checkManageExternalStoragePermission();
                                        resolve(granted);
                                    }, 1000);
                                } catch (error) {
                                    console.log('Failed to open All Files Access:', error);
                                    // Fallback to general settings
                                    Linking.openSettings();
                                    resolve(false);
                                }
                            }
                        },
                    ],
                    { cancelable: false }
                );
            });
        }
        // Android 10 (API 29) - Request WRITE_EXTERNAL_STORAGE
        else if (apiLevel >= 23) {
            const granted = await PermissionsAndroid.check(PermissionsAndroid.permissionS.WRITE_EXTERNAL_STORAGE);
            if (granted) {
                return true;
            }

            const result = await PermissionsAndroid.request(
                PermissionsAndroid.permissionS.WRITE_EXTERNAL_STORAGE,
                {
                    title: 'Allow Mates to access photos, media, and files on your device?',
                    message: 'This lets you save PDF exports to your Downloads folder where you can easily find and share them.',
                    buttonPositive: 'Allow',
                    buttonNegative: 'Deny',
                }
            );
            
            return result === PermissionsAndroid.RESULTS.GRANTED;
        }
        // Android 22 and below - Permissions granted at install time
        else {
            return true;
        }
    } catch (error) {
        console.log('Permission request error:', error);
    }
}
		.map(s => {
			if ('from' in s && 'to' in s && 'amount' in s) {
				return `<tr>
						<td>${s.from}</td>
						<td style="text-align:center">-&gt;</td>
						<td>${s.to}</td>
						<td style=\"text-align:right\">${s.amount.toFixed(2)}</td>
					</tr>`;
			}
			return '';
		})
		.join('');
	const hasSettlements = settlementRows.length > 0;
{{ ... }}
		<div style="margin: 10px 0 16px; text-align: center; color: #666; font-size: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
			This PDF is powered by Bill Buddy
		</div>
		<h1>Expense History (${dateStr})</h1>

	const html = `
		<html>
		<head>
			<meta charset="utf-8" />
			<style>
				body { 
					font-family: -apple-system, Roboto, Arial, sans-serif; 
					padding: 16px; 
					margin: 0;
					background: #fff;
				}
				h1, h2 { 
					font-size: 22px; 
					margin: 0 0 16px 0; 
					color: #333;
					font-weight: 600;
				}
				h2 {
					font-size: 18px;
					margin-top: 24px;
				}
				table { 
					width: 100%; 
					border-collapse: collapse; 
					margin-bottom: 16px;
					background: white;
					border: 2px solid #333;
				}
				th, td { 
					border: 1px solid #333; 
					padding: 8px 10px; 
					font-size: 11px; 
					word-break: break-word; 
					white-space: normal;
					vertical-align: top;
				}
				th { 
					background: #e6e6e6; 
					text-align: left; 
					font-weight: bold;
					color: #333;
					border: 1px solid #333;
				}
				tfoot td { 
					font-weight: bold; 
					background: #f5f5f5;
					border: 1px solid #333;
				}
				tbody tr:nth-child(even) {
					background: #f9f9f9;
				}
				tbody tr:nth-child(odd) {
					background: #fff;
				}
				.settlements-table th {
					background: #e8f4fd;
				}
				.settlements-table tbody tr:nth-child(even) {
					background: #f8fcff;
				}
				.settlements-table tbody tr:nth-child(odd) {
					background: #fff;
				}
			</style>
		</head>
		<body>
			<h1>Expense History (${dateStr})</h1>
			<div style="margin: 10px 0 16px; text-align: center; color: #666; font-size: 12px; border-bottom: 1px solid #eee; padding-bottom: 8px;">
				This PDF is powered by Bill Buddy
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
				<tbody>
					${rows}
				</tbody>
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
						<th>For</th>
						<th>To</th>
						<th style="text-align:right">Amount</th>
					</tr>
				</thead>
				<tbody>
					${settlementRows}
				</tbody>
			</table>
			` : '<h2>Settlements</h2><p>No settlements needed at this time.</p>'}
		</body>
		</html>
	`;

 const optionsPrimary = {
	html,
	fileName: safeFileName,
	// Use correct public directory name on Android
	directory: Platform.OS === 'android' ? 'Downloads' : 'Documents',
 };

  try {
 	if (!RNHTMLtoPDF || typeof (RNHTMLtoPDF as any).convert !== 'function') {
			// Fallback to pure-JS PDF generation
			const fallback = await fallbackExportWithPdfLib(expenses, safeFileName, settlements);
			return fallback;
 	}
 	const result = await (RNHTMLtoPDF as any).convert(optionsPrimary);
		if (result?.filePath) {
			return { filePath: result.filePath, success: true };
 	}
 	// fallback attempt without directory hint
		const resultFallback = await (RNHTMLtoPDF as any).convert({ html, fileName: safeFileName });
		return { filePath: resultFallback?.filePath, success: !!resultFallback?.filePath, error: resultFallback?.filePath ? undefined : 'Unknown export error' };
 } catch (e: any) {
 		try {
			const resultFallback = await (RNHTMLtoPDF as any).convert({ html, fileName: safeFileName });
			return { filePath: resultFallback?.filePath, success: !!resultFallback?.filePath, error: resultFallback?.filePath ? undefined : String(e?.message || e) };
		} catch (e2: any) {
			// Final fallback
			const fallback = await fallbackExportWithPdfLib(expenses, safeFileName, settlements);
			return fallback.filePath ? fallback : { filePath: undefined, success: false, error: String(e2?.message || e2) };
 	}
 }

async function fallbackExportWithPdfLib(expenses: ExpenseRecord[], safeFileName: string, settlements: SettlementItem[] = []): Promise<ExportResult>
{
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

		page.drawText(`Expense History (${new Date().toISOString().slice(0,10)})`, {
			x: margin,
			y,
			size: fontSizeTitle,
			font,
			color: rgb(0, 0, 0),
		});
		y -= 24;

		const headers = ['Date','Category','Amount','Description','Paid By','Split With'];
		const colWidths = [80, 80, 60, 160, 80, 100];
		function wrapText(text: string, maxWidth: number, size: number): string[] {
			const words = String(text || '').split(/\s+/);
			const lines: string[] = [];
			let current = '';
			words.forEach(word => {
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
			const wrappedPerCol: string[][] = cells.map((text, idx) => wrapText(String(text ?? ''), colWidths[idx] - 6, size));
			rowHeight = Math.max(...wrappedPerCol.map(lines => Math.max(lines.length, 1))) * lineHeight;
			// Page break if needed
			if (y - rowHeight < margin) {
				page = pdfDoc.addPage([pageWidth, pageHeight]);
				y = pageHeight - margin;
			}
			
			// Draw cell borders and content
			cells.forEach((text, idx) => {
				const colWidth = colWidths[idx];
				const wrappedLines = wrappedPerCol[idx];
				
				// Draw cell border
				page.drawRectangle({
					x: x - 1,
					y: y - rowHeight + 2,
					width: colWidth + 2,
					height: rowHeight,
					borderColor: rgb(0, 0, 0),
					borderWidth: 1,
					color: bold ? rgb(0.9, 0.9, 0.9) : (cells.indexOf(text) % 2 === 0 ? rgb(0.98, 0.98, 0.98) : rgb(1, 1, 1)),
				});
				
				// Draw text lines
				let yy = y;
				wrappedLines.forEach(line => {
					page.drawText(line, { x: x + 4, y: yy - 8, size, font, color: rgb(0,0,0) });
					yy -= lineHeight;
				});
				
				x += colWidth;
			});
			y -= rowHeight;
		};

		// Header
		drawRow(headers, true);

		let total = 0;
		expenses.forEach(e => {
			total += Number(e.amount || 0);
			const splitText = Array.isArray(e.splitWith) && e.splitWith.length > 0 ? e.splitWith.join(', ') : '-';
			drawRow([
				e.date || '',
				e.category || '',
				Number(e.amount || 0).toFixed(2),
				e.description || '',
				e.paidBy || '',
				splitText,
			]);
		});

		// Total
		y -= 6;
		drawRow(['Total','', total.toFixed(2), '', '', ''], true);

		// Add settlements section if available
		const settlementPayments = settlements.filter(s => 'from' in s && 'to' in s && 'amount' in s);
		if (settlementPayments.length > 0) {
			y -= 20; // Space before settlements
			
			// Settlements title
			page.drawText('Recommended Settlements', {
				x: margin,
				y,
				size: 16,
				font,
				color: rgb(0, 0, 0),
			});
			y -= 20;

			// Settlements table headers
			const settlementHeaders = ['From', 'For', 'To', 'Amount'];
			const settlementColWidths = [140, 40, 140, 100];
			
			const drawSettlementRow = (cells: string[], bold = false) => {
				let x = margin;
				const size = bold ? 11 : fontSize;
				const rowHeight = lineHeight;
{{ ... }}
			};

			// Draw settlements header
			drawSettlementRow(settlementHeaders, true);

			// Draw settlement payments
			settlementPayments.forEach(s => {
				if ('from' in s && 'to' in s && 'amount' in s) {
					drawSettlementRow([
						s.from,
						'->',
						s.to,
						s.amount.toFixed(2)
					]);
				}
			});
		} else {
			// Show "no settlements needed" message
			y -= 20;
			page.drawText('Settlements', {
				x: margin,
				size: 16,
				font,
				color: rgb(0, 0, 0),
			});
			y -= 16;
			page.drawText('No settlements needed at this time.', {
				x: margin,
				y,
				size: fontSize,
				font,
				color: rgb(0.3, 0.3, 0.3),
			});
		}
		
		// Add "This PDF is powered by Bill Buddy" credit
		y -= 30;
		page.drawText('This PDF is powered by Bill Buddy', {
			x: pageWidth / 2 - 80,
			y,
			size: 10,
			font,
			color: rgb(0.4, 0.4, 0.4),
		});

		const base64 = await pdfDoc.saveAsBase64({ dataUri: false });
		// Prefer public Downloads so user can find the file easily
        const fileName = `${safeFileName}.pdf`;
        
        if (Platform.OS === 'android') {
            try {
                // Use our native MediaStore module for Android
                const result = await FileSaver.savePdfToDownloads(fileName, base64);
                if (result.success) {
                    return { filePath: result.filePath, success: true };
                } else {
                    throw new Error('Native FileSaver failed');
                }
            } catch (nativeError) {
                console.log('Native FileSaver failed, trying RNFS fallback:', nativeError);
                // Fallback to RNFS for older Android versions or if native module fails
                try {
                    const publicPath = `${RNFS.DownloadDirectoryPath}/${fileName}`;
                    await RNFS.writeFile(publicPath, base64, 'base64');
                    return { filePath: publicPath, success: true };
                } catch (rnfsError) {
                    return { filePath: undefined, success: false, error: `Both native and RNFS failed: ${String(nativeError)} | ${String(rnfsError)}` };
                }
            }
        } else {
            // iOS - save to Documents directory
            const dir = RNFS.DocumentDirectoryPath;
            const filePath = `${dir}/${fileName}`;
            await RNFS.writeFile(filePath, base64, 'base64');
            return { filePath, success: true };
        }
	} catch (err: any) {
		return { filePath: undefined, success: false, error: String(err?.message || err) };
	}
}
}

*/
