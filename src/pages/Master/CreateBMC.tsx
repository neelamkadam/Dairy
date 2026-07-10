import CreateBmcCc, { BmcCcApiAdapter } from "./CreateBmcCc";
import { bmcApi } from "@/services/routeBmcCcApi";

const bmcAdapter: BmcCcApiAdapter = {
  create: (p) => bmcApi.create(p),
  list: (userId) => bmcApi.list(userId),
  update: ({ id, name, location }) => bmcApi.update({ bmcId: id, name, location }),
  assign: ({ adminId, userId, id }) => bmcApi.assign({ adminId, userId, bmcId: id }),
  unassign: ({ userId, id }) => bmcApi.unassign({ userId, bmcId: id }),
  remove: (id) => bmcApi.remove(id),
};

const CreateBMC = () => <CreateBmcCc entityLabel="BMC" api={bmcAdapter} />;

export default CreateBMC;
