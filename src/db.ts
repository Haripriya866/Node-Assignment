import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;

if (!uri) {
    throw new Error('Missing MONGODB_URI in .env file');
}

const client = new MongoClient(uri);

export const connectToDb = async () => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err);
  }
};

export const getDb = () => client.db('node_assignment');
