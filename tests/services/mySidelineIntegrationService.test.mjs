import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import MySidelineIntegrationService from '../../services/mySidelineIntegrationService.mjs';
import { Carnival, SyncLog } from '../../models/index.mjs';

// Mocks
vi.mock('./mySidelineScraperService.mjs', () => ({
  default: vi.fn().mockImplementation(() => ({
    scrapeCarnivals: vi.fn(),
    validateAndCleanData: vi.fn(),
  })),
}));
vi.mock('./mySidelineCarnivalParserService.mjs', () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));
vi.mock('./mySidelineDataService.mjs', () => ({
  default: vi.fn().mockImplementation(() => ({
    deactivatePastCarnivals: vi.fn(),
    deactivateMissingCarnivals: vi.fn(),
    processScrapedCarnivals: vi.fn(),
    shouldRunInitialSync: vi.fn(),
  })),
}));
vi.mock('./mySidelineLogoDownloadService.mjs', () => ({
  default: vi.fn().mockImplementation(() => ({
    downloadLogos: vi.fn(),
  })),
}));
vi.mock('./imageNamingService.mjs', () => ({
  default: {
    ENTITY_TYPES: { CARNIVAL: 'carnival' },
    IMAGE_TYPES: { LOGO: 'logo' },
  },
}));
vi.mock('/models/index.mjs', () => ({
  Carnival: { update: vi.fn() },
  SyncLog: {
    startSync: vi.fn(),
  },
}));

describe('MySidelineIntegrationService.syncMySidelineCarnivals', () => {
  let service;
  let scraperService, dataService, logoDownloadService;
  let syncLogMock;

  beforeEach(() => {
    service = MySidelineIntegrationService;
    service.syncEnabled = true;
    service.isRunning = false;
    scraperService = service.scraperService;
    dataService = service.dataService;
    logoDownloadService = service.logoDownloadService;

    // Ensure deactivatePastCarnivals is always a vi.fn()
    dataService.deactivatePastCarnivals = vi.fn();
    dataService.deactivateMissingCarnivals = vi.fn();
    // Ensure scrapeCarnivals is always a vi.fn()
    scraperService.scrapeCarnivals = vi.fn();
    // Ensure validateAndCleanData is always a vi.fn()
    scraperService.validateAndCleanData = vi.fn();
    // Ensure processScrapedCarnivals is always a vi.fn()
    dataService.processScrapedCarnivals = vi.fn();
    // Ensure downloadLogos is always a vi.fn()
    logoDownloadService.downloadLogos = vi.fn();

    syncLogMock = {
      markCompleted: vi.fn(),
      markFailed: vi.fn(),
    };
    SyncLog.startSync.mockResolvedValue(syncLogMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
    service.isRunning = false;
    service.syncEnabled = true;
  });

  it('returns early if sync is disabled', async () => {
    service.syncEnabled = false;
    const result = await service.syncMySidelineCarnivals();
    expect(result).toEqual({
      success: true,
      carnivalsProcessed: 0,
      message: 'Sync disabled via configuration',
    });
  });

  it('returns early if already running', async () => {
    service.isRunning = true;
    const result = await service.syncMySidelineCarnivals();
    expect(result).toBeUndefined();
  });

  it('handles no carnivals found from scraper', async () => {
    dataService.deactivatePastCarnivals.mockResolvedValue({ success: true, deactivatedCount: 0 });
    scraperService.scrapeCarnivals.mockResolvedValue([]);
    const result = await service.syncMySidelineCarnivals();
    expect(syncLogMock.markCompleted).toHaveBeenCalledWith({
      carnivalsProcessed: 0,
      carnivalsCreated: 0,
      carnivalsUpdated: 0,
    });
    expect(result).toEqual({
      success: true,
      carnivalsProcessed: 0,
      message: 'No carnivals found',
    });
  });

  it('handles all carnivals failing validation', async () => {
    dataService.deactivatePastCarnivals.mockResolvedValue({ success: true, deactivatedCount: 0 });
    scraperService.scrapeCarnivals.mockResolvedValue([{ title: 'Carnival1' }]);
    scraperService.validateAndCleanData.mockImplementation(() => {
      throw new Error('Invalid');
    });
    const result = await service.syncMySidelineCarnivals();
    expect(syncLogMock.markCompleted).toHaveBeenCalledWith({
      carnivalsProcessed: 0,
      carnivalsCreated: 0,
      carnivalsUpdated: 0,
    });
    expect(result).toEqual({
      success: true,
      carnivalsProcessed: 0,
      message: 'No carnivals passed validation',
    });
  });

  it('processes carnivals and downloads logos', async () => {
    dataService.deactivatePastCarnivals.mockResolvedValue({ success: true, deactivatedCount: 1 });
    scraperService.scrapeCarnivals.mockResolvedValue([
      { title: 'Carnival1', clubLogoURL: 'http://logo.com/1', id: 1 },
      { title: 'Carnival2', clubLogoURL: null, id: 2 },
    ]);
    scraperService.validateAndCleanData.mockImplementation((carnival) => carnival);
    const processedCarnivals = [
      expect.objectContaining({ id: 1, clubLogoURL: 'http://logo.com/1', title: 'Carnival1' }),
      expect.objectContaining({ id: 2, clubLogoURL: null, title: 'Carnival2' }),
    ];
    dataService.processScrapedCarnivals.mockResolvedValue([
      {
        id: 1,
        clubLogoURL: 'http://logo.com/1',
        createdAt: new Date().toISOString(),
        title: 'Carnival1',
      },
      { id: 2, clubLogoURL: null, createdAt: new Date().toISOString(), title: 'Carnival2' },
    ]);
    logoDownloadService.downloadLogos.mockResolvedValue([
      { entityId: 1, success: true, publicUrl: 'https://cdn/logo1.png' },
    ]);
    Carnival.update.mockResolvedValue([1]);

    const result = await service.syncMySidelineCarnivals();

    expect(dataService.deactivatePastCarnivals).toHaveBeenCalled();
    expect(scraperService.scrapeCarnivals).toHaveBeenCalled();
    expect(scraperService.validateAndCleanData).toHaveBeenCalledTimes(2);
    expect(dataService.processScrapedCarnivals.mock.calls[0][0]).toEqual(
      expect.arrayContaining(processedCarnivals)
    );
    expect(dataService.deactivateMissingCarnivals).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Carnival1', clubLogoURL: 'http://logo.com/1' }),
        expect.objectContaining({ title: 'Carnival2', clubLogoURL: null }),
      ])
    );
    expect(logoDownloadService.downloadLogos).toHaveBeenCalled();
    expect(Carnival.update).toHaveBeenCalledWith(
      { clubLogoURL: 'https://cdn/logo1.png' },
      { where: { id: 1 } }
    );
    expect(syncLogMock.markCompleted).toHaveBeenCalledWith({
      carnivalsProcessed: 2,
      carnivalsCreated: 2,
      carnivalsUpdated: 0,
    });
    expect(result.success).toBe(true);
    expect(result.carnivalsProcessed).toBe(2);
    expect(result.carnivalsCreated).toBe(2);
    expect(result.carnivalsUpdated).toBe(0);
    expect(result.lastSync).toBeInstanceOf(Date);
  });

  it('handles logo download failure and clears logo', async () => {
    dataService.deactivatePastCarnivals.mockResolvedValue({ success: true, deactivatedCount: 0 });
    scraperService.scrapeCarnivals.mockResolvedValue([
      { title: 'Carnival1', clubLogoURL: 'http://logo.com/1', id: 1 },
    ]);
    scraperService.validateAndCleanData.mockImplementation((carnival) => carnival);
    const processedCarnivals = [
      { id: 1, clubLogoURL: 'http://logo.com/1', createdAt: new Date().toISOString() },
    ];
    dataService.processScrapedCarnivals.mockResolvedValue(processedCarnivals);
    logoDownloadService.downloadLogos.mockResolvedValue([
      { entityId: 1, success: false, error: 'Download failed' },
    ]);
    Carnival.update.mockResolvedValue([1]);

    const result = await service.syncMySidelineCarnivals();

    expect(Carnival.update).toHaveBeenCalledWith({ clubLogoURL: null }, { where: { id: 1 } });
    expect(result.success).toBe(true);
    expect(result.carnivalsProcessed).toBe(1);
  });

  it('handles errors and marks sync as failed', async () => {
    dataService.deactivatePastCarnivals.mockRejectedValue(new Error('DB error'));
    const result = await service.syncMySidelineCarnivals();
    expect(syncLogMock.markFailed).toHaveBeenCalledWith('DB error');
    expect(result.success).toBe(false);
    expect(result.error).toBe('DB error');
  });
});
