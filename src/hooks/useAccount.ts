// The playing account and the online sync status, as React state.

import { useSyncExternalStore } from 'react';
import { currentAccount, onAccountChange, type Account } from '../store/accounts';
import { syncStatus, onSyncChange, type SyncStatus } from '../net/cloud';

export function useAccount(): Account | null {
  return useSyncExternalStore(onAccountChange, currentAccount, currentAccount);
}

export function useSync(): SyncStatus {
  return useSyncExternalStore(onSyncChange, syncStatus, syncStatus);
}
