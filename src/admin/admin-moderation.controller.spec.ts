import { Test, TestingModule } from '@nestjs/testing';
import { AdminModerationController } from './admin-moderation.controller';
import { UserService } from '../user/user.service';
import { UserRole } from '../common/enums/user-role.enum';

const mockUserService = {
  listUsersForModeration: jest.fn(),
  getUserForModerationById: jest.fn(),
  suspendUser: jest.fn(),
  unsuspendUser: jest.fn(),
};

const mockActor = { userId: 'actor1', email: 'admin@example.com', role: UserRole.ADMIN, isSuspended: false };

describe('AdminModerationController', () => {
  let controller: AdminModerationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminModerationController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get(AdminModerationController);
    jest.clearAllMocks();
  });

  describe('listUsers', () => {
    it('delegates with numeric page and limit', async () => {
      mockUserService.listUsersForModeration.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
      await controller.listUsers(1, 20, undefined, undefined);
      expect(mockUserService.listUsersForModeration).toHaveBeenCalledWith({
        page: 1, limit: 20, search: undefined, suspended: undefined,
      });
    });

    it('converts suspended=true string to boolean', async () => {
      mockUserService.listUsersForModeration.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
      await controller.listUsers(1, 20, undefined, 'true');
      expect(mockUserService.listUsersForModeration).toHaveBeenCalledWith(
        expect.objectContaining({ suspended: true }),
      );
    });

    it('converts suspended=false string to boolean', async () => {
      mockUserService.listUsersForModeration.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
      await controller.listUsers(1, 20, undefined, 'false');
      expect(mockUserService.listUsersForModeration).toHaveBeenCalledWith(
        expect.objectContaining({ suspended: false }),
      );
    });
  });

  it('getUser delegates to getUserForModerationById', async () => {
    mockUserService.getUserForModerationById.mockResolvedValue({ _id: '1' });
    await controller.getUser('1');
    expect(mockUserService.getUserForModerationById).toHaveBeenCalledWith('1');
  });

  it('suspendUser passes actor userId, target id and reason', async () => {
    mockUserService.suspendUser.mockResolvedValue({});
    await controller.suspendUser(mockActor, 'target1', { reason: 'spam' });
    expect(mockUserService.suspendUser).toHaveBeenCalledWith('actor1', 'target1', 'spam');
  });

  it('unsuspendUser delegates to unsuspendUser', async () => {
    mockUserService.unsuspendUser.mockResolvedValue({});
    await controller.unsuspendUser('target1');
    expect(mockUserService.unsuspendUser).toHaveBeenCalledWith('target1');
  });
});
