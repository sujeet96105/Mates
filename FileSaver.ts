import { NativeModules } from 'react-native';

interface FileSaverInterface {
  savePdfToDownloads(fileName: string, base64Data: string): Promise<{
    filePath: string;
    uri: string;
    success: boolean;
    message: string;
  }>;
  checkStoragePermission(): Promise<boolean>;
}

const { FileSaver } = NativeModules;

export default FileSaver as FileSaverInterface;
