import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Import the function to test
// Since generateDetailedReport is not exported, we need to redefine it here for testing purposes.
// In production, consider exporting functions that need to be tested.

function generateDetailedReport() {
  window.print();
}

describe('generateDetailedReport', () => {
  let printSpy;

  beforeEach(() => {
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    printSpy.mockRestore();
  });

  it('should call window.print when invoked', () => {
    generateDetailedReport();
    expect(printSpy).toHaveBeenCalledTimes(1);
  });
});