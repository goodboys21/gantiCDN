const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const QRCode = require('qrcode');
const https = require("https"); // Tambahin ini buat SSL fix

// Fungsi CRC16 buat validasi QRIS
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

// Generate ID transaksi unik
function generateTransactionId() {
    return Math.random().toString(36).substring(2, 10);
}

// Set waktu kadaluarsa QR
function generateExpirationTime() {
    const expirationTime = new Date();
    expirationTime.setMinutes(expirationTime.getMinutes() + 30);
    return expirationTime;
}

// Fungsi upload ke server
async function uploadFile(filePath) {
    return new Promise(async (resolve, reject) => {
        if (!fs.existsSync(filePath)) return reject(new Error("File tidak ditemukan"));

        try {
            const form = new FormData();
            form.append("file", fs.createReadStream(filePath));

            const response = await axios.post('https://cdn.bgs.ct.ws/upload', form, {
                headers: form.getHeaders(),
                httpsAgent: new https.Agent({ rejectUnauthorized: false }), // Fix SSL error
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.lengthComputable) {
                        console.log(`🚀 Upload Progress: ${(progressEvent.loaded * 100) / progressEvent.total}%`);
                    }
                }
            });

            console.log("🚀 Server Response:", response.data);

            if (response.data.status === "success" && response.data.fileUrl) {
                resolve(response.data.fileUrl);
            } else {
                reject(new Error(`Gagal upload: ${response.data.message || "Tidak ada fileUrl"}`));
            }
        } catch (error) {
            reject(error);
        }
    });
}

// Fungsi buat generate QRIS
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

        // Generate QR code image
        const qrImagePath = "./qr_image.png";
        await QRCode.toFile(qrImagePath, result);

        // Upload QR image ke server
        const qrImageUrl = await uploadFile(qrImagePath);

        return {
            transactionId: generateTransactionId(),
            amount: amount,
            expirationTime: generateExpirationTime(),
            qrImageUrl: qrImageUrl,
            status: "active"
        };
    } catch (error) {
        throw error;
    }
}

module.exports = {
  createQRIS,
  uploadFile
};
