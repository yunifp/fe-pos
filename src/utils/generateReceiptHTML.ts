export const generateReceiptHTML = (data: any) => {
    const { order, receiptSetting } = data;

    const paperWidth = receiptSetting.paperWidth === 58 ? '58mm' : '80mm';
    const fontSizeBase = receiptSetting.fontSize === 'LARGE' ? '14px' : receiptSetting.fontSize === 'SMALL' ? '10px' : '12px';
    const spacing = receiptSetting.compactMode ? '2px' : '6px';
    const marginVertical = receiptSetting.compactMode ? '10px' : '20px';

    const itemsHtml = order.items.map((item: any) => `
        <div style="margin-bottom: ${spacing};">
            <div style="display: flex; justify-content: space-between;">
                <span style="flex: 1; font-weight: bold;">${item.variant.product.name}</span>
                <span style="width: 30px; text-align: right;">${item.quantity}</span>
                <span style="width: 90px; text-align: right;">${Number(item.subtotal).toLocaleString('id-ID')}</span>
            </div>
            ${receiptSetting.showItemSku ? `<div style="font-size: 9px; color: #666;">SKU: ${item.variant.sku || '-'}</div>` : ''}
            ${receiptSetting.showVariantName ? `<div style="font-size: 10px; color: #444; margin-left: 5px;">• ${item.variant.name}</div>` : ''}
            ${receiptSetting.showItemNotes && item.notes ? `<div style="font-size: 10px; color: #444; margin-left: 5px;">Catatan: ${item.notes}</div>` : ''}
            ${receiptSetting.showItemDiscount && Number(item.discount) > 0 ? `<div style="font-size: 10px; color: #000; margin-left: 5px;">Diskon: -${Number(item.discount).toLocaleString('id-ID')}</div>` : ''}
        </div>
    `).join('');

    const promosHtml = order.appliedPromotions.map((p: any) => `
        <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
            <span>${p.promotion.name}</span>
            <span>-${Number(p.discountAmount).toLocaleString('id-ID')}</span>
        </div>
    `).join('');

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
            /* CSS UNTUK TAMPILAN LAYAR & CETAK */
            @page { 
                size: ${paperWidth} auto; 
                margin: 0; 
            }
            
            /* SANGAT PENTING: Memaksa browser hanya menampilkan konten ini saat print */
            @media print {
                body { 
                    visibility: visible;
                    width: ${paperWidth};
                    margin: 0;
                    padding: 0;
                }
                /* Sembunyikan header/footer bawaan browser jika memungkinkan */
                header, footer { display: none !important; }
            }

            body { 
                width: ${paperWidth}; 
                margin: 0 auto; 
                padding: 10px; 
                font-family: 'Courier New', Courier, monospace; 
                font-size: ${fontSizeBase};
                color: #000;
                line-height: 1.2;
                background-color: #fff;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: bold; }
            .uppercase { text-transform: uppercase; }
            .dashed-line { 
                border-bottom: 1px dashed #000; 
                margin: ${marginVertical} 0; 
            }
            .header-info { font-size: 10px; margin-top: 5px; }
            .barcode-container {
                margin-top: 15px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            #barcode {
                width: 100%;
                max-height: 50px;
            }
        </style>
    </head>
    <body>
        <div class="text-center">
            ${receiptSetting.showLogo ? `
                <div style="margin-bottom: 10px;">
                    <div style="width: ${receiptSetting.logoSize}px; height: ${receiptSetting.logoSize}px; border: 1px solid #000; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 10px;">
                        LOGO
                    </div>
                </div>
            ` : ''}
            
            <div style="font-size: 18px;" class="bold uppercase">${receiptSetting.storeName || order.branch.name}</div>
            <div class="header-info">
                ${receiptSetting.headerAddress}<br/>
                Telp: ${receiptSetting.headerPhone}<br/>
                ${receiptSetting.headerTaxId ? `NPWP: ${receiptSetting.headerTaxId}` : ''}
            </div>
        </div>

        <div class="dashed-line"></div>

        <div style="display: flex; justify-content: space-between; font-size: 11px;">
            <span>${new Date(order.createdAt).toLocaleDateString('id-ID')} ${new Date(order.createdAt).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'})}</span>
            <span class="bold">${order.invoiceNumber}</span>
        </div>
        <div style="font-size: 11px; margin-top: 2px;">
            ${receiptSetting.showOrderType ? `Tipe: <span class="bold">${order.orderType}</span>` : ''}
            ${receiptSetting.showTableNumber && order.notes ? `<br/>Meja: <span class="bold">${order.notes}</span>` : ''}
            ${receiptSetting.showCashierName ? `<br/>Kasir: ${order.cashier.fullName}` : ''}
            ${receiptSetting.showCustomerName && order.customerName ? `<br/>Pelanggan: <span style="font-style: italic;">${order.customerName}</span>` : ''}
        </div>

        <div class="dashed-line"></div>

        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px; font-size: 10px;">
            <span style="flex: 1;">ITEM</span>
            <span style="width: 30px; text-align: right;">QTY</span>
            <span style="width: 90px; text-align: right;">TOTAL</span>
        </div>
        ${itemsHtml}

        <div class="dashed-line"></div>

        <div style="display: flex; justify-content: space-between;">
            <span>Subtotal</span>
            <span>${Number(order.subtotal).toLocaleString('id-ID')}</span>
        </div>
        
        ${promosHtml}

        <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 14px;" class="bold">
            <span class="uppercase">TOTAL</span>
            <span>${Number(order.totalAmount).toLocaleString('id-ID')}</span>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 11px;">
            <span>Metode: ${order.paymentMethod}</span>
            ${order.paymentMethod === 'CASH' ? `<span>Bayar: ${Number(order.totalAmount).toLocaleString('id-ID')}</span>` : ''}
        </div>

        ${receiptSetting.showPointsEarned && order.member ? `
            <div style="text-align: right; font-size: 10px; margin-top: 5px; font-style: italic;">
                Poin Didapat: +${Math.floor(Number(order.totalAmount)/1000)} pts
            </div>
        ` : ''}

        <div class="dashed-line"></div>

        <div class="text-center" style="margin-top: 10px;">
            <div style="font-style: italic; white-space: pre-line;">${receiptSetting.footerMessage || 'Terima Kasih Atas Kunjungan Anda'}</div>
            
            ${receiptSetting.isRefundPolicy ? `
                <div style="font-size: 9px; margin-top: 15px; color: #444;">
                    ${receiptSetting.isRefundPolicy}
                </div>
            ` : ''}

            ${receiptSetting.showBarcode ? `
                <div class="barcode-container">
                    <svg id="barcode"></svg>
                    <div style="font-size: 8px; margin-top: 5px; letter-spacing: 2px;">SCAN UNTUK STRUK DIGITAL</div>
                </div>
            ` : ''}
        </div>

        <script>
          window.onload = function() {
            if (window.JsBarcode) {
                JsBarcode("#barcode", "${order.invoiceNumber}", {
                  format: "CODE128",
                  lineColor: "#000",
                  width: 2,
                  height: 40,
                  displayValue: false
                });
            }
          };
        </script>
    </body>
    </html>
    `;
};