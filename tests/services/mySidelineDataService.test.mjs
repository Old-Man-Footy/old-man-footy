import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MySidelineDataService from '/services/mySidelineDataService.mjs';
import { Carnival, SyncLog } from '/models/index.mjs';
import { Op } from 'sequelize';

// Mock the models and dependencies
vi.mock('/models/index.mjs', () => ({
    Carnival: {
        findOne: vi.fn(),
        create: vi.fn(),
        findAll: vi.fn(),
        update: vi.fn(),
    },
    SyncLog: {
        shouldRunSync: vi.fn(),
        getLastSuccessfulSync: vi.fn(),
    },
}));

vi.mock('sequelize', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        Op: {
            lt: Symbol.for('lt'), // Use Symbol.for to ensure consistency
        },
    };
});

describe('MySidelineDataService', () => {
    let service;

    beforeEach(() => {
        service = new MySidelineDataService();
        vi.resetAllMocks();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('findExistingMySidelineEvent', () => {
        it('should find an event by mySidelineId first', async () => {
            const eventData = { mySidelineId: '123', title: 'Test Event' };
            const mockCarnival = { id: 1, ...eventData };
            Carnival.findOne.mockResolvedValue(mockCarnival);

            const result = await service.findExistingMySidelineEvent(eventData);

            expect(Carnival.findOne).toHaveBeenCalledWith({ where: { mySidelineId: '123' } });
            expect(result).toEqual(mockCarnival);
        });

        it('should find an event by legacy fields if mySidelineId is not present', async () => {
            const eventData = { mySidelineTitle: 'Legacy Event', mySidelineDate: new Date('2024-01-01') };
            const mockCarnival = { id: 2, ...eventData };
            Carnival.findOne.mockResolvedValue(mockCarnival);

            const result = await service.findExistingMySidelineEvent(eventData);

            expect(Carnival.findOne).toHaveBeenCalledWith({
                where: {
                    mySidelineTitle: 'Legacy Event',
                    isManuallyEntered: false,
                    mySidelineDate: eventData.mySidelineDate,
                },
            });
            expect(result).toEqual(mockCarnival);
        });

        it('should find an event by date and title as a fallback', async () => {
            const eventData = { mySidelineId: 'non-existent-id', mySidelineTitle: 'non-existent-title', title: 'Fallback Event', date: new Date('2024-01-01') };
            const mockCarnival = { id: 3, title: 'Fallback Event', date: new Date('2024-01-01') };
            // First two findOne calls find nothing
            Carnival.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(mockCarnival);

            const result = await service.findExistingMySidelineEvent(eventData);

            expect(Carnival.findOne).toHaveBeenCalledTimes(3);
            expect(Carnival.findOne).toHaveBeenLastCalledWith({
                where: {
                    date: eventData.date,
                    title: 'Fallback Event',
                    isManuallyEntered: false,
                },
            });
            expect(result).toEqual(mockCarnival);
        });

        it('should return null if no matching event is found', async () => {
            const eventData = { title: 'Non-existent Event', date: new Date() };
            Carnival.findOne.mockResolvedValue(null);

            const result = await service.findExistingMySidelineEvent(eventData);

            expect(result).toBeNull();
            expect(Carnival.findOne).toHaveBeenCalled();
        });
    });

    describe('processScrapedEvents', () => {
        it('should create a new event if it does not exist', async () => {
            const scrapedEvents = [{ title: 'New Event', date: new Date() }];
            Carnival.findOne.mockResolvedValue(null); // No existing event
            const createdEvent = { id: 1, ...scrapedEvents[0], isRegistrationOpen: false };
            Carnival.create.mockResolvedValue(createdEvent);

            const result = await service.processScrapedEvents(scrapedEvents);

            expect(Carnival.create).toHaveBeenCalled();
            expect(result.length).toBe(1);
            expect(result[0].title).toBe('New Event');
        });

        it('should update an existing event with new information in empty fields', async () => {
            const existingEvent = {
                id: 1,
                title: 'Existing Event',
                mySidelineId: '123',
                locationAddress: null, // Field to be updated
                update: vi.fn().mockResolvedValue(this),
            };
            const scrapedEvents = [{ mySidelineId: '123', title: 'Existing Event', locationAddress: 'New Address' }];

            Carnival.findOne.mockResolvedValue(existingEvent);

            await service.processScrapedEvents(scrapedEvents);

            expect(existingEvent.update).toHaveBeenCalledWith(expect.objectContaining({
                locationAddress: 'New Address',
            }));
        });

        it('should only update lastMySidelineSync if no other fields need updating', async () => {
            const existingEvent = {
                id: 1,
                title: 'Fully Populated Event',
                mySidelineId: '456',
                locationAddress: 'Some Address',
                update: vi.fn().mockResolvedValue(this),
            };
            const scrapedEvents = [{ mySidelineId: '456', title: 'Fully Populated Event', locationAddress: 'Some Address' }];

            Carnival.findOne.mockResolvedValue(existingEvent);

            await service.processScrapedEvents(scrapedEvents);

            // The update call should only contain lastMySidelineSync
            const updateCallArg = existingEvent.update.mock.calls[0][0];
            expect(Object.keys(updateCallArg)).toEqual(['lastMySidelineSync']);
            expect(updateCallArg.lastMySidelineSync).toBeInstanceOf(Date);
        });
    });

    describe('shouldRunInitialSync', () => {
        it('should return true when SyncLog.shouldRunSync is true', async () => {
            SyncLog.shouldRunSync.mockResolvedValue(true);
            SyncLog.getLastSuccessfulSync.mockResolvedValue(null); // No previous sync

            const result = await service.shouldRunInitialSync();

            expect(result).toBe(true);
        });

        it('should return false when SyncLog.shouldRunSync is false', async () => {
            SyncLog.shouldRunSync.mockResolvedValue(false);
            SyncLog.getLastSuccessfulSync.mockResolvedValue({ completedAt: new Date() });

            const result = await service.shouldRunInitialSync();

            expect(result).toBe(false);
        });

        it('should return false on error', async () => {
            SyncLog.shouldRunSync.mockRejectedValue(new Error('DB error'));
            const result = await service.shouldRunInitialSync();
            expect(result).toBe(false);
        });
    });

    describe('parseDate', () => {
        it('should parse DD/MM/YYYY format', () => {
            const date = service.parseDate('27/07/2024');
            expect(date).toEqual(new Date(2024, 6, 27));
        });

        it('should parse "DD Month YYYY" format with ordinal', () => {
            const date = service.parseDate('27th July 2024');
            expect(date).toEqual(new Date(2024, 6, 27));
        });

        it('should parse "Month DD, YYYY" format', () => {
            const date = service.parseDate('July 27, 2024');
            expect(date).toEqual(new Date(2024, 6, 27));
        });

        it('should return null for invalid date string', () => {
            const date = service.parseDate('Invalid Date');
            expect(date).toBeNull();
        });

        it('should return null for empty input', () => {
            expect(service.parseDate('')).toBeNull();
            expect(service.parseDate(null)).toBeNull();
            expect(service.parseDate(undefined)).toBeNull();
        });
    });

    describe('deactivatePastCarnivals', () => {
        it('should deactivate carnivals with a date in the past', async () => {
            const pastCarnivals = [
                { id: 1, title: 'Past Event 1', date: new Date('2023-01-01') },
                { id: 2, title: 'Past Event 2', date: new Date('2023-02-01') },
            ];
            Carnival.findAll.mockResolvedValue(pastCarnivals);
            Carnival.update.mockResolvedValue([2]); // 2 records updated

            const result = await service.deactivatePastCarnivals();

            expect(Carnival.findAll).toHaveBeenCalledWith({
                where: {
                    isActive: true,
                    date: { [Op.lt]: expect.any(Date) },
                },
                attributes: ['id', 'title', 'date', 'state', 'isManuallyEntered'],
            });
            expect(Carnival.update).toHaveBeenCalledWith(
                { isActive: false, updatedAt: expect.any(Date) },
                { where: { isActive: true, date: { [Op.lt]: expect.any(Date) } } }
            );
            expect(result.success).toBe(true);
            expect(result.deactivatedCount).toBe(2);
        });

        it('should return success with 0 count if no past carnivals are found', async () => {
            Carnival.findAll.mockResolvedValue([]);

            const result = await service.deactivatePastCarnivals();

            expect(Carnival.update).not.toHaveBeenCalled();
            expect(result.success).toBe(true);
            expect(result.deactivatedCount).toBe(0);
        });

        it('should return failure on error', async () => {
            Carnival.findAll.mockRejectedValue(new Error('DB connection failed'));
            const result = await service.deactivatePastCarnivals();
            expect(result.success).toBe(false);
            expect(result.error).toBe('DB connection failed');
            expect(result.deactivatedCount).toBe(0);
        });
    });
});
