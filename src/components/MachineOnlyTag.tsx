import { Lock } from "lucide-react";

/** Next to a field's label: it can only be filled by the machine (the user's Machine Entry Lock). */
const MachineOnlyTag = () => (
  <span className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-semibold text-purple-600 normal-case tracking-normal align-middle">
    <Lock className="h-3 w-3" /> machine only
  </span>
);

export default MachineOnlyTag;
