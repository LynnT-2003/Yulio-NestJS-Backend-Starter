import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ICurrentUser } from '../common/interfaces/user.interface';
import { globalValidationPipe } from '../common/pipes/validation.pipe';
import { UserService } from '../user/user.service';
import { SuspendUserDto } from './dto/suspend-user.dto';

@ApiTags('Admin - Moderation')
@ApiBearerAuth('JWT-auth')
@Roles(UserRole.ADMIN)
@Controller('admin/moderation')
export class AdminModerationController {
  constructor(private readonly userService: UserService) { }

  @Get('users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List users for platform moderation (paginated)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Case-insensitive match on email or display name',
  })
  @ApiQuery({
    name: 'suspended',
    required: false,
    enum: ['true', 'false'],
    description: 'Filter by suspension status',
  })
  @ApiResponse({ status: 200, description: 'Paginated user list with moderation fields' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('suspended') suspendedRaw?: string,
  ) {
    let suspended: boolean | undefined;
    if (suspendedRaw === 'true') suspended = true;
    else if (suspendedRaw === 'false') suspended = false;

    return this.userService.listUsersForModeration({
      page,
      limit,
      search,
      suspended,
    });
  }

  @Get('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get one user including moderation fields' })
  @ApiParam({ name: 'id', description: 'User MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'User with moderation fields' })
  @ApiResponse({ status: 400, description: 'Invalid id' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUser(@Param('id') id: string) {
    return this.userService.getUserForModerationById(id);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @UsePipes(globalValidationPipe)
  @ApiOperation({
    summary: 'Suspend a user (revokes all refresh tokens; cannot target admins or self)',
  })
  @ApiParam({ name: 'id', description: 'User MongoDB ObjectId' })
  @ApiBody({ type: SuspendUserDto })
  @ApiResponse({ status: 200, description: 'User suspended' })
  @ApiResponse({ status: 400, description: 'Invalid id or policy violation' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  suspendUser(
    @CurrentUser() actor: ICurrentUser,
    @Param('id') id: string,
    @Body() dto: SuspendUserDto,
  ) {
    return this.userService.suspendUser(actor.userId, id, dto.reason);
  }

  @Post('users/:id/unsuspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clear suspension for a user' })
  @ApiParam({ name: 'id', description: 'User MongoDB ObjectId' })
  @ApiResponse({ status: 200, description: 'Suspension cleared' })
  @ApiResponse({ status: 400, description: 'Invalid id' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden — admin role required' })
  @ApiResponse({ status: 404, description: 'User not found' })
  unsuspendUser(@Param('id') id: string) {
    return this.userService.unsuspendUser(id);
  }
}
