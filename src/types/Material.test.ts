import { describe, it, expect } from 'vitest';
import { createMaterial, DEFAULT_MATERIAL } from './Material';

describe('Material', () => {
  describe('DEFAULT_MATERIAL', () => {
    it('should have expected default values', () => {
      expect(DEFAULT_MATERIAL.friction).toBe(0.3);
      expect(DEFAULT_MATERIAL.restitution).toBe(0.2);
      expect(DEFAULT_MATERIAL.density).toBe(1000);
    });

    it('should be immutable (frozen)', () => {
      expect(Object.isFrozen(DEFAULT_MATERIAL)).toBe(true);
    });
  });

  describe('createMaterial', () => {
    it('should create material with all defaults when no args provided', () => {
      const material = createMaterial();
      expect(material.friction).toBe(0.3);
      expect(material.restitution).toBe(0.2);
      expect(material.density).toBe(1000);
    });

    it('should override friction only', () => {
      const material = createMaterial({ friction: 0.8 });
      expect(material.friction).toBe(0.8);
      expect(material.restitution).toBe(0.2);
      expect(material.density).toBe(1000);
    });

    it('should override restitution only', () => {
      const material = createMaterial({ restitution: 0.9 });
      expect(material.friction).toBe(0.3);
      expect(material.restitution).toBe(0.9);
      expect(material.density).toBe(1000);
    });

    it('should override density only', () => {
      const material = createMaterial({ density: 500 });
      expect(material.friction).toBe(0.3);
      expect(material.restitution).toBe(0.2);
      expect(material.density).toBe(500);
    });

    it('should override multiple properties', () => {
      const material = createMaterial({
        friction: 0.7,
        restitution: 0.5,
      });
      expect(material.friction).toBe(0.7);
      expect(material.restitution).toBe(0.5);
      expect(material.density).toBe(1000);
    });

    it('should override all properties', () => {
      const material = createMaterial({
        friction: 0.1,
        restitution: 0.95,
        density: 7000,
      });
      expect(material.friction).toBe(0.1);
      expect(material.restitution).toBe(0.95);
      expect(material.density).toBe(7000);
    });

    it('should handle zero values', () => {
      const material = createMaterial({
        friction: 0,
        restitution: 0,
        density: 0,
      });
      expect(material.friction).toBe(0);
      expect(material.restitution).toBe(0);
      expect(material.density).toBe(0);
    });

    it('should handle values at upper bounds', () => {
      const material = createMaterial({
        friction: 1.0,
        restitution: 1.0,
      });
      expect(material.friction).toBe(1.0);
      expect(material.restitution).toBe(1.0);
    });

    it('should handle negative values (even if physically invalid)', () => {
      const material = createMaterial({
        friction: -0.5,
        restitution: -0.2,
        density: -100,
      });
      expect(material.friction).toBe(-0.5);
      expect(material.restitution).toBe(-0.2);
      expect(material.density).toBe(-100);
    });

    it('should treat explicit undefined as using default', () => {
      const material = createMaterial({
        friction: undefined,
        restitution: 0.5,
      });
      expect(material.friction).toBe(0.3);
      expect(material.restitution).toBe(0.5);
    });
  });
});

