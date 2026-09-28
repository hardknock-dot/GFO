export interface IonSkillTool {
  tool_id: string;
  tool_name: string;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface IonSkillAssessment {
  assessment_id: string;
  experience_id: string;
  engineer_id: string;
  company_id: string;
  tool_id: string;
  tool_name?: string;
  display_order?: number;
  skill_level: number;
  assessment_comment?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IonSkillAssessmentCreateItem {
  tool_id: string;
  skill_level: number;
  assessment_comment?: string | null;
}

export interface IonSkillAssessmentUpdateItem {
  assessment_id?: string;
  tool_id: string;
  skill_level: number;
  assessment_comment?: string | null;
}

export interface IonSkillExperience {
  experience_id: string;
  engineer_id: string;
  engineer_name?: string;
  orbit_id?: string;
  avatar_url?: string;
  company_id: string;
  where_location: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  assessments: IonSkillAssessment[];
  created_at?: string;
  updated_at?: string;
}

export interface IonSkillExperienceCreatePayload {
  engineer_id: string;
  where_location: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  assessments: IonSkillAssessmentCreateItem[];
}

export interface IonSkillExperienceUpdatePayload {
  where_location?: string;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  assessments?: IonSkillAssessmentUpdateItem[];
}

export interface IonEngineerCurrentSkillItem {
  tool_id: string;
  tool_name: string;
  display_order: number;
  skill_level: number;
  assessment_comment?: string | null;
  experience_id: string;
  where_location: string;
  start_date?: string | null;
  end_date?: string | null;
  assessed_at?: string | null;
}

export interface IonEngineerSkillSummary {
  engineer_id: string;
  engineer_name: string;
  orbit_id: string;
  avatar_url?: string | null;
  current_skills: IonEngineerCurrentSkillItem[];
}

export interface IonSkillHistoryItem {
  assessment_id: string;
  experience_id: string;
  engineer_id: string;
  tool_id: string;
  tool_name: string;
  skill_level: number;
  assessment_comment?: string | null;
  where_location: string;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface IonSkillQueryParams {
  engineer_id?: string;
  tool_id?: string;
  skill_level?: number;
  min_skill_level?: number;
  search?: string;
  where_location?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}
