declare module 'react-native-bluetooth-escpos-printer' {
    export interface PrinterOptions {
        encoding?: string;
        codepage?: number;
        widthtimes?: number;
        heighttimes?: number;
        fonttype?: number;
    }

    export class BluetoothEscposPrinter {
        static ALIGN: {
            LEFT: number;
            CENTER: number;
            RIGHT: number;
        };
        static BARCODETYPE: {
            UPCA: number;
            UPCE: number;
            JAN13: number;
            JAN8: number;
            CODE39: number;
            ITF: number;
            CODABAR: number;
            CODE93: number;
            CODE128: number;
        };
        static printerInit(): Promise<void>;
        static printerLeftSpace(space: number): Promise<void>;
        static printerLineSpace(space: number): Promise<void>;
        static printerUnderLine(line: number): Promise<void>;
        static printerAlign(align: number): Promise<void>;
        static printText(text: string, options: PrinterOptions): Promise<void>;
        static printColumn(
            columnWidths: number[],
            columnAligns: number[],
            columnTexts: string[],
            options: any
        ): Promise<void>;
        static printBarCode(
            str: string,
            nType: number,
            nWidthX: number,
            nHeightFont: number,
            nHRIFontType: number,
            nHRIFontPosition: number
        ): Promise<void>;
        static printQRCode(
            content: string,
            size: number,
            correctionLevel: number
        ): Promise<void>;
        static printPic(base64encodeStr: string, options: any): Promise<void>;
    }

    export class BluetoothManager {
        static isBluetoothEnabled(): Promise<boolean>;
        static enableBluetooth(): Promise<string[] | null>;
        static disableBluetooth(): Promise<void>;
        static scanDevices(): Promise<string>;
        static connect(address: string): Promise<void>;
        static disconnect(address: string): Promise<void>;
    }

    export class BluetoothTscPrinter {
        // Tambahkan jika Anda menggunakan fitur label TSC
    }
}