export interface TeamMember {
  user: number;
  joined_at?: Date;
  active?: boolean;
}

export interface AssignedSession {
  session_template: number;
  assign_at?: Date;
  active?: boolean;
}
