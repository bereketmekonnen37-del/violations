export type UserRole = 'boss' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  /** Transporters this user is scoped to. Set for boss-created staff; undefined for boss or legacy uploader-staff. */
  assignedTransporters?: string[];
}

/** Staff account managed by the boss from the User Management page. Backed
 *  by a real Supabase Auth account + `profiles` row — passwords are never
 *  readable, only settable (via the `manage-staff-user` edge function). */
export interface ManagedStaffUser {
  id: string;
  name: string;
  email: string;
  assignedTransporters: string[];
  createdAt: string;
}

export interface StaffUsersState {
  users: ManagedStaffUser[];
  status: RemoteLoadStatus;
  error: string | null;
}

export type Theme = 'light' | 'dark';

export type FileKind = 'csv' | 'xlsx' | 'xls' | 'pdf';

export type GpsStatus = 'on' | 'off' | 'unknown';

export interface ViolationRecord {
  id: string;
  transporter: string;
  driverName: string;
  vid: string;
  date: string;
  eventType: string;
  location: string;
  distanceKmHr: string;
  duration: string;
  gpsFunctionality: GpsStatus;
  remarks: string;
}

export interface ViolationFile {
  id: string;
  title: string;
  uploadDate: string;
  fileType: FileKind;
  uploaderId: string;
  uploaderName: string;
  rowCount: number;
  records: ViolationRecord[];
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  /** True until the initial Supabase session check on app load has finished. */
  initializing: boolean;
}

export interface ThemeState {
  mode: Theme;
}

export interface UploadsState {
  files: ViolationFile[];
  status: RemoteLoadStatus;
  error: string | null;
}

export interface ProfileState {
  photo: string | null;
  preferences: {
    theme: Theme;
  };
}

/* ──────────────── Unfiltered violations feature ──────────────── */

export interface OverspeedEvent {
  id: string;
  start: string;
  end: string;
  duration: string;
  topSpeed: string;
  overspeedPosition: string;
  location: string;
  gpsCoords: string;
  remarks: string;
  eventType: string;
  transporter: string;
}

export interface DriverBlock {
  id: string;
  driverName: string;
  vid: string;
  plate: string;
  period: string;
  transporter: string;
  source: ContinuousSource;
  events: OverspeedEvent[];
}

export type UnfilteredFileKind = 'csv' | 'xlsx' | 'xls';

export interface UnfilteredFile {
  id: string;
  title: string;
  uploadDate: string;
  uploaderId: string;
  uploaderName: string;
  fileType: UnfilteredFileKind;
  source: ContinuousSource;
  drivers: DriverBlock[];
  totalEvents: number;
}

export type RemoteLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface UnfilteredState {
  files: UnfilteredFile[];
  status: RemoteLoadStatus;
  error: string | null;
}

/* ──────────────── Unfiltered nights feature ──────────────── */

export interface NightRow {
  id: string;
  timeA: string;
  positionA: string;
  timeB: string;
  positionB: string;
  duration: string;
  length: string;
  /** Global export only — `Average Speed` column. */
  averageSpeed?: string;
  /** Global export only — `Max Speed` column. */
  maxSpeed?: string;
}

export interface NightDriverBlock {
  id: string;
  driverName: string;
  vid: string;
  plate: string;
  period: string;
  transporter: string;
  source: ContinuousSource;
  rows: NightRow[];
}

export interface UnfilteredNightFile {
  id: string;
  title: string;
  uploadDate: string;
  uploaderId: string;
  uploaderName: string;
  fileType: UnfilteredFileKind;
  source: ContinuousSource;
  drivers: NightDriverBlock[];
  totalRows: number;
}

export interface UnfilteredNightsState {
  files: UnfilteredNightFile[];
  status: RemoteLoadStatus;
  error: string | null;
}

/* ──────────────── Unfiltered continuous feature ──────────────── */

export interface ContinuousRow {
  id: string;
  timeA: string;
  positionA: string;
  timeB: string;
  positionB: string;
  duration: string;
  length: string;
}

export type ContinuousSource = 'mela' | 'global';

export interface ContinuousDriverBlock {
  id: string;
  driverName: string;
  vid: string;
  plate: string;
  period: string;
  transporter: string;
  source: ContinuousSource;
  rows: ContinuousRow[];
}

export interface UnfilteredContinuousFile {
  id: string;
  title: string;
  uploadDate: string;
  uploaderId: string;
  uploaderName: string;
  fileType: UnfilteredFileKind;
  source: ContinuousSource;
  drivers: ContinuousDriverBlock[];
  totalRows: number;
}

export interface UnfilteredContinuousState {
  files: UnfilteredContinuousFile[];
  status: RemoteLoadStatus;
  error: string | null;
}

/* ──────────────── Drivers monthly data feature ──────────────── */

export interface DriverRecord {
  id: string;
  vid: string;
  driverName: string;
  transporter: string;
}

export interface DriversDataState {
  period: string;
  uploadedAt: string | null;
  uploaderId: string | null;
  uploaderName: string | null;
  fileName: string | null;
  fileType: UnfilteredFileKind | null;
  records: DriverRecord[];
  status: RemoteLoadStatus;
  error: string | null;
}
