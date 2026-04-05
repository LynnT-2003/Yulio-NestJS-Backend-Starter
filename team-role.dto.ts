import { ApiProperty } from '@nestjs/swagger';

export enum TeamRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  MEMBER = 'MEMBER',
}

export class TeamRoleDto {
  @ApiProperty({ example: TeamRole.OWNER, enum: TeamRole })
  role: TeamRole;
}
