import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

// Force use of Google DNS if local DNS fails to resolve MongoDB SRV records
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  console.warn('Could not set DNS servers, proceeding with default DNS');
}

dotenv.config();

const connectDB = async () => {
  try {
    const dbUrl = process.env.DB_URL;
    if (!dbUrl) {
      throw new Error('DB_URL is not defined in .env file');
    }
    
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(dbUrl);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    
    if (error instanceof Error && error.message.includes('ECONNREFUSED') && error.message.includes('querySrv')) {
      console.error('\nTIP: This error (ECONNREFUSED querySrv) usually means your DNS cannot resolve the MongoDB Atlas SRV record.');
      console.error('Try whitelisting your IP in MongoDB Atlas or checking your internet connection.\n');
    }
    
    process.exit(1);
  }
};

export default connectDB;
