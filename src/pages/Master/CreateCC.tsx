import CreateBmcCc, { BmcCcApiAdapter } from "./CreateBmcCc";
import { ccApi } from "@/services/routeBmcCcApi";

const ccAdapter: BmcCcApiAdapter = {
  create: ({ adminId, name, villagename, address, ownername, password }) =>
    ccApi.create({ adminId, name, villagename, address, ownername, password }),
  list: (userId) => ccApi.list(userId),
  update: ({ id, name, villagename, address, ownername, password }) =>
    ccApi.update({ ccId: id, name, villagename, address, ownername, password }),
  vlcs: (id) => ccApi.vlcs(id),
  assign: ({ adminId, userId, id }) => ccApi.assign({ adminId, userId, ccId: id }),
  unassign: ({ userId, id }) => ccApi.unassign({ userId, ccId: id }),
  remove: (id) => ccApi.remove(id),
};

const CreateCC = () => <CreateBmcCc entityLabel="CC" api={ccAdapter} />;

export default CreateCC;
