type ContinueNavigation = () => void;
type ResultLeaveGuard = (continueNavigation: ContinueNavigation) => void;

let activeGuard: ResultLeaveGuard | null = null;

export const setResultLeaveGuard = (guard: ResultLeaveGuard | null) => {
  activeGuard = guard;
};

export const hasResultLeaveGuard = () => activeGuard !== null;

export const confirmResultLeave = (continueNavigation: ContinueNavigation) => {
  if (!activeGuard) return false;
  activeGuard(continueNavigation);
  return true;
};
