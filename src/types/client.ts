export interface ClientAuthorizedCompany {
  company_id: string;
  company_name: string;
  short_name?: string;
  tagline?: string;
  logo?: string;
  primary_color?: string;
  theme_key?: string;
}

export interface ClientKpiStats {
  companies_served: number;
  total_engineers: number;
  active_engineers: number;
  total_deployments: number;
  countries_covered: number;
  total_deployment_days: number;
  years_of_history: string;
  earliest_deployment_year?: number | null;
}

export interface ClientCompanyShowcaseItem {
  company_id: string;
  company_name: string;
  short_name?: string;
  tagline?: string;
  logo?: string;
  primary_color?: string;
  theme_key?: string;
  engineer_count: number;
  active_engineer_count: number;
  deployment_count: number;
  countries_count: number;
  countries: string[];
  operational_period: string;
  top_tools: string[];
}

export interface ClientOverviewResponse {
  kpi: ClientKpiStats;
  companies: ClientCompanyShowcaseItem[];
  authorized_companies: ClientAuthorizedCompany[];
}

export interface CompanyEngineerCount {
  company_id: string;
  company_name: string;
  short_name?: string;
  engineer_count: number;
  active_count: number;
  primary_color?: string;
}

export interface CompetencyLevelCount {
  level: string;
  count: number;
}

export interface TopToolCapability {
  tool_name: string;
  process?: string;
  engineer_count: number;
}

export interface ClientWorkforceResponse {
  total_engineers: number;
  active_deployed: number;
  available_standby: number;
  on_leave: number;
  by_company: CompanyEngineerCount[];
  by_competency_level: CompetencyLevelCount[];
  top_tools: TopToolCapability[];
}

export interface SpecificProductExpertise {
  product_name: string;
  variant?: string | null;
  engineer_count: number;
}

export interface ProductFamilyExpertise {
  family_name: string;
  total_engineers: number;
  products: SpecificProductExpertise[];
}

export interface ProcessExpertise {
  process_name: string;
  total_engineers: number;
  families: ProductFamilyExpertise[];
}

export interface IonToolExpertiseItem {
  tool_id?: string | null;
  tool_name: string;
  series?: string | null;
  display_order: number;
  engineer_count: number;
  level_counts: Record<string, number>;
}

export interface ClientExpertiseResponse {
  processes: ProcessExpertise[];
  ion_tools: IonToolExpertiseItem[];
}

export interface DeploymentYearMetric {
  year: number;
  deployments: number;
  total_days: number;
}

export interface DurationBucket {
  bucket: string;
  count: number;
  percentage: number;
}

export interface DeploymentTypeMetric {
  support_type: string;
  count: number;
}

export interface ClientDeploymentsResponse {
  total_deployments: number;
  completed_deployments: number;
  ongoing_deployments: number;
  future_deployments: number;
  total_deployment_days: number;
  average_duration_days: number;
  longest_deployment_days: number;
  engineers_with_multiple_deployments: number;
  deployments_by_year: DeploymentYearMetric[];
  duration_buckets: DurationBucket[];
  deployments_by_type: DeploymentTypeMetric[];
}

export interface GeographyCountryItem {
  name: string;
  code: string;
  value: number;
  percentage: number;
}

export interface ClientGeographyResponse {
  total_deployments: number;
  countries_count: number;
  countries: GeographyCountryItem[];
}

export interface ClientCompanyDetailResponse {
  company: ClientCompanyShowcaseItem;
  kpi: ClientKpiStats;
  workforce: ClientWorkforceResponse;
  deployments: ClientDeploymentsResponse;
  geography: ClientGeographyResponse;
  expertise: ClientExpertiseResponse;
}
