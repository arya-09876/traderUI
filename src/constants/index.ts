import { AdminRequestsType, RequestStatus } from "../types";

const baseUrl = "https://2dtiwtxflj.execute-api.ap-south-1.amazonaws.com/prod/api";
const genders = [
  {
    name: "Unisex",
    code: "3",
  },
  {
    name: "Male",
    code: "2",
  },
  {
    name: "Female",
    code: "1",
  },
];

const requestStatusOptions = [
  { label: "Pending", value: RequestStatus.Pending },
  { label: "Accept", value: RequestStatus.Accept },
  { label: "Reject", value: RequestStatus.Reject },
];

const requestTypeOptions = [
  { label: "Seller Approvals", value: AdminRequestsType.sellerOnboarding },
  { label: "Product Approvals", value: AdminRequestsType.productApproval },
];

const PRODUCT_UNITS = [
  "Kg",
  "Gram",
  "Mg",
  "Litre",
  "ML",
  "Piece",
  "Pack",
  "Box",
  "Dozen",
  "Meter",
  "Centimeter",
];

export { baseUrl, genders, requestStatusOptions, requestTypeOptions, PRODUCT_UNITS };
