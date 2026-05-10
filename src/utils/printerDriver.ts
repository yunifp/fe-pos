// utils/printerDriver.ts

import { Platform, Alert } from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- GENERATOR HTML (SUMBER KEBENARAN TAMPILAN) ---
export const generateReceiptHTML = (data: any) => {
    const { order, receiptSetting, earnedPoints = 0, redeemedPoints = 0 } = data;
    const paperWidth = receiptSetting.paperWidth === 58 ? '58mm' : '80mm';
    const baseSizeVal = receiptSetting.fontSize === 'LARGE' ? 14 : receiptSetting.fontSize === 'SMALL' ? 10 : 12;
    const fontSizeBody = `${baseSizeVal}px`;
    const fontSizeSmall = `${baseSizeVal - 2}px`;
    const fontSizeTitle = `${baseSizeVal + 4}px`;
    const lineSpacing = receiptSetting.compactMode ? '1.1' : '1.3';
    const separatorMargin = receiptSetting.compactMode ? '5px' : '10px';
    const itemMargin = receiptSetting.compactMode ? '2px' : '5px';

    const itemsHtml = order.items.map((item: any) => `
        <div style="margin-bottom: ${itemMargin}; border-bottom: 0px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <span style="flex: 1; font-weight: bold; font-size: ${fontSizeBody}; color: #000;">${item.variant.product.name}</span>
                <span style="width: 30px; text-align: right; font-size: ${fontSizeBody}; color: #000;">${item.quantity}</span>
                <span style="width: 80px; text-align: right; font-size: ${fontSizeBody}; color: #000;">${Number(item.subtotal).toLocaleString('id-ID')}</span>
            </div>
            ${receiptSetting.showItemSku && item.variant.sku ? `<div style="font-size: ${fontSizeSmall}; color: #000;">SKU: ${item.variant.sku}</div>` : ''}
            ${receiptSetting.showVariantName ? `<div style="font-size: ${fontSizeSmall}; color: #000; margin-left: 0px; font-style: italic;">• ${item.variant.name}</div>` : ''}
            ${receiptSetting.showItemNotes && item.notes ? `<div style="font-size: ${fontSizeSmall}; color: #000; margin-left: 0px;">Catatan: ${item.notes}</div>` : ''}
            ${receiptSetting.showItemDiscount && Number(item.discount) > 0 ? `<div style="font-size: ${fontSizeSmall}; color: #000; margin-left: 0px;">Disc: -${Number(item.discount).toLocaleString('id-ID')}</div>` : ''}
        </div>
    `).join('');

    const promosHtml = order.appliedPromotions ? order.appliedPromotions.map((p: any) => `
        <div style="display: flex; justify-content: space-between; font-size: ${fontSizeSmall}; margin-bottom: 2px; color: #000;">
            <span>${p.promotion.name}</span>
            <span>-${Number(p.discountAmount).toLocaleString('id-ID')}</span>
        </div>
    `).join('') : '';

    const logoHtml = receiptSetting.logoUrl
        ? `<img src="${receiptSetting.logoUrl}" style="width: ${receiptSetting.logoSize || 80}px; height: auto; max-width: 100%; margin-bottom: 10px; ${receiptSetting.grayscaleLogo ? 'filter: grayscale(100%);' : ''}" />`
        : `<div class="logo-placeholder">LOGO</div>`;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
        <style>
            @page { size: ${paperWidth} auto; margin: 0; }
            @media print { body { width: ${paperWidth}; margin: 0; padding: 0; } header, footer { display: none !important; } }
            body { width: ${paperWidth}; margin: 0 auto; padding: 10px; font-family: 'Courier New', Courier, monospace; font-size: ${fontSizeBody}; color: #000; line-height: ${lineSpacing}; background-color: #fff; }
            .text-center { text-align: center; } .text-right { text-align: right; } .bold { font-weight: bold; } .uppercase { text-transform: uppercase; }
            .dashed-line { border-top: 1px dashed #000; margin: ${separatorMargin} 0; height: 1px; width: 100%; display: block; }
            .header-info { font-size: ${fontSizeSmall}; margin-top: 5px; color: #000; }
            .barcode-container { margin-top: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
            #qrcode { display: block; } #qrcode img { margin: 0 auto; }
            .logo-placeholder { width: ${receiptSetting.logoSize || 80}px; height: ${receiptSetting.logoSize || 80}px; border: 1px solid #000; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; color: #000; margin-bottom: 10px; ${receiptSetting.grayscaleLogo ? 'background: #eee;' : 'background: #fff;'} }
        </style>
    </head>
    <body>
        <div class="text-center">
            ${receiptSetting.showLogo ? logoHtml : ''}
            <div style="font-size: ${fontSizeTitle};" class="bold uppercase">${receiptSetting.storeName || order.branch.name}</div>
            <div class="header-info">${receiptSetting.headerAddress}<br/><div style="margin-top: 2px;"><span class="bold">Telp: ${receiptSetting.headerPhone}</span><br/><span>${receiptSetting.headerEmail ? `Email: ${receiptSetting.headerEmail}` : ''}</span></div>${receiptSetting.headerWebsite ? `<div>${receiptSetting.headerWebsite}</div>` : ''}${receiptSetting.headerTaxId ? `<div>NPWP: ${receiptSetting.headerTaxId}</div>` : ''}</div>
        </div>
        <div class="dashed-line"></div>
        <div style="display: flex; justify-content: space-between; font-size: ${fontSizeSmall};"><span>${new Date(order.createdAt).toLocaleDateString('id-ID')} ${new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span><span class="bold">${order.invoiceNumber}</span></div>
        <div style="font-size: ${fontSizeSmall}; margin-top: 2px;">${receiptSetting.showOrderType ? `<div>Tipe: <span class="bold">${order.orderType}</span></div>` : ''}${receiptSetting.showTableNumber && order.notes ? `<div>Meja: <span class="bold">${order.notes}</span></div>` : ''}${receiptSetting.showCashierName ? `<div>Kasir: <span class="bold">${order.cashier.fullName}</span></div>` : ''}${receiptSetting.showCustomerName && order.customerName ? `<div>Pelanggan: <span style="font-style: italic;">${order.customerName}</span></div>` : ''}</div>
        <div class="dashed-line"></div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; font-size: ${fontSizeSmall}; text-transform: uppercase;"><span style="flex: 1;">ITEM</span><span style="width: 30px; text-align: right;">QTY</span><span style="width: 80px; text-align: right;">TOTAL</span></div>
        ${itemsHtml}
        <div class="dashed-line"></div>
        <div style="display: flex; justify-content: space-between; font-size: ${fontSizeSmall}; margin-bottom: 2px;"><span>Subtotal</span><span style="font-weight: bold;">${Number(order.subtotal).toLocaleString('id-ID')}</span></div>
        ${promosHtml}
        ${order.redeemedPoints > 0 ? `<div style="display: flex; justify-content: space-between; font-size: ${fontSizeSmall}; margin-bottom: 2px;"><span>Tukar Poin</span><span>-${order.redeemedPoints} Pts</span></div>` : ''}
        ${Number(order.tax) > 0 ? `<div style="display: flex; justify-content: space-between; font-size: ${fontSizeSmall};"><span>Pajak</span><span>${Number(order.tax).toLocaleString('id-ID')}</span></div>` : ''}
        ${Number(order.serviceCharge) > 0 ? `<div style="display: flex; justify-content: space-between; font-size: ${fontSizeSmall};"><span>Service</span><span>${Number(order.serviceCharge).toLocaleString('id-ID')}</span></div>` : ''}
        <div style="display: flex; justify-content: space-between; margin-top: 8px; font-size: ${fontSizeBody};" class="bold"><span class="uppercase">TOTAL</span><span>${Number(order.totalAmount).toLocaleString('id-ID')}</span></div>
        <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: ${fontSizeSmall};"><span>Metode: ${order.paymentMethod}</span><span>Bayar: ${Number(order.totalAmount).toLocaleString('id-ID')}</span></div>
        ${(receiptSetting.showPointsEarned && order.memberId && order.earnedPoints > 0) ? `<div style="margin-top: 8px; border: 1px dashed #000; padding: 5px; text-align: center;"><div style="font-size: ${fontSizeSmall};">Member: ${order.member?.name || 'Pelanggan'}</div><div style="font-size: ${fontSizeBody}; font-weight: bold;">Poin Didapat: +${order.earnedPoints}</div><div style="font-size: ${fontSizeSmall}; font-style: italic;">Total Poin: ${order.member?.points}</div></div>` : ''}
        <div class="dashed-line"></div>
        <div class="text-center" style="margin-top: 10px;"><div style="font-style: italic; white-space: pre-line; font-size: ${fontSizeSmall};">${receiptSetting.footerMessage || 'Terima Kasih'}</div>${receiptSetting.isRefundPolicy ? `<div style="font-size: ${Number(fontSizeSmall.replace('px', '')) - 2}px; margin-top: 10px; color: #000;">${receiptSetting.isRefundPolicy}</div>` : ''}${receiptSetting.showBarcode ? `<div class="barcode-container"><div id="qrcode"></div><div style="font-size: 8px; margin-top: 5px; letter-spacing: 1px; font-weight: bold;">SCAN UNTUK STRUK DIGITAL</div></div>` : ''}</div>
        <script>window.onload = function() { var container = document.getElementById("qrcode"); if (container && typeof QRCode !== 'undefined') { container.innerHTML = ""; new QRCode(container, { text: "https://eps.andisurandi.online/receipt/${order.invoiceNumber}", width: 128, height: 128, colorDark : "#000000", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H }); } };</script>
    </body>
    </html>`;
};

// --- FUNGSI EKSEKUSI PRINT (Web & Android) ---
export const executePrint = async (data: any, htmlContent: string) => {
    const { order, receiptSetting, earnedPoints = 0, redeemedPoints = 0 } = data;

    if (Platform.OS === 'web') {
        const frameId = 'print-iframe-temp';
        let iframe = document.getElementById(frameId) as HTMLIFrameElement;
        if (!iframe) {
            iframe = document.createElement('iframe');
            iframe.id = frameId;
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = 'none';
            document.body.appendChild(iframe);
        }
        const pri = iframe.contentWindow;
        if (pri) {
            let isPrinted = false;
            const triggerPrint = () => {
                if (!isPrinted) {
                    isPrinted = true;
                    pri.focus();
                    pri.print();
                }
            };
            pri.document.open();
            pri.document.write(htmlContent);
            pri.document.close();
            iframe.onload = () => setTimeout(triggerPrint, 500);
            setTimeout(() => triggerPrint(), 2000);
        }
        return;
    }

    if (Platform.OS === 'android') {
        try {
            const { BluetoothEscposPrinter, BluetoothManager } = require('react-native-bluetooth-escpos-printer');

            const savedPrintersRaw = await AsyncStorage.getItem('SAVED_PRINTERS');
            let printersToPrint = [];

            if (savedPrintersRaw) {
                printersToPrint = JSON.parse(savedPrintersRaw).filter((p: any) => p.isActive);
            } else {
                const lastMac = await AsyncStorage.getItem('LAST_PRINTER_MAC');
                if (lastMac) printersToPrint = [{ address: lastMac, name: 'Default' }];
            }

            if (printersToPrint.length === 0) {
                Alert.alert("Printer Tidak Ditemukan", "Harap hubungkan printer di Pengaturan.");
                return;
            }

            const isEnabled = await BluetoothManager.isBluetoothEnabled();
            if (!isEnabled) {
                Alert.alert("Bluetooth Mati", "Harap aktifkan Bluetooth HP Anda.");
                return;
            }

            // --- TAHAP 1: SIAPKAN LOGO (BASE64) DI AWAL (Mencegah Delay Cetak) ---
            let readyBase64Logo = "";
            if (receiptSetting.showLogo && receiptSetting.logoUrl) {
                try {
                    const response = await fetch(receiptSetting.logoUrl);
                    const blob = await response.blob();
                    readyBase64Logo = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onloadend = () => {
                            const base64 = (reader.result as string).split(',')[1];
                            resolve(base64);
                        };
                    });
                } catch (e) {
                    console.warn("Logo Fetch Error (Check Cloudflare/IndiHome):", e);
                }
            }

            for (const printer of printersToPrint) {
                try {
                    await BluetoothManager.connect(printer.address);
                    const is58mm = receiptSetting.paperWidth === 58;
                    const dashLine = is58mm ? "--------------------------------\n" : "------------------------------------------------\n";

                    // --- TAHAP 2: HEADER (SEMUA CENTER) ---
                    // 1. Set rata tengah di awal
                    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);

                    // LOGO HARUS PALING ATAS
                    if (readyBase64Logo) {
                        // FIX UKURAN: Mengambil nilai dari receiptSetting.logoSize sesuai pengaturan
                        const finalLogoSize = Math.floor(Number(receiptSetting.logoSizeAndroid) || 80);

                        await BluetoothEscposPrinter.printPic(readyBase64Logo, {
                            width: finalLogoSize,
                            left: 0
                        });
                    }

                    try {
                        await BluetoothEscposPrinter.setLineSpacing(0);
                    } catch (e) {}

                    // 2. RE-ASSERT ALIGN CENTER (PENTING: Menjamin teks di bawah logo tetap di tengah)
                    // Perintah ini wajib diulang karena printPic sering mereset alignment ke default (kiri)
                    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);

                    // NAMA TOKO (BOLD & UKURAN BESAR)
                    await BluetoothEscposPrinter.printText(`${receiptSetting.storeName || order.branch.name}\n`, {
                        encoding: 'GBK',
                        codepage: 0,
                        widthtimes: 1,
                        heighttimes: 1,
                        fonttype: 1
                    });

                    // ALAMAT & KONTAK (Tetap dalam kondisi ALIGN.CENTER)
                    await BluetoothEscposPrinter.printText(`${receiptSetting.headerAddress || ''}\n`, {});

                    let contactLine = "";
                    if (receiptSetting.headerPhone) contactLine += `Telp: ${receiptSetting.headerPhone}`;
                    if (receiptSetting.headerEmail) contactLine += contactLine ? ` | ${receiptSetting.headerEmail}` : receiptSetting.headerEmail;
                    if (contactLine) await BluetoothEscposPrinter.printText(`${contactLine}\n`, {});

                    if (receiptSetting.headerWebsite) await BluetoothEscposPrinter.printText(`${receiptSetting.headerWebsite}\n`, {});
                    if (receiptSetting.headerTaxId) await BluetoothEscposPrinter.printText(`NPWP: ${receiptSetting.headerTaxId}\n`, {});

                    await BluetoothEscposPrinter.printText(dashLine, {});

                    // --- TAHAP 3: INFO TRANSAKSI (SINKRON DENGAN HTML) ---
                    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.LEFT);
                    const dateStr = new Date(order.createdAt).toLocaleDateString('id-ID') + ' ' + new Date(order.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

                    await BluetoothEscposPrinter.printColumn(
                        is58mm ? [18, 14] : [24, 24],
                        [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT],
                        [dateStr, order.invoiceNumber], {}
                    );

                    if (receiptSetting.showOrderType) await BluetoothEscposPrinter.printText(`Tipe: ${order.orderType}\n`, { fonttype: 1 });
                    if (receiptSetting.showTableNumber && order.notes) await BluetoothEscposPrinter.printText(`Meja: ${order.notes}\n`, { fonttype: 1 });
                    if (receiptSetting.showCashierName) await BluetoothEscposPrinter.printText(`Kasir: ${order.cashier.fullName}\n`, {});
                    if (receiptSetting.showCustomerName && order.customerName) await BluetoothEscposPrinter.printText(`Pelanggan: ${order.customerName}\n`, {});

                    await BluetoothEscposPrinter.printText(dashLine, {});

                    // --- TAHAP 4: DAFTAR ITEM (GANTI • DENGAN - AGAR TIDAK MUNCUL TANDA TANYA) ---
                    const colWidths = is58mm ? [18, 4, 10] : [28, 6, 14];
                    await BluetoothEscposPrinter.printColumn(colWidths,
                        [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT, BluetoothEscposPrinter.ALIGN.RIGHT],
                        ["ITEM", "QTY", "TOTAL"], { }
                    );

                    for (const item of order.items) {
                        await BluetoothEscposPrinter.printColumn(colWidths,
                            [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT, BluetoothEscposPrinter.ALIGN.RIGHT],
                            [item.variant.product.name, item.quantity.toString(), Number(item.subtotal).toLocaleString('id-ID')], { }
                        );

                        // Gunakan karakter '-' karena banyak printer thermal tidak support '•'
                        if (receiptSetting.showVariantName) await BluetoothEscposPrinter.printText(`  ${item.variant.name}\n`, {});
                        if (receiptSetting.showItemSku && item.variant.sku) await BluetoothEscposPrinter.printText(`  SKU: ${item.variant.sku}\n`, {});
                        if (receiptSetting.showItemNotes && item.notes) await BluetoothEscposPrinter.printText(`  Catatan: ${item.notes}\n`, {});
                        if (receiptSetting.showItemDiscount && Number(item.discount) > 0) await BluetoothEscposPrinter.printText(`  Disc: -${Number(item.discount).toLocaleString('id-ID')}\n`, {});

                        if (!receiptSetting.compactMode) await BluetoothEscposPrinter.printText("\n", {});
                    }

                    await BluetoothEscposPrinter.printText(dashLine, {});

                    // --- TAHAP 5: TOTALS (Sesuai Desain Web) ---
                    const totalWidths = is58mm ? [16, 16] : [24, 24];
                    await BluetoothEscposPrinter.printColumn(totalWidths, [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT], ["Subtotal", Number(order.subtotal).toLocaleString('id-ID')], {});

                    if (order.appliedPromotions) {
                        for (const p of order.appliedPromotions) {
                            await BluetoothEscposPrinter.printColumn(totalWidths, [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT], [p.promotion.name, `-${Number(p.discountAmount).toLocaleString('id-ID')}`], {});
                        }
                    }
                    if (order.redeemedPoints > 0) {
                        await BluetoothEscposPrinter.printColumn(totalWidths, [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT], ["Tukar Poin", `-${order.redeemedPoints} Pts`], {});
                    }
                    if (Number(order.tax) > 0) {
                        await BluetoothEscposPrinter.printColumn(totalWidths, [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT], ["Pajak", Number(order.tax).toLocaleString('id-ID')], {});
                    }
                    if (Number(order.serviceCharge) > 0) {
                        await BluetoothEscposPrinter.printColumn(totalWidths, [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT], ["Service", Number(order.serviceCharge).toLocaleString('id-ID')], {});
                    }

                    await BluetoothEscposPrinter.printText("\n", {});
                    await BluetoothEscposPrinter.printColumn(totalWidths, [BluetoothEscposPrinter.ALIGN.LEFT, BluetoothEscposPrinter.ALIGN.RIGHT], ["TOTAL", Number(order.totalAmount).toLocaleString('id-ID')], { });

                    await BluetoothEscposPrinter.printText(`Metode: ${order.paymentMethod}\nBayar: ${Number(order.totalAmount).toLocaleString('id-ID')}\n`, {});

                    // --- TAHAP 6: POIN MEMBER ---
                    if (receiptSetting.showPointsEarned && order.memberId && order.earnedPoints > 0) {
                        await BluetoothEscposPrinter.printText("\n", {});
                        await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
                        await BluetoothEscposPrinter.printText(dashLine, {});
                        await BluetoothEscposPrinter.printText(`Member: ${order.member?.name || 'Pelanggan'}\n`, {});
                        await BluetoothEscposPrinter.printText(`Poin Didapat: +${order.earnedPoints}\n`, { fonttype: 1 });
                        await BluetoothEscposPrinter.printText(`Total Poin: ${order.member?.points}\n`, {});
                        await BluetoothEscposPrinter.printText(dashLine, {});
                    }

                    // --- TAHAP 7: FOOTER & QR (CENTER) ---
                    await BluetoothEscposPrinter.printerAlign(BluetoothEscposPrinter.ALIGN.CENTER);
                    await BluetoothEscposPrinter.printText(`${receiptSetting.footerMessage || 'Terima Kasih'}\n`, {});

                    if (receiptSetting.isRefundPolicy) {
                        await BluetoothEscposPrinter.printText(`\n${receiptSetting.isRefundPolicy}\n`, { fonttype: 2 });
                    }

                    if (receiptSetting.showBarcode) {
                        await BluetoothEscposPrinter.printText("\n", {});
                        await BluetoothEscposPrinter.printQRCode(`https://eps.andisurandi.online/receipt/${order.invoiceNumber}`, 300, BluetoothEscposPrinter.ERROR_CORRECTION.L);
                        await BluetoothEscposPrinter.printText("\nSCAN UNTUK STRUK DIGITAL\n", {});
                    }

                    await BluetoothEscposPrinter.printText("\n\n\n", {});

                } catch (printerError) {
                    console.warn(`Gagal mencetak di printer ${printer.name}:`, printerError);
                }
            }
        } catch (error: any) {
            console.error("Android Print Master Error:", error);
            throw error;
        }
    }
};