export interface ITeamService {
  getTeams(): Promise<Team[]>;
  getTeamById(id: string): Promise<Team | null>;
  createTeam(team: TeamDto): Promise<Team>;
  updateTeam(id: string, team: UpdateTeamDto): Promise<Team | null>;
  deleteTeam(id: string): Promise<void>;
}
