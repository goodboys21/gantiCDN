const axios = require('axios');
const FormData = require('form-data');
const QRCode = require('qrcode');

function convertCRC16(str) {
    let crc = 0xFFFF;
    const strlen = str.length;

    for (let c = 0; c < strlen; c++) {
        crc ^= str.charCodeAt(c) << 8;

        for (let i = 0; i < 8; i++) {
            if (crc & 0x8000) {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc = crc << 1;
            }
        }
    }

    let hex = crc & 0xFFFF;
    hex = ("000" + hex.toString(16).toUpperCase()).slice(-4);

    return hex;
}

function generateTransactionId() {
    return Math.random().toString(36).substring(2, 10);
}

function generateExpirationTime() {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 30);
    return expirationTime;
}

async function createQRIS(amount, codeqr) {
    try {
        let qrisData = codeqr;
        qrisData = qrisData.slice(0, -4);
        const step1 = qrisData.replace("010211", "010212");
        const step2 = step1.split("5802ID");

        amount = amount.toString();
        let uang = "54" + ("0" + amount.length).slice(-2) + amount;
        uang += "5802ID";

        const result = step2[0] + uang + step2[1] + convertCRC16(step2[0] + uang + step2[1]);

        // Generate QR Code ke Buffer (tanpa save file)
        const qrCodeBuffer = await QRCode.toBuffer(result);

        // Upload ke server
        const form = new FormData();
        form.append('file', qrCodeBuffer, { filename: 'qr_image.png', contentType: 'image/png' });

        const response = await axios.post("https://cdn.bgs.ct.ws/upload", form, {
            headers: form.getHeaders()
        });

        return {
            transactionId: generateTransactionId(),
            amount: amount,
            expirationTime: generateExpirationTime(),
            qrImageUrl: response.data.fileUrl,
            status: "active"
        };
    } catch (error) {
        console.error("Error generating QRIS:", error);
        throw error;
    }
}

module.exports = {
  createQRIS
};
