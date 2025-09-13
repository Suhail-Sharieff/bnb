const mongoose = require('mongoose');
require('dotenv').config();

// Database configuration
const DB_CONFIG = {
  // MongoDB connection URI - using provided Atlas credentials
  uri: process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://suhailsharieffsharieff_db_user:bnb_password@bnbcluster.8jincu3.mongodb.net/bnb_db?retryWrites=true&w=majority&appName=bnbCluster',
  
  // Database name
  dbName: process.env.DB_NAME || 'bnb_db',
  
  // Connection options
  options: {
    // Connection pool settings
    maxPoolSize: 10, // Maintain up to 10 socket connections
    serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
    socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    
    // Other options
    useNewUrlParser: true,
    useUnifiedTopology: true
  }
};

class DatabaseManager {
  constructor() {
    this.isConnected = false;
    this.connectionAttempts = 0;
    this.maxRetries = 5;
  }

  /**
   * Connect to MongoDB database
   */
  async connect() {
    try {
      console.log('🔄 Connecting to MongoDB...');
      console.log(`📍 Database URI: ${this.maskUri(DB_CONFIG.uri)}`);
      
      // Connect to MongoDB
      await mongoose.connect(DB_CONFIG.uri, DB_CONFIG.options);
      
      this.isConnected = true;
      this.connectionAttempts = 0;
      
      console.log('✅ MongoDB connected successfully');
      console.log(`📊 Database: ${mongoose.connection.name}`);
      console.log(`🌐 Host: ${mongoose.connection.host}:${mongoose.connection.port}`);
      
      // Set up connection event listeners
      this.setupEventListeners();
      
      return true;
      
    } catch (error) {
      this.connectionAttempts++;
      console.error(`❌ MongoDB connection failed (attempt ${this.connectionAttempts}/${this.maxRetries}):`, error.message);
      
      if (this.connectionAttempts < this.maxRetries) {
        console.log(`🔄 Retrying connection in 5 seconds...`);
        await this.delay(5000);
        return this.connect();
      } else {
        console.error('💥 Max connection attempts reached. Database unavailable.');
        throw error;
      }
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.isConnected) {
        await mongoose.disconnect();
        this.isConnected = false;
        console.log('🔌 MongoDB disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting from MongoDB:', error.message);
      throw error;
    }
  }

  /**
   * Check database connection status
   */
  isHealthy() {
    return mongoose.connection.readyState === 1 && this.isConnected;
  }

  /**
   * Get database connection info
   */
  getConnectionInfo() {
    const connection = mongoose.connection;
    return {
      isConnected: this.isConnected,
      readyState: this.getReadyStateText(connection.readyState),
      host: connection.host,
      port: connection.port,
      name: connection.name,
      collections: Object.keys(connection.collections)
    };
  }

  /**
   * Set up MongoDB event listeners
   */
  setupEventListeners() {
    const connection = mongoose.connection;

    connection.on('connected', () => {
      console.log('📡 MongoDB connection established');
    });

    connection.on('error', (error) => {
      console.error('❌ MongoDB connection error:', error.message);
      this.isConnected = false;
    });

    connection.on('disconnected', () => {
      console.log('🔌 MongoDB disconnected');
      this.isConnected = false;
    });

    connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
      this.isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT. Gracefully shutting down MongoDB connection...');
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Helper method to mask sensitive URI information
   */
  maskUri(uri) {
    if (uri.includes('@')) {
      return uri.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@');
    }
    return uri;
  }

  /**
   * Helper method to get readable connection state
   */
  getReadyStateText(state) {
    const states = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    };
    return states[state] || 'unknown';
  }

  /**
   * Helper method for delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Initialize database with default data
   */
  async initializeData() {
    try {
      console.log('🔄 Initializing database with default data...');
      
      const User = require('../models/User');
      const Department = require('../models/Department');
      
      // Check if admin user exists
      const adminExists = await User.findOne({ role: 'admin' });
      if (!adminExists) {
        const defaultAdmin = new User({
          fullName: 'System Administrator',
          email: 'admin@blockchain-budget.com',
          password: 'Admin123!',
          role: 'admin'
        });
        await defaultAdmin.save();
        console.log('✅ Default admin user created');
      }
      
      // Check if departments exist
      const departmentCount = await Department.countDocuments();
      if (departmentCount === 0) {
        const admin = await User.findOne({ role: 'admin' });
        
        const defaultDepartments = [
          {
            name: 'Engineering',
            code: 'ENG',
            allocated: 5000000,
            manager: admin._id,
            description: 'Engineering and technical development',
            color: '#3B82F6'
          },
          {
            name: 'Athletics',
            code: 'ATH',
            allocated: 2000000,
            manager: admin._id,
            description: 'Athletic programs and facilities',
            color: '#EF4444'
          },
          {
            name: 'Library',
            code: 'LIB',
            allocated: 1500000,
            manager: admin._id,
            description: 'Library services and resources',
            color: '#10B981'
          },
          {
            name: 'Administration',
            code: 'ADM',
            allocated: 3000000,
            manager: admin._id,
            description: 'Administrative operations',
            color: '#F59E0B'
          }
        ];
        
        await Department.insertMany(defaultDepartments);
        console.log('✅ Default departments created');
      }
      
      console.log('✅ Database initialization completed');
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }
}

// Create singleton instance
const dbManager = new DatabaseManager();

module.exports = {
  DatabaseManager,
  dbManager,
  DB_CONFIG
};