import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load backend .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'backend', '.env') });

const uri = process.env.MONGODB_ATLAS_URI || process.env.MONGODB_URI;

console.log("---------------------------------------------------");
if (!uri) {
    console.error("❌ ERROR: No MONGODB_PATH found in backend/.env");
    process.exit(1);
}

// Hide password in logs
const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');
console.log(`🔌 Testing connection to: ${maskedUri}`);

mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 })
    .then(() => {
        console.log("\n✅ SUCCESS! Your MongoDB credentials are CORRECT.");
        console.log("   If this works locally but fails on Vercel, it confirms");
        console.log("   you blocked Vercel's IP address.");
        console.log("   -> Go to MongoDB Atlas > Network Access > Add 0.0.0.0/0");
        console.log("---------------------------------------------------");
        process.exit(0);
    })
    .catch(err => {
        console.log("\n❌ CONNECTION FAILED!");
        console.log("   Error:", err.message);
        console.log("   -> Check your Username/Password in backend/.env");
        console.log("   -> Check if your IP is whitelisted in MongoDB Atlas");
        console.log("---------------------------------------------------");
        process.exit(1);
    });
