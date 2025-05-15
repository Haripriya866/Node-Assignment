import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import axios from 'axios';
import { connectToDb,getDb } from './db';
import { User } from './models/User';
import { Post } from './models/Post';

const app = express();
app.use(express.json());

const loadData = async () => {
    try {
      // Fetch data from JSON Placeholder
      const usersResponse = await axios.get('https://jsonplaceholder.typicode.com/users');
      const postsResponse = await axios.get('https://jsonplaceholder.typicode.com/posts');
      const commentsResponse = await axios.get('https://jsonplaceholder.typicode.com/comments');
  
      const db = getDb();
      const usersCollection = db.collection('users');
      const postsCollection = db.collection('posts');
      const commentsCollection = db.collection('comments');
  
      // Save users to MongoDB
      const users: User[] = usersResponse.data;
      await usersCollection.insertMany(users);
  
      // Save posts and comments to MongoDB
      const posts: Post[] = postsResponse.data.map((post: any) => {
        const postComments = commentsResponse.data.filter(
          (comment: any) => comment.postId === post.id
        );
        return { ...post, comments: postComments };
      });
  
      await postsCollection.insertMany(posts);
      await commentsCollection.insertMany(commentsResponse.data);
  
      console.log('Data loaded successfully!');
    } catch (error) {
      console.error('Error loading data:', error);
    }
};

app.delete('/users', async (request, response) => {
    const db = getDb();
    const usersCollection = db.collection('users');
  
    try {
      const result = await usersCollection.deleteMany({});
  
      return response.status(200).json({
        message: `Deleted users successfully`
      });
    } catch (error) {
      console.error('Error deleting users:', error);
      return response.status(500).json({
        error: 'Internal server error'
      });
    }
});
  

app.get('/users/:userId', async (request, response) => {
    const userId = parseInt(request.params.userId);
  
    const db = getDb();
    const usersCollection = db.collection('users');
    const postsCollection = db.collection('posts');
  
    try {
      const user = await usersCollection.findOne({ id: userId });
  
      if (!user) {
        return response.status(404).json({ message: 'User not found' });
      }
  
      const posts = await postsCollection.find({ 'userId': userId }).toArray();
      const userWithPosts = { ...user, posts };
      response.status(200).json(userWithPosts);
    } catch (error) {
      console.error('Error fetching user:', error);
      response.status(500).json({ message: 'Internal server error' });
    }
});

app.delete('/users/:userId', async (request, response) => {
    const userId = parseInt(request.params.userId);
  
    const db = getDb();
    const usersCollection = db.collection('users');
    const postsCollection = db.collection('posts');
    const commentsCollection = db.collection('comments');
  
    try {
      const result = await usersCollection.deleteOne({ id: userId });
  
      if (result.deletedCount === 0) {
        return response.status(404).json({ message: 'User not found' });
      }

      const posts = await postsCollection.find({ userId }).toArray();
  
      // Delete related posts and comments
      await postsCollection.deleteMany({ userId });
      await commentsCollection.deleteMany({ postId: { $in: posts.map((post: any) => post.id) } });
  
      response.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Error deleting user:', error);
      response.status(500).json({ message: 'Internal server error' });
    }
});

app.put('/users', async (request, response) => {
    const user = request.body;
    const db = getDb();
    const usersCollection = db.collection('users');
  
    // Validate that required fields exist
    if (!user || typeof user.id !== 'number' || !user.name || !user.email) {
      return response.status(400).json({ error: 'Invalid user data' });
    }
  
    try {
      const existingUser = await usersCollection.findOne({ id: user.id });
  
      if (existingUser) {
        return response.status(400).json({ error: 'User already exists.' });
      }
  
      await usersCollection.insertOne(user);
  
      return response.status(201).json(user);
    } catch (error) {
      console.error('Error adding user:', error);
      return response.status(500).json({ error: 'Internal server error' });
    }
});
  

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
      await connectToDb(); //  Connect to MongoDB
      await loadData();    //  Load data from JSONPlaceholder
  
      app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error('Failed to start server:', err);
    }
  }
  
  startServer();