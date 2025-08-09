import dotenv from 'dotenv';

// Load environment variables for tests
dotenv.config({ path: '.env.test' });

// Global configuration for Jest
beforeAll(async () => {
    // Initial configuration for all tests
    console.log('🧪 Setting up tests...');
});

afterAll(async () => {
    // Cleanup after all tests
    console.log('🧹 Cleaning up tests...');
});
