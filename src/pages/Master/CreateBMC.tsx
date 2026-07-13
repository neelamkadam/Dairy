import CreateBmcCc, { BmcCcApiAdapter } from "./CreateBmcCc";
import { bmcApi } from "@/services/routeBmcCcApi";

const bmcAdapter: BmcCcApiAdapter = {
  // ccId is required by the backend — CreateBmcCc enforces it via requiresCc.
  create: ({ adminId, ccId, name, villagename, address, ownername, password }) =>
    bmcApi.create({ adminId, ccId: ccId!, name, villagename, address, ownername, password }),
  list: (userId) => bmcApi.list(userId),
  update: ({ id, ccId, name, villagename, address, ownername, password }) =>
    bmcApi.update({ bmcId: id, ccId, name, villagename, address, ownername, password }),
  vlcs: (id) => bmcApi.vlcs(id),
  assign: ({ adminId, userId, id }) => bmcApi.assign({ adminId, userId, bmcId: id }),
  unassign: ({ userId, id }) => bmcApi.unassign({ userId, bmcId: id }),
  remove: (id) => bmcApi.remove(id),
};

const CreateBMC = () => <CreateBmcCc entityLabel="BMC" api={bmcAdapter} requiresCc />;

export default CreateBMC;
