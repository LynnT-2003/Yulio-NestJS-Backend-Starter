import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRole } from '../common/enums/user-role.enum';
import { Types } from 'mongoose';

const mockUserService = {
  findById: jest.fn(),
  toPublic: jest.fn(),
  updateUser: jest.fn(),
  removeAllRefreshTokens: jest.fn(),
  updateUserRoleById: jest.fn(),
};

const mockUser = { userId: 'uid1', email: 'a@b.com', role: UserRole.USER, isSuspended: false };

describe('UserController', () => {
  let controller: UserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [{ provide: UserService, useValue: mockUserService }],
    }).compile();

    controller = module.get(UserController);
    jest.clearAllMocks();
  });

  describe('getMe', () => {
    it('returns toPublic of found user', async () => {
      const doc = { _id: new Types.ObjectId() };
      mockUserService.findById.mockResolvedValue(doc);
      mockUserService.toPublic.mockReturnValue({ email: 'a@b.com' });
      const result = await controller.getMe(mockUser);
      expect(mockUserService.findById).toHaveBeenCalledWith('uid1');
      expect(result).toHaveProperty('email');
    });
  });

  describe('updateMe', () => {
    it('delegates to userService.updateUser', async () => {
      mockUserService.updateUser.mockResolvedValue({ displayName: 'New' });
      const result = await controller.updateMe(mockUser, { displayName: 'New' });
      expect(mockUserService.updateUser).toHaveBeenCalledWith('uid1', { displayName: 'New' });
      expect(result).toHaveProperty('displayName');
    });
  });

  describe('deleteMe', () => {
    it('calls removeAllRefreshTokens and returns message', async () => {
      mockUserService.removeAllRefreshTokens.mockResolvedValue(undefined);
      const result = await controller.deleteMe(mockUser);
      expect(mockUserService.removeAllRefreshTokens).toHaveBeenCalledWith('uid1');
      expect(result.message).toContain('deleted');
    });
  });

  describe('adminOnly', () => {
    it('returns toPublic for admin user', async () => {
      const doc = { _id: new Types.ObjectId() };
      mockUserService.findById.mockResolvedValue(doc);
      mockUserService.toPublic.mockReturnValue({ role: UserRole.ADMIN });
      const result = await controller.adminOnly({ ...mockUser, role: UserRole.ADMIN });
      expect(result).toHaveProperty('role');
    });
  });
});
