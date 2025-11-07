import { NativeModules } from 'react-native';

type PdfSaverNative = {
  createDocumentAndWrite(base64Pdf: string, filename: string): Promise<string>;
  saveToDownloads(base64Pdf: string, filename: string): Promise<string>;
  openPdfUri(uriString: string): Promise<boolean>;
};

function getPdfSaver(): PdfSaverNative {
  const mod = (NativeModules as any).PdfSaver as PdfSaverNative | undefined;
  if (!mod) {
    throw new Error('PdfSaver native module not linked. Make sure the Android package is registered and the app is rebuilt.');
  }
  return mod;
}

export async function savePdfWithPicker(base64Pdf: string, filename = 'bill-buddy-report.pdf'): Promise<string> {
  if (typeof base64Pdf !== 'string' || base64Pdf.length === 0) throw new Error('base64Pdf must be a non-empty base64 string');
  if (typeof filename !== 'string' || !filename.endsWith('.pdf')) throw new Error('filename must be a .pdf file name');
  return getPdfSaver().createDocumentAndWrite(base64Pdf, filename);
}

export async function savePdfToDownloads(base64Pdf: string, filename = 'bill-buddy-report.pdf'): Promise<string> {
  if (typeof base64Pdf !== 'string' || base64Pdf.length === 0) throw new Error('base64Pdf must be a non-empty base64 string');
  if (typeof filename !== 'string' || !filename.endsWith('.pdf')) throw new Error('filename must be a .pdf file name');
  return getPdfSaver().saveToDownloads(base64Pdf, filename);
}

export async function openPdfUri(uri: string): Promise<boolean> {
  if (typeof uri !== 'string' || uri.length === 0) throw new Error('uri must be a non-empty string');
  return getPdfSaver().openPdfUri(uri);
}
