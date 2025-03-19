const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const https = require("https"); // Fix SSL error

async function elxyzFile(filePath) {
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

module.exports = { elxyzFile };
