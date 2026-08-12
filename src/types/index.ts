export type EngineerStatus = 'Active' | 'Deployed' | 'On Leave' | 'In Transit' | 'Training';
export type CompetencyLevel = 'L1 Junior' | 'L2 Specialist' | 'L3 Senior' | 'L4 Master' | 'L5 Principal Expert';
export type VisaStatus = 'Valid' | 'Expiring Soon' | 'Expired' | 'In Progress' | 'Renewal Pending';
export type TravelStatus = 'Confirmed' | 'Pending Approval' | 'In Transit' | 'Completed' | 'Cancelled';
export type ScheduleStatus = 'Active Assignment' | 'Upcoming' | 'Completed' | 'Standby';
export type UserRole = 'Global Admin' | 'Company Admin' | 'Resource Manager' | 'Field Engineer' | 'Viewer';

export interface Company {
  id: string;
  name: string;
  code: string;
  company_id: string;
  company_name: string;
  short_name: string;
  logo: string;
  tagline: string;
  primaryColor: string;
  primaryHover: string;
  secondaryColor: string;
  accentColor: string;
  accentTransparent: string;
  backgroundColor: string;
  cardColor: string;
  sidebarColor: string;
  sidebarActiveColor: string;
  textColor: string;
  textMutedColor: string;
  textSecondaryAccent?: string;
  textOnPrimary?: string;
  textMainReverse?: string;
  borderColor: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: UserRole;
  currentCompanyId: string;
  accessibleCompanies: string[];
}

export interface Engineer {
  id: string;
  orbitId: string;
  customerId: string;
  name: string;
  goesBy?: string;
  email: string;
  phone: string;
  status: EngineerStatus;
  primaryTool: string;
  level: CompetencyLevel;
  country: string;
  city: string;
  assignedSite?: string;
  yearsExperience: number;
  customerExperience?: number;
  certificationsCount: number;
  activeProjectsCount: number;
  avatarUrl?: string;
  joinDate: string;
}

export interface Skill {
  id: string;
  engineerId: string;
  toolModel: string;
  category: 'Etch' | 'Deposition' | 'Clean' | 'Metrology' | 'Ion Implantation' | 'Lithography';
  competencyLevel: CompetencyLevel;
  certified: boolean;
  lastAssessedDate: string;
  certificationAuthority?: string;
  country?: string;
  fab?: string;
  waferSize?: string;
  toolType?: string;
  startDate?: string;
  endDate?: string;
  numberOfTools?: number;
  role?: string;
  previousProcessStartup?: boolean;
  previousCmPm?: boolean;
  readyForPrimaryRole?: boolean;
  comments?: string;
}

export interface Schedule {
  id: string;
  engineerId: string;
  engineerName: string;
  engineerOrbitId?: string;
  customerName: string;
  siteLocation: string;
  country: string;
  projectCode: string;
  startDate: string;
  endDate: string;
  status: ScheduleStatus;
  shiftType: 'Day Shift' | 'Night Shift' | 'Rotational' | 'On-Call';
  supportType?: string;
  fabCity?: string;
  fabSite?: string;
  scheduleStatus?: string;
  remarks?: string;
}

export interface Travel {
  id: string;
  engineerId: string;
  engineerName: string;
  engineerOrbitId?: string;
  originCountry: string;
  destinationCountry: string;
  departureDate: string;
  returnDate: string;
  visaRequired: boolean;
  status: TravelStatus;
  flightNumber: string;
  hotelBooking: string;
  purpose: string;
  bookingDate?: string;
  travelDate?: string;
  comments?: string;
  scheduleId?: string;
  ownerId?: string;
}

export interface Visa {
  id: string;
  engineerId: string;
  engineerName: string;
  engineerOrbitId?: string;
  country: string;
  visaType: string;
  passportNumber: string;
  issueDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  status: VisaStatus;
  appliedOn?: string;
  ownerId?: string;
}

export interface Performance {
  id: string;
  engineerId: string;
  engineerName: string;
  engineerOrbitId?: string;
  rating: number; // 1 - 5
  projectsCompleted: number;
  customerFeedbackScore: number; // percentage e.g. 98
  onTimeArrivalRate: number; // percentage e.g. 99
  reviewDate: string;
  reviewer: string;
  notes: string;
  actualStartDate?: string;
  actualEndDate?: string;
  escalation?: boolean;
  escalationReason?: string;
  feedback?: string;
  score?: number;
  attachment?: string;
  scheduleId?: string;
  ownerId?: string;
}

export interface Leave {
  id: string;
  engineerId: string;
  engineerName: string;
  startDate: string;
  endDate: string;
  type: 'Annual Leave' | 'Sick Leave' | 'Training' | 'Emergency';
  status: 'Approved' | 'Pending' | 'Rejected';
  reason: string;
  leaveType?: string;
  requestedDate?: string;
  requestedOn?: string;
  approvalStatus?: string;
  ownerId?: string;
}

export interface ReportSummary {
  id: string;
  title: string;
  category: 'Engineers' | 'Travel' | 'Visa' | 'Utilization' | 'Performance';
  generatedAt: string;
  generatedBy: string;
  format: 'PDF' | 'CSV' | 'XLSX';
  downloadUrl: string;
}

export interface UploadCardItem {
  id: string;
  title: string;
  description: string;
  targetEndpoint: string;
  acceptedFormats: string[];
  templateUrl: string;
  lastUploaded?: string;
  lastUploadedBy?: string;
  status: 'Idle' | 'Validating' | 'Success' | 'Error';
}

export interface MissedSchedule {
  id: string;
  engineerId: string;
  engineerName: string;
  engineerOrbitId?: string;
  requestedStartDate: string;
  requestedEndDate: string;
  actualStartDate: string;
  actualEndDate: string;
  reasonForChange: string;
  notesAttachEvidence: string;
  owner: string;
  scheduleId?: string;
  ownerId?: string;
  reason?: string;
  evidence?: string;
}
