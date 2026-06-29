export type UserRole = 'boss' | 'staff';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
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
}

export interface ThemeState {
  mode: Theme;
}

export interface UploadsState {
  files: ViolationFile[];
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
  period: string;
  transporter: string;
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
  drivers: DriverBlock[];
  totalEvents: number;
}

export interface UnfilteredState {
  files: UnfilteredFile[];
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
}

export interface NightDriverBlock {
  id: string;
  driverName: string;
  vid: string;
  period: string;
  transporter: string;
  rows: NightRow[];
}

export interface UnfilteredNightFile {
  id: string;
  title: string;
  uploadDate: string;
  uploaderId: string;
  uploaderName: string;
  fileType: UnfilteredFileKind;
  drivers: NightDriverBlock[];
  totalRows: number;
}

export interface UnfilteredNightsState {
  files: UnfilteredNightFile[];
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

export interface ContinuousDriverBlock {
  id: string;
  driverName: string;
  vid: string;
  period: string;
  transporter: string;
  rows: ContinuousRow[];
}

export interface UnfilteredContinuousFile {
  id: string;
  title: string;
  uploadDate: string;
  uploaderId: string;
  uploaderName: string;
  fileType: UnfilteredFileKind;
  drivers: ContinuousDriverBlock[];
  totalRows: number;
}

export interface UnfilteredContinuousState {
  files: UnfilteredContinuousFile[];
}

/* ──────────────── Drivers monthly data feature ──────────────── */

export interface DriverRecord {
  id: string;
  vid: string;
  driverName: string;
}

export interface DriversDataState {
  period: string;
  uploadedAt: string | null;
  uploaderId: string | null;
  uploaderName: string | null;
  fileName: string | null;
  fileType: UnfilteredFileKind | null;
  records: DriverRecord[];
}
