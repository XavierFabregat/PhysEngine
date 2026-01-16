import { describe, it, expect, beforeEach } from 'vitest';
import { generateBodyId, resetBodyIdCounter, getCurrentIdCount } from './idGenerator';
import { createCircle, resetBodyIdCounter as resetCircle } from './createCircle';
import { createRectangle, resetBodyIdCounter as resetRect } from './createRectangle';

describe('idGenerator', () => {
  beforeEach(() => {
    resetBodyIdCounter();
  });

  describe('generateBodyId', () => {
    it('should generate sequential IDs', () => {
      const id1 = generateBodyId();
      const id2 = generateBodyId();
      const id3 = generateBodyId();
      
      expect(id1).toBe('body_0');
      expect(id2).toBe('body_1');
      expect(id3).toBe('body_2');
    });

    it('should generate unique IDs', () => {
      const ids = new Set();
      for (let i = 0; i < 100; i++) {
        ids.add(generateBodyId());
      }
      
      expect(ids.size).toBe(100);
    });

    it('should start from 0 after reset', () => {
      generateBodyId(); // body_0
      generateBodyId(); // body_1
      
      resetBodyIdCounter();
      
      const id = generateBodyId();
      expect(id).toBe('body_0');
    });
  });

  describe('getCurrentIdCount', () => {
    it('should return 0 initially', () => {
      expect(getCurrentIdCount()).toBe(0);
    });

    it('should increment after generating IDs', () => {
      expect(getCurrentIdCount()).toBe(0);
      generateBodyId();
      expect(getCurrentIdCount()).toBe(1);
      generateBodyId();
      expect(getCurrentIdCount()).toBe(2);
    });

    it('should reset to 0 after resetBodyIdCounter', () => {
      generateBodyId();
      generateBodyId();
      expect(getCurrentIdCount()).toBe(2);
      
      resetBodyIdCounter();
      expect(getCurrentIdCount()).toBe(0);
    });
  });

  describe('cross-factory uniqueness', () => {
    it('should generate unique IDs across circles and rectangles', () => {
      const circle1 = createCircle({ radius: 10 });
      const rect1 = createRectangle({ width: 20, height: 20 });
      const circle2 = createCircle({ radius: 15 });
      const rect2 = createRectangle({ width: 30, height: 30 });
      
      const ids = [circle1.id, rect1.id, circle2.id, rect2.id];
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(4);
      expect(circle1.id).toBe('body_0');
      expect(rect1.id).toBe('body_1');
      expect(circle2.id).toBe('body_2');
      expect(rect2.id).toBe('body_3');
    });

    it('should share the same counter across all factories', () => {
      createCircle({ radius: 10 });  // body_0
      createRectangle({ width: 20, height: 20 });  // body_1
      createCircle({ radius: 15 });  // body_2
      
      expect(getCurrentIdCount()).toBe(3);
    });

    it('should reset counter for both factories', () => {
      createCircle({ radius: 10 });
      createRectangle({ width: 20, height: 20 });
      
      resetBodyIdCounter(); // Should reset shared counter
      
      const circle = createCircle({ radius: 10 });
      const rect = createRectangle({ width: 20, height: 20 });
      
      expect(circle.id).toBe('body_0');
      expect(rect.id).toBe('body_1');
    });

    it('should maintain uniqueness even with mixed creation order', () => {
      const bodies = [];
      
      bodies.push(createCircle({ radius: 10 }));
      bodies.push(createCircle({ radius: 20 }));
      bodies.push(createRectangle({ width: 30, height: 30 }));
      bodies.push(createCircle({ radius: 30 }));
      bodies.push(createRectangle({ width: 40, height: 40 }));
      bodies.push(createRectangle({ width: 50, height: 50 }));
      
      const ids = bodies.map(b => b.id);
      const uniqueIds = new Set(ids);
      
      expect(uniqueIds.size).toBe(6);
      expect(ids).toEqual(['body_0', 'body_1', 'body_2', 'body_3', 'body_4', 'body_5']);
    });
  });
});

