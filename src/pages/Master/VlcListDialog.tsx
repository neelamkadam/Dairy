import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface VlcListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  vlcs: any[];
  isLoading: boolean;
}

// Shows the dairies (VLCs) linked under a CC / BMC.
const VlcListDialog = ({ open, onOpenChange, title, vlcs, isLoading }: VlcListDialogProps) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-2xl bg-white">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="text-sm text-gray-500 text-center py-8">Loading...</div>
        ) : vlcs.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-8">
            No VLCs linked yet
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="text-gray-700 font-semibold">ID</TableHead>
                <TableHead className="text-gray-700 font-semibold">Name</TableHead>
                <TableHead className="text-gray-700 font-semibold">Branch</TableHead>
                <TableHead className="text-gray-700 font-semibold">Village</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vlcs.map((vlc: any, index: number) => (
                <TableRow key={vlc?.dairy_id ?? index}>
                  <TableCell className="font-medium">
                    {vlc?.dairy_id ?? "-"}
                  </TableCell>
                  <TableCell>{vlc?.name ?? "-"}</TableCell>
                  <TableCell>{vlc?.branchname ?? "-"}</TableCell>
                  <TableCell>{vlc?.villagename ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </DialogContent>
  </Dialog>
);

export default VlcListDialog;
