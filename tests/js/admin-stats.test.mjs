import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { toggleCustomDates } from '/public/js/admin-stats.js';

describe('toggleCustomDates', () => {
  let period, startDateGroup, endDateGroup;

  beforeEach(() => {
    // Arrange: Set up DOM elements
    period = document.createElement('select');
    period.id = 'period';
    // Add options to match real usage
    const customOption = document.createElement('option');
    customOption.value = 'custom';
    customOption.textContent = 'Custom';
    period.appendChild(customOption);
    const weekOption = document.createElement('option');
    weekOption.value = 'week';
    weekOption.textContent = 'Week';
    period.appendChild(weekOption);
    startDateGroup = document.createElement('div');
    startDateGroup.id = 'startDateGroup';
    endDateGroup = document.createElement('div');
    endDateGroup.id = 'endDateGroup';

    document.body.appendChild(period);
    document.body.appendChild(startDateGroup);
    document.body.appendChild(endDateGroup);
  });

  afterEach(() => {
    // Clean up DOM
    period.remove();
    startDateGroup.remove();
    endDateGroup.remove();
  });

  it('should show custom date fields when period is "custom"', () => {
    // Arrange
    period.value = 'custom';
    startDateGroup.style.display = 'none';
    endDateGroup.style.display = 'none';
    // All elements are already appended in beforeEach

    // Act
    toggleCustomDates();

    // Assert
    expect(startDateGroup.style.display).toBe('block');
    expect(endDateGroup.style.display).toBe('block');
  });

  it('should hide custom date fields when period is not "custom"', () => {
    // Arrange
    period.value = 'week';
    startDateGroup.style.display = 'block';
    endDateGroup.style.display = 'block';

    // Act
    toggleCustomDates();

    // Assert
    expect(startDateGroup.style.display).toBe('none');
    expect(endDateGroup.style.display).toBe('none');
  });

  it('should handle missing elements gracefully', () => {
    // Remove startDateGroup and endDateGroup
    startDateGroup.remove();
    endDateGroup.remove();

    // Act & Assert
    expect(() => toggleCustomDates()).not.toThrow();
  });
});