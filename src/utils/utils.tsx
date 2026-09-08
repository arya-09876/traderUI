export const capitalize = (value?: any) => {
  if (!value) return "";
  const str = String(value);
  return str.charAt(0).toUpperCase() + str.slice(1);
};

export const formatDate = (date?: Date | string): string => {
  if (!date) return "";

  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
};

export const formatIndianCurrency = (amount?: number | null): string => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatNumberInIN = (num?: number | null): string => {
  if (num === undefined || num === null || isNaN(num)) return "0";
  return new Intl.NumberFormat("en-IN").format(num);
};

export const maskBankAccount = (accountNumber?: string | null): string => {
  if (!accountNumber) return "";
  const cleaned = String(accountNumber).trim().replace(/\s+/g, "");
  if (cleaned.length <= 4) return "•••• " + cleaned;
  const last4 = cleaned.slice(-4);
  return "•••• •••• " + last4;
};

export interface CommissionValidationResult {
  isValid: boolean;
  total: number;
  target: number;
  remaining: number;
  message: string;
  status: "success" | "warning" | "error";
}

export const validateCommissionAllocation = (
  promoterVal: string | number | undefined,
  connectorVal: string | number | undefined,
  platformVal: string | number | undefined,
  targetFeeVal: string | number | undefined
): CommissionValidationResult => {
  const pComm = parseFloat(String(promoterVal || 0)) || 0;
  const cComm = parseFloat(String(connectorVal || 0)) || 0;
  const platFee = parseFloat(String(platformVal || 0)) || 0;
  const targetFee = parseFloat(String(targetFeeVal || 0)) || 0;

  const total = Number((pComm + cComm + platFee).toFixed(4));
  const target = Number(targetFee.toFixed(4));

  if (target <= 0) {
    return {
      isValid: false,
      total,
      target,
      remaining: 0,
      message: "Promotion Fee percentage from API is missing or invalid.",
      status: "error",
    };
  }

  const diff = Number((total - target).toFixed(4));

  if (Math.abs(diff) < 0.0001) {
    return {
      isValid: true,
      total,
      target,
      remaining: 0,
      message: "Commission allocation is complete.",
      status: "success",
    };
  } else if (diff > 0) {
    return {
      isValid: false,
      total,
      target,
      remaining: 0,
      message: `Total commission cannot exceed the available Promotion Fee of ${target}%.`,
      status: "error",
    };
  } else {
    const remaining = Number((target - total).toFixed(4));
    return {
      isValid: false,
      total,
      target,
      remaining,
      message: `Please allocate the remaining ${remaining}% to complete the total Promotion Fee of ${target}%.`,
      status: "warning",
    };
  }
};


