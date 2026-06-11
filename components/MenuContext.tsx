"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

interface MenuContextType {
  selectedCollege: string | null;
  selectedDept: string | null;
  setSelectedMenu: (college: string | null, dept: string | null) => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [selectedCollege, setSelectedCollege] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const setSelectedMenu = (college: string | null, dept: string | null) => {
    setSelectedCollege(college);
    setSelectedDept(dept);
  };

  return (
    <MenuContext.Provider value={{ selectedCollege, selectedDept, setSelectedMenu }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error("useMenu must be used within a MenuProvider");
  }
  return context;
}
