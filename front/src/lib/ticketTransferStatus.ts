export type TransferUiState =
  | "available"
  | "pending"
  | "transferred_out"
  | "unavailable";

export type TransferUi = {
  state: TransferUiState;
  label: string;
  hint?: string;
  badgeClass: string;
  canTransfer: boolean;
};

export function getTransferUi(opts: {
  allowTicketTransfer?: boolean;
  isTransferredOut?: boolean;
  transferPending?: boolean;
  transferRecipientEmail?: string | null;
  isPast?: boolean;
  isCancelled?: boolean;
  isRefunded?: boolean;
  isUsed?: boolean;
  refundRequestStatus?: string | null;
}): TransferUi {
  if (opts.isTransferredOut) {
    return {
      state: "transferred_out",
      label: "Передан",
      hint: opts.transferRecipientEmail
        ? `Билет передан на ${opts.transferRecipientEmail}`
        : "Билет успешно передан другу",
      badgeClass: "bg-sky-500/15 text-sky-300 border-sky-500/25",
      canTransfer: false,
    };
  }

  if (opts.transferPending) {
    return {
      state: "pending",
      label: "Ожидает друга",
      hint: "У друга 10 минут на принятие и оплату по номиналу",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      canTransfer: false,
    };
  }

  const blocked =
    !opts.allowTicketTransfer ||
    opts.isPast ||
    opts.isCancelled ||
    opts.isRefunded ||
    opts.isUsed ||
    opts.refundRequestStatus === "pending";

  if (blocked || !opts.allowTicketTransfer) {
    return {
      state: "unavailable",
      label: "",
      canTransfer: false,
      badgeClass: "",
    };
  }

  return {
    state: "available",
    label: "",
    hint: "Передача только зарегистрированному другу по цене билета — без перепродажи",
    badgeClass: "",
    canTransfer: true,
  };
}
