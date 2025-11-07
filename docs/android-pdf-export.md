# Android PDF Export: Play Console-Compliant Storage

This app removes legacy storage permissions and uses modern Android APIs:

- No MANAGE_EXTERNAL_STORAGE
- No WRITE_EXTERNAL_STORAGE / READ_EXTERNAL_STORAGE
- Uses Storage Access Framework (user picker) and MediaStore Downloads (auto-save)
- Requests POST_NOTIFICATIONS at runtime on Android 13+

## Why remove MANAGE_EXTERNAL_STORAGE?
Play Console requires a high-justification declaration for All Files Access. Our use case (exporting a PDF) does not require it. MediaStore and SAF fully cover PDF saving without broad access.

## How saving works
- Save with picker (SAF): Prompts user for a location.
- Save to Downloads (MediaStore): Inserts into the system Downloads collection without storage permissions (Android 10+).

## JS usage
```ts
import { savePdfWithPicker, savePdfToDownloads } from '@/native/PdfSaver';

await savePdfWithPicker(base64Pdf, 'bill-buddy-report.pdf');
await savePdfToDownloads(base64Pdf, 'bill-buddy-report.pdf');
```

## Native module
- Package: `com.billbuddy.app.pdf`
- Files:
  - `android/app/src/main/java/com/billbuddy/app/pdf/PdfSaverModule.kt`
  - `android/app/src/main/java/com/billbuddy/app/pdf/PdfSaverPackage.kt`
- Registered in `MainApplication.kt`.

## Notification permission (Android 13+)
Runtime request via `PermissionsAndroid` for `POST_NOTIFICATIONS` when `Platform.Version >= 33`.

## ProGuard
```
-keep class com.billbuddy.app.pdf.** { *; }
```

## Testing
In development (`__DEV__`), two temporary buttons are available in Expenses screen:
- Save PDF (Picker)
- Save to Downloads

Both log the resulting content Uri for verification.
