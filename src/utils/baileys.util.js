const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require("@whiskeysockets/baileys");
const pino = require("pino");
const qrcode = require("qrcode-terminal");
const path = require("path");
const fs = require("fs");

let sock = null;
let connectionState = "closed";
let connectionPromise = null;
const authFolder = path.join(process.cwd(), "auth_info_baileys");
console.log(`[Baileys] Using auth folder: ${authFolder}`);

if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
}

/**
 * Connect to WhatsApp using Baileys
 */
async function connectToWhatsApp() {
    if (connectionPromise) return connectionPromise;

    connectionPromise = (async () => {
        const { state, saveCreds } = await useMultiFileAuthState(authFolder);
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`[Baileys] Using WhatsApp version: v${version.join(".")}, isLatest: ${isLatest}`);

        sock = makeWASocket({
            auth: state,
            version,
            logger: pino({ level: "silent" }),
            browser: ["PFX-Fitness", "Chrome", "1.0.0"],
        });

        return new Promise((resolve) => {
            sock.ev.on("connection.update", (update) => {
                const { connection, lastDisconnect, qr } = update;
                connectionState = connection || connectionState;

                if (qr) {
                    console.log("[Baileys] Scan the QR code below to link WhatsApp:");
                    qrcode.generate(qr, { small: true });
                }

                if (connection === "close") {
                    const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                    console.log("[Baileys] Connection closed. Status code:", lastDisconnect?.error?.output?.statusCode);
                    console.log("[Baileys] Full Error:", JSON.stringify(lastDisconnect?.error, null, 2));
                    connectionPromise = null;
                    if (shouldReconnect) {
                        connectToWhatsApp();
                    }
                } else if (connection === "open") {
                    console.log("[Baileys] Opened connection successfully");
                    resolve(sock);
                }
            });

            sock.ev.on("creds.update", saveCreds);
        });
    })();

    return connectionPromise;
}

/**
 * Get the current WhatsApp socket, ensuring it's open
 */
async function getWhatsAppSocket() {
    if (connectionState !== "open") {
        await connectToWhatsApp();
    }
    return sock;
}

/**
 * Send a message via Baileys
 * @param {string} phone - Target phone number
 * @param {string} message - Message text
 * @param {string} imageUrl - (Optional) URL or path to image
 */
async function sendMessage(phone, message, imageUrl) {
    try {
        const s = await getWhatsAppSocket();
        
        const formattedPhone = phone.includes("@s.whatsapp.net") ? phone : `${phone}@s.whatsapp.net`;
        
        if (imageUrl) {
            // Check if imageUrl is a data URL (base64)
            if (imageUrl.startsWith("data:image")) {
                const buffer = Buffer.from(imageUrl.split(",")[1], "base64");
                await s.sendMessage(formattedPhone, { 
                    image: buffer, 
                    caption: message 
                });
            } else {
                await s.sendMessage(formattedPhone, { 
                    image: { url: imageUrl }, 
                    caption: message 
                });
            }
        } else {
            await s.sendMessage(formattedPhone, { text: message });
        }
        
        console.log(`[Baileys] Message sent to ${phone}`);
        return true;
    } catch (error) {
        console.error("[Baileys] Failed to send message:", error);
        return false;
    }
}

// Initial connection
connectToWhatsApp();

module.exports = {
    getWhatsAppSocket,
    sendMessage
};
