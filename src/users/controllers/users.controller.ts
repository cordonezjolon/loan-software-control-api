import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from '../services/user.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../auth/entities/user.entity';
import { CreateUserDto } from '../../auth/dto/create-user.dto';
import { UpdateUserDto } from '../../auth/dto/update-user.dto';
import { ChangePasswordDto } from '../../auth/dto/password-management.dto';
import { UserProfileDto, UserListDto } from '../../auth/dto/user-profile.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly userService: UserService) {}

  // ==================== Public User Info ====================

  @Get('profile')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async getCurrentUserProfile(@GetUser() user: User): Promise<UserProfileDto> {
    return this.userService.findById(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async updateProfile(@GetUser() user: User, @Body() updateUserDto: UpdateUserDto): Promise<UserProfileDto> {
    return this.userService.updateUser(user.id, updateUserDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Change password for current user' })
  @ApiResponse({ status: 204 })
  async changePassword(@GetUser() user: User, @Body() changePasswordDto: ChangePasswordDto): Promise<void> {
    return this.userService.changePassword(user.id, changePasswordDto);
  }

  // ==================== Admin Only: User Management ====================

  @Get()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiResponse({ status: 200 })
  async listUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: UserRole,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ): Promise<{ data: UserListDto[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;
    const { data, total } = await this.userService.findMany({
      skip,
      take: limit,
      search,
      role,
      sortBy: (sortBy as keyof User) || 'createdAt',
      sortOrder: sortOrder || 'DESC',
    });

    return {
      data,
      total,
      page,
      limit,
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get user by ID (admin only)' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async getUserById(@Param('id', ParseUUIDPipe) id: string): Promise<UserProfileDto> {
    return this.userService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create new user (admin only)' })
  @ApiResponse({ status: 201, type: UserProfileDto })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserProfileDto> {
    return this.userService.createUser(createUserDto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update user by ID (admin only)' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserProfileDto> {
    return this.userService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by ID (admin only) - soft delete' })
  @ApiResponse({ status: 204 })
  async deleteUser(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.userService.deleteUser(id, true);
  }

  @Post(':id/restore')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Restore deleted user (admin only)' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async restoreUser(@Param('id', ParseUUIDPipe) id: string): Promise<UserProfileDto> {
    return this.userService.restoreUser(id);
  }

  @Post(':id/activate')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Activate user account (admin only)' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async activateUser(@Param('id', ParseUUIDPipe) id: string): Promise<UserProfileDto> {
    return this.userService.activateUser(id);
  }

  @Post(':id/deactivate')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Deactivate user account (admin only)' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async deactivateUser(@Param('id', ParseUUIDPipe) id: string): Promise<UserProfileDto> {
    return this.userService.deactivateUser(id);
  }

  @Post(':id/suspend')
  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Suspend user account (admin only)' })
  @ApiResponse({ status: 200, type: UserProfileDto })
  async suspendUser(@Param('id', ParseUUIDPipe) id: string): Promise<UserProfileDto> {
    return this.userService.suspendUser(id);
  }
}
