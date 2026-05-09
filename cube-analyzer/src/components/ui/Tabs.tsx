import { ReactNode, useState, createContext, useContext } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | null>(null);

interface TabsProps {
  children: ReactNode;
  defaultValue: string;
  className?: string;
}

export function Tabs({ children, defaultValue, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex space-x-1 bg-gray-900/50 p-1 rounded-lg ${className}`}>
      {children}
    </div>
  );
}

export function TabsTrigger({ children, value, className = '' }: { children: ReactNode; value: string; className?: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsTrigger must be used within Tabs');

  const isActive = context.activeTab === value;

  return (
    <button
      onClick={() => context.setActiveTab(value)}
      className={`
        px-4 py-2 rounded-md text-sm font-medium transition-all
        ${isActive
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
          : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export function TabsContent({ children, value, className = '' }: { children: ReactNode; value: string; className?: string }) {
  const context = useContext(TabsContext);
  if (!context) throw new Error('TabsContent must be used within Tabs');

  if (context.activeTab !== value) return null;

  return <div className={className}>{children}</div>;
}
