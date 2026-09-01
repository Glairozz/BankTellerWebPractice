export type Role = "CUSTOMER" | "TELLER" | "ADMIN";
export type AccountType = "SAVINGS" | "CHECKING";
export type AccountStatus = "ACTIVE" | "FROZEN" | "CLOSED";
export type TransactionType = "DEPOSIT" | "WITHDRAWAL" | "TRANSFER";
export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  customerId: string | null;
  createdAt: string;
  accounts?: Account[];
}

export interface Account {
  id: string;
  accountNumber: string;
  accountType: AccountType;
  currency: string;
  balance: number;
  status: AccountStatus;
  ownerId: string;
  owner?: {
    id: string;
    fullName: string;
    email: string;
    customerId: string | null;
  };
  createdAt: string;
}

export interface Transaction {
  id: string;
  reference: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  description?: string | null;
  createdAt: string;
  sourceAccount?: { accountNumber: string };
  destinationAccount?: { accountNumber: string };
}

export interface PendingApproval {
  id: string;
  status: ApprovalStatus;
  requestedAmount: number;
  createdAt: string;
  transaction: Transaction & {
    sourceAccount?: Account;
    destinationAccount?: Account;
    initiatedBy?: { fullName: string };
  };
}

export interface SearchResults {
  byAccountNumber: Account[];
  byCustomer: (User & { accounts: Account[] })[];
}
