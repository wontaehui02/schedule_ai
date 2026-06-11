"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useMenu } from "./MenuContext";

interface GroupedData {
  [college: string]: string[];
}

export default function Sidebar() {
  const COLLEGE_ORDER = [
    "기초교육원",
    "인문대학",
    "자연과학대학",
    "사회과학대학",
    "글로벌정경대학",
    "공과대학",
    "정보기술대학",
    "경영대학",
    "예술체육대학",
    "사범대학",
    "도시과학대학",
    "생명과학기술대학",
    "융합자유전공대학",
    "동북아국제통상물류학부",
    "법학부"
  ];

  const [groupedData, setGroupedData] = useState<GroupedData>({});
  const [expandedColleges, setExpandedColleges] = useState<Set<string>>(new Set());
  const supabase = createClient();
  const { selectedCollege, selectedDept, setSelectedMenu } = useMenu();

  useEffect(() => {
    async function fetchData() {
      // Fetch all records to build the tree
      const { data, error } = await supabase
        .from("schedule_ai")
        .select("*");

      if (error) {
        console.error("Error fetching menu data:", error);
        return;
      }

      if (data) {
        const groups: GroupedData = {};
        const allColleges = new Set<string>();

        data.forEach((row) => {
          const college = row["대학(원)"];
          const dept = row["학과(부)"];
          
          if (!college || !dept) return;

          if (!groups[college]) {
            groups[college] = [];
          }
          if (!groups[college].includes(dept)) {
            groups[college].push(dept);
          }
          allColleges.add(college);
        });

        // Sort departments
        for (const college in groups) {
          groups[college].sort();
        }

        setGroupedData(groups);
        setExpandedColleges(allColleges); // Expand all by default
      }
    }

    fetchData();
  }, [supabase]);

  const toggleCollege = (college: string) => {
    setExpandedColleges((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(college)) {
        newSet.delete(college);
      } else {
        newSet.add(college);
      }
      return newSet;
    });
  };

  return (
    <aside className="w-64 min-w-[16rem] bg-[#EFF0F4] h-full flex flex-col border-r border-gray-200 overflow-y-auto">
      {/* Header */}
      <div className="p-6 pb-4">
        <h1 className="text-xl font-bold leading-tight text-gray-900 tracking-tight">
          Incheon National<br />University
        </h1>
        <p className="text-[11px] font-medium text-gray-400 mt-1 uppercase tracking-wider">
          2026-1 Course Dashboard
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {/* All Dashboard Button */}
        <div className="mb-6">
          <button 
            onClick={() => setSelectedMenu(null, null)}
            className={`w-full text-left px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors ${!selectedCollege && !selectedDept ? "bg-[#97D0DC] text-[#29354C]" : "text-gray-600 hover:bg-gray-100"}`}
          >
            전체 대시보드
          </button>
        </div>

        {/* Dynamic Accordion Menu */}
        <div className="space-y-1">
          {Object.entries(groupedData)
            .sort(([a], [b]) => {
              const indexA = COLLEGE_ORDER.indexOf(a);
              const indexB = COLLEGE_ORDER.indexOf(b);
              // If not found in the array, push to the end
              if (indexA === -1 && indexB === -1) return a.localeCompare(b);
              if (indexA === -1) return 1;
              if (indexB === -1) return -1;
              return indexA - indexB;
            })
            .map(([college, depts]) => {
              const isExpanded = expandedColleges.has(college);

              return (
                <div key={college} className="flex flex-col">
                  <button
                    onClick={() => {
                      toggleCollege(college);
                      setSelectedMenu(college, null);
                    }}
                    className={`flex items-center justify-between px-3 py-2 w-full text-left text-[13px] font-semibold rounded-lg transition-colors ${selectedCollege === college && !selectedDept ? "bg-[#97D0DC] text-[#29354C]" : "text-gray-700 hover:bg-[#C9E9EE] hover:text-[#29354C]"}`}
                  >
                    {college}
                    <svg
                      className={`w-3.5 h-3.5 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      } ${selectedCollege === college && !selectedDept ? "text-[#29354C]" : "text-gray-400"}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="mt-1 mb-2 flex flex-col space-y-0.5 pl-3">
                      {depts.map((dept) => (
                        <button
                          key={dept}
                          onClick={() => setSelectedMenu(college, dept)}
                          className={`text-left px-3 py-1.5 text-[12px] font-medium rounded-lg transition-colors ${selectedDept === dept ? "bg-[#97D0DC] text-[#29354C] font-bold" : "text-gray-500 hover:bg-[#C9E9EE] hover:text-[#29354C]"}`}
                        >
                          {dept}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </nav>
    </aside>
  );
}
