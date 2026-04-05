import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { MemberInvitationService } from '../service/member-invitation.service';

@Controller('member-invitations')
export class MemberInvitationController {
  constructor(private readonly memberInvitationService: MemberInvitationService) {}

  @Post()
  async create(@Body() createMemberInvitationDto: CreateMemberInvitationDto): Promise<any> {
    return this.memberInvitationService.create(createMemberInvitationDto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<any> {
    return this.memberInvitationService.findOne(id);
  }

  @Put(':id/accept')
  async accept(@Param('id') id: string): Promise<any> {
    return this.memberInvitationService.accept(id);
  }

  @Put(':id/reject')
  async reject(@Param('id') id: string): Promise<any> {
    return this.memberInvitationService.reject(id);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<any> {
    return this.memberInvitationService.remove(id);
  }
}
