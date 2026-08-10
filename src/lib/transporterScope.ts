/**
 * Filter a list of "container" files (each with an array of blocks keyed by
 * transporter) down to the transporters the current user is scoped to.
 *
 * Returns files whose block list is non-empty after filtering. Blocks are
 * shallow-copied so the underlying persisted state is untouched.
 */
export const filterFilesByTransporter = <
  Block extends { transporter?: string },
  File extends { drivers: Block[] },
>(
  files: File[],
  isTransporterStaff: boolean,
  matchesTransporter: (v: string | null | undefined) => boolean,
): File[] => {
  if (!isTransporterStaff) return files;
  return files
    .map((f) => ({
      ...f,
      drivers: f.drivers.filter((d) => matchesTransporter(d.transporter)),
    }))
    .filter((f) => f.drivers.length > 0);
};
