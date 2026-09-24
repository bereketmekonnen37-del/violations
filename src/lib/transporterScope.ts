/**
 * Filter a list of "container" files (each with an array of blocks keyed by
 * transporter) down to the transporters the current user is scoped to.
 *
 * Returns files whose block list is non-empty after filtering. Blocks are
 * shallow-copied so the underlying persisted state is untouched. The block
 * predicate should be the roster-aware `matchesBlock` from `useUserScope`,
 * so a block for a VID mapped to an assigned transporter still passes even
 * when the raw upload cell is blank or spelled inconsistently.
 */
export const filterFilesByTransporter = <
  Block extends {
    vid?: string | null;
    transporter?: string | null;
    driverName?: string | null;
  },
  File extends { drivers: Block[] },
>(
  files: File[],
  isTransporterStaff: boolean,
  matchesBlock: (b: {
    vid?: string | null;
    transporter?: string | null;
    driverName?: string | null;
  }) => boolean,
): File[] => {
  if (!isTransporterStaff) return files;
  return files
    .map((f) => ({
      ...f,
      drivers: f.drivers.filter((d) => matchesBlock(d)),
    }))
    .filter((f) => f.drivers.length > 0);
};
