import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface UserDataContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <UserDataContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </UserDataContext.Provider>
  );
}

export function useUserDataRefresh() {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error('useUserDataRefresh must be used within UserDataProvider');
  }
  return context;
}