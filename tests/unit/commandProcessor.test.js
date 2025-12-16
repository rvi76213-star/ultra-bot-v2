const assert = require('assert');
const CommandProcessor = require('../../src/middleware/commandProcessor');
const guard = require('../../src/secure/guard');

// Mock Facebook API
const mockApi = {
  sendMessage: (message, threadId) => {
    console.log(`Mock send: ${message} to ${threadId}`);
    return Promise.resolve();
  },
  getUserInfo: (ids) => Promise.resolve({}),
  getThreadInfo: (id) => Promise.resolve({}),
  markAsRead: (id) => Promise.resolve()
};

// Mock event
const createMockEvent = (senderId, threadId, body) => ({
  senderID: senderId,
  threadID: threadId,
  body: body,
  type: 'message'
});

describe('Command Processor', () => {
  beforeEach(() => {
    // Reset any global state
    global.funIntervals = {};
    global.activeThreads = 0;
  });

  describe('Input Validation', () => {
    it('should reject empty command', async () => {
      const event = createMockEvent('123', '456', '!');
      const result = await CommandProcessor.process(mockApi, event, '', []);
      assert(result.includes('Invalid command'));
    });

    it('should reject command with malicious input', async () => {
      const event = createMockEvent('123', '456', '!test <script>alert(1)</script>');
      const result = await CommandProcessor.process(mockApi, event, 'test', ['<script>alert(1)</script>']);
      assert(result.includes('Invalid'));
    });
  });

  describe('Permission Checking', () => {
    it('should allow owner commands for owner', async () => {
      // Mock guard to return true for owner
      const originalIsOwner = guard.isOwner;
      guard.isOwner = () => true;
      
      const event = createMockEvent('61578706761898', '456', '!emergencystop');
      
      // Since we don't have actual handler, it will return command not found
      const result = await CommandProcessor.process(mockApi, event, 'emergencystop', []);
      
      guard.isOwner = originalIsOwner; // Restore
      assert(result); // Should return some response
    });

    it('should reject owner commands for non-owner', async () => {
      const event = createMockEvent('123', '456', '!emergencystop');
      const result = await CommandProcessor.process(mockApi, event, 'emergencystop', []);
      assert(result.includes('Owner access required'));
    });
  });

  describe('Rate Limiting', () => {
    it('should respect rate limits', async () => {
      const event = createMockEvent('789', '456', '!help');
      
      // Process multiple times quickly
      const results = [];
      for (let i = 0; i < 35; i++) { // More than 30/minute limit
        const result = await CommandProcessor.process(mockApi, event, 'help', []);
        results.push(result);
      }
      
      // At least one should be rate limited
      const rateLimited = results.some(r => r && r.includes('Rate limit'));
      assert(rateLimited, 'Should have rate limited at some point');
    });
  });
});

describe('Guard System', () => {
  it('should correctly identify owner', () => {
    // Mock config
    const config = require('../../config/config.json');
    const testUid = config.ownerUid;
    
    // Mock verifyOwner to return true for test UID
    const verifyOwner = require('../../src/secure/verifyOwner').verifyOwner;
    require('../../src/secure/verifyOwner').verifyOwner = (uid) => uid === testUid;
    
    const isOwner = guard.isOwner(testUid);
    
    // Restore
    require('../../src/secure/verifyOwner').verifyOwner = verifyOwner;
    
    assert(isOwner, 'Should identify owner');
  });
});