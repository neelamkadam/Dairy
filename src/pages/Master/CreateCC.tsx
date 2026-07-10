import CreateBmcCc, { BmcCcApiAdapter } from "./CreateBmcCc";
import { ccApi } from "@/services/routeBmcCcApi";

const ccAdapter: BmcCcApiAdapter = {
  create: (p) => ccApi.create(p),
  list: (userId) => ccApi.list(userId),
  update: ({ id, name, location }) => ccApi.update({ ccId: id, name, location }),
  assign: ({ adminId, userId, id }) => ccApi.assign({ adminId, userId, ccId: id }),
  unassign: ({ userId, id }) => ccApi.unassign({ userId, ccId: id }),
  remove: (id) => ccApi.remove(id),
};

const CreateCC = () => <CreateBmcCc entityLabel="CC" api={ccAdapter} />;

export default CreateCC;
