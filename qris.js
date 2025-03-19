const axios = require("axios");
const FormData = require("form-data");
const QRCode = require("qrcode");
const https = require("https"); // Bypass SSL

function convertCRC16(str) {
    let crc = 0xFFFF;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
        }
    }
    return ("000" + (crc & 0xFFFF).toString(16).toUpperCase()).slice(-4);
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
        let qrisData = codeqr.slice(0, -4);
        const step1 = qrisData.replace("010211", "010212");
        const step2 = step1.split("5802ID");

        amount = amount.toString();
        let uang = "54" + ("0" + amount.length).slice(-2) + amount + "5802ID";
        const result = step2[0] + uang + step2[1] + convertCRC16(step2[0] + uang + step2[1]);

        // Generate QR Code langsung ke buffer (bukan file)
        const qrCodeBuffer = await QRCode.toBuffer(result);

        // Upload buffer ke CDN
        const form = new FormData();
        form.append("file", qrCodeBuffer, { filename: "qr_image.png", contentType: "image/png" });

        const response = await axios.post("https://cdn.bgs.ct.ws/upload", form, {
            headers: form.getHeaders(),
            httpsAgent: new https.Agent({ rejectUnauthorized: false }) // Fix SSL
        });

        if (!response.data.fileUrl) throw new Error("Gagal upload QR code");

        return {
            success: true,
            data: {
                transactionId: generateTransactionId(),
                amount,
                expirationTime: generateExpirationTime(),
                qrImageUrl: response.data.fileUrl,
                status: "active"
            }
        };
    } catch (error) {
        console.error("❌ Error generating QRIS:", error.message);
        return { success: false, message: "Error generating QRIS", error: error.message };
    }
}

module.exports = { createQRIS };
