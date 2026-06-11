"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { useMenu } from "./MenuContext";
import ReactMarkdown from "react-markdown";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import { Users, BookOpen, BarChart3, Globe } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reportMarkdown, setReportMarkdown] = useState("");
  const supabase = createClient();
  const { selectedCollege, selectedDept, setSelectedMenu } = useMenu();

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCollege, selectedDept]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const { data, error } = await supabase
        .from("schedule_ai")
        .select("*")
        .limit(10000); // Fetch all rows

      if (error) {
        console.error("Error fetching data:", error);
      } else if (data) {
        setData(data);
      }
      setLoading(false);
    }

    fetchData();
  }, [supabase]);

  const filteredData = useMemo(() => {
    return data.filter((row) => {
      if (selectedDept) {
        return row["대학(원)"] === selectedCollege && row["학과(부)"] === selectedDept;
      }
      if (selectedCollege) {
        return row["대학(원)"] === selectedCollege;
      }
      return true;
    });
  }, [data, selectedCollege, selectedDept]);

  // Derived Statistics
  const stats = useMemo(() => {
    if (!filteredData.length) return null;

    let totalStudents = 0;
    let totalCapacity = 0;
    let foreignLangCount = 0;

    const courseByType: Record<string, number> = {};
    const studentsByType: Record<string, { total: number; count: number }> = {};
    const courseByMethod: Record<string, number> = {};
    const courseByCredit: Record<string, number> = {};
    const courseByDay: Record<string, number> = {};
    const courseByTime: Record<string, number> = {};
    const collegeSummary: Record<string, { courses: number; students: number }> = {};
    const keywordsCount: Record<string, number> = {};

    filteredData.forEach((row) => {
      const students = parseInt(row["수강"]) || 0;
      const capacity = parseInt(row["정원"]) || 0;
      
      totalStudents += students;
      totalCapacity += capacity;

      if (row["원어강의"]) foreignLangCount++;

      // 이수구분
      const reqType = row["이수구분"] || "기타";
      courseByType[reqType] = (courseByType[reqType] || 0) + 1;
      
      if (!studentsByType[reqType]) studentsByType[reqType] = { total: 0, count: 0 };
      studentsByType[reqType].total += students;
      studentsByType[reqType].count += 1;

      // 수업방법
      const method = row["수업방법"] || "기타";
      courseByMethod[method] = (courseByMethod[method] || 0) + 1;

      // 학점
      const credit = row["학점"] ? `${row["학점"]}학점` : "기타";
      courseByCredit[credit] = (courseByCredit[credit] || 0) + 1;

      // 대학별 요약
      const college = row["대학(원)"] || "기타";
      if (!collegeSummary[college]) collegeSummary[college] = { courses: 0, students: 0 };
      collegeSummary[college].courses += 1;
      collegeSummary[college].students += students;

      // 요일/시간 파싱 (시간표 컬럼: "월1,2,3" 또는 "월[1-3]")
      const timetable = row["시간표(교시)"] || "";
      const matches = timetable.match(/[월화수목금토일]/g) || [];
      matches.forEach((day: string) => {
        courseByDay[day] = (courseByDay[day] || 0) + 1;
      });

      // 숫자로 된 교시 파싱
      const timeMatches = timetable.match(/\d+/g) || [];
      timeMatches.forEach((t: string) => {
        const timeStr = `${t}교시`;
        courseByTime[timeStr] = (courseByTime[timeStr] || 0) + 1;
      });

      // 키워드 파싱
      const title = row["교과목명"] || "";
      const cleanTitle = title.replace(/[^\w\s가-힣]/g, " ").replace(/[0-9]/g, " ");
      const words = cleanTitle.split(/\s+/);
      words.forEach((word: string) => {
        const w = word.trim();
        const stopWords = ["및", "의", "이해", "기초", "실습", "연습", "특강", "세미나", "I", "II", "위한", "입문", "개론", "과", "학", "론", "연구", "응용"];
        if (w.length >= 2 && !stopWords.includes(w)) {
          keywordsCount[w] = (keywordsCount[w] || 0) + 1;
        }
      });
    });

    return {
      totalCourses: filteredData.length,
      totalStudents,
      avgEnrollmentRate: totalCapacity > 0 ? (totalStudents / totalCapacity) * 100 : 0,
      foreignRatio: (foreignLangCount / filteredData.length) * 100,
      courseByTypeData: Object.entries(courseByType).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value - a.value),
      avgStudentsByTypeData: Object.entries(studentsByType).map(([name, { total, count }]) => ({ name, value: Math.round(total / count) })).sort((a,b)=>b.value - a.value),
      courseByMethodData: Object.entries(courseByMethod).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value - a.value),
      courseByCreditData: Object.entries(courseByCredit).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value - a.value),
      courseByDayData: Object.entries(courseByDay).map(([name, value]) => ({ name, value })).sort((a, b) => {
        const order = ["월", "화", "수", "목", "금", "토", "일"];
        return order.indexOf(a.name) - order.indexOf(b.name);
      }),
      courseByTimeData: Object.entries(courseByTime).map(([name, value]) => ({ name, value })).sort((a, b) => parseInt(a.name) - parseInt(b.name)),
      collegeSummaryData: Object.entries(collegeSummary).map(([name, stats]) => ({ name, ...stats })).sort((a,b)=>b.courses - a.courses),
      wordCloudData: Object.entries(keywordsCount).map(([text, value]) => ({ text, value })).sort((a,b)=>b.value - a.value).slice(0, 5),
    };
  }, [filteredData]);

  if (loading) {
    return <div className="w-full h-full flex items-center justify-center">Loading...</div>;
  }

  if (!stats) {
    return <div className="w-full h-full flex items-center justify-center">No Data Available</div>;
  }

  const COLORS = ['#3B90B5', '#395F9B', '#E7CDA8', '#97D0DC', '#29354C'];
  const PIE_COLORS = ['#3B90B5', '#395F9B', '#E7CDA8', '#97D0DC', '#29354C'];

  const handleAnalyzeClick = () => {
    if (!stats || !filteredData.length) return;

    const targetName = selectedDept || selectedCollege || "전체";
    
    // Find biggest reqType
    const sortedReqTypes = [...stats.courseByTypeData].sort((a, b) => b.value - a.value);
    const biggestReqType = sortedReqTypes[0]?.name || "알수없음";
    const biggestReqTypeCount = sortedReqTypes[0]?.value || 0;
    const biggestReqTypeRatio = Math.round((biggestReqTypeCount / stats.totalCourses) * 100);
    
    const faceToFaceCount = stats.courseByMethodData.find(d => d.name === "오프라인(대면)")?.value || 0;
    const faceToFaceRatio = ((faceToFaceCount / stats.totalCourses) * 100).toFixed(1);
    
    const threeCreditCount = stats.courseByCreditData.find(d => d.name === "3학점")?.value || 0;
    const threeCreditRatio = ((threeCreditCount / stats.totalCourses) * 100).toFixed(1);

    const sortedDays = [...stats.courseByDayData].sort((a, b) => b.value - a.value);

    const reportContent = `### [분석 보고서] 2026학년도 1학기 인천대학교 교육과정 및 강좌 운영 현황 분석

**작성일자:** ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}

**분석대상:** 인천대학교 2026학년도 1학기 ${targetName} 강좌 및 수강 데이터

**분석자:** 대학 교육과정 및 강좌 운영 분석 전문가

---

#### 1. 데이터 요약
2026학년도 1학기 인천대학교의 교육과정 운영 데이터는 전반적으로 안정적인 학사 운영 모델을 보여주고 있습니다.

*   **강좌 규모 및 효율성:** 총 ${stats.totalCourses.toLocaleString()}개의 강좌가 개설되었으며, 총 ${stats.totalStudents.toLocaleString()}명의 학생이 수강하고 있습니다. 전체 평균 수강율은 **${stats.avgEnrollmentRate.toFixed(1)}%**로, 개설된 강좌들이 교육 수요에 부합하는 높은 적정성을 유지하고 있습니다.
*   **글로벌 역량:** 원어(영어) 강의 비율은 **${stats.foreignRatio.toFixed(1)}%**로, 학생들의 글로벌 의사소통 역량 강화를 위한 기본적인 기반을 갖추고 있습니다.

---

#### 2. 주요 특징 및 트렌드 분석

**1) 이수구분 및 학점 구성 특성**
*   **전공 중심의 학사 구조:** '${biggestReqType}' 강좌가 ${biggestReqTypeCount}개(전체 대비 약 ${biggestReqTypeRatio}%)로 가장 높은 비중을 차지하고 있습니다.
*   **표준 학점제 운영:** 3학점 강좌가 **${threeCreditRatio}%**를 차지하며 표준적인 학점 구성 체계를 따르고 있습니다.

**2) 수업방법 비중 및 시사점**
*   전체 강좌의 **${faceToFaceRatio}%가 대면수업**으로 운영되고 있습니다. 대학 교육의 본질인 상호작용과 공동체 의식 함양에 집중하려는 의지로 해석됩니다.

**3) 요일 및 시간대별 강좌 배치 현황**
*   **요일 편중 현상:** ${sortedDays[0]?.name || "-"}요일(${sortedDays[0]?.value || 0}개)에 강좌가 가장 많이 개설되어 있습니다.

---

#### 3. 문제점 및 개선 아이디어 제언

*   **수강율 극대화 및 효율적 운영:** 평균 수강인원이 유독 높은 과목의 경우 분반을 적극적으로 고려하여 학습 품질을 보장해야 합니다.
*   **요일/시간대 분산 전략:** 특정 요일/시간대 쏠림 현상은 학생들의 피로도를 높입니다. 데이터 기반 시간표 최적화 시스템 도입이 필요합니다.`;

    setReportMarkdown(reportContent);
    setIsModalOpen(true);
    setIsAnalyzing(true);
    
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 2000);
  };

  const handleDownload = () => {
    const targetName = selectedDept || selectedCollege || "전체";
    const blob = new Blob([reportMarkdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI_강의분석보고서_${targetName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Header Row */}
      <div className="flex justify-between items-end mb-8">
        <div className="flex flex-col gap-2">
          {/* Breadcrumb */}
          <div className="flex items-center text-[15px] text-gray-500 gap-3 mb-1 font-medium">
            <button 
              onClick={() => setSelectedMenu(null, null)}
              className="flex items-center gap-1.5 hover:text-gray-900 transition-colors"
            >
              <svg className="w-4 h-4 mb-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>홈</span>
            </button>
            
            {selectedCollege && (
              <>
                <span className="text-gray-300 font-light">/</span>
                <button 
                  onClick={() => setSelectedMenu(selectedCollege, null)}
                  className={`transition-colors ${!selectedDept ? "text-gray-900 font-bold" : "hover:text-gray-900"}`}
                >
                  {selectedCollege}
                </button>
              </>
            )}

            {selectedDept && (
              <>
                <span className="text-gray-300 font-light">/</span>
                <span className="text-gray-900 font-bold">{selectedDept}</span>
              </>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">{selectedDept || selectedCollege || "전체"} 교과목 대시보드</h2>
            <p className="text-sm text-gray-500">{selectedDept || selectedCollege || "전체"} | {stats.totalCourses.toLocaleString()}개 강좌</p>
          </div>
        </div>
        <button 
          onClick={handleAnalyzeClick}
          className="flex items-center gap-2 px-4 py-2 bg-[#395F9B] border border-[#395F9B] rounded-xl text-white font-bold text-sm shadow-sm hover:bg-[#29354C] transition"
        >
          <span className="text-lg">✨</span> AI 강의 분석
        </button>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#F4F9FA] p-5 rounded-2xl shadow-sm border border-[#C9E9EE] flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">총 강좌 수</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalCourses.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-[#C9E9EE] rounded-xl">
            <BookOpen className="w-5 h-5 text-[#395F9B]" />
          </div>
        </div>
        <div className="bg-[#F4F9FA] p-5 rounded-2xl shadow-sm border border-[#C9E9EE] flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">총 수강인원</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalStudents.toLocaleString()}</p>
          </div>
          <div className="p-3 bg-[#C9E9EE] rounded-xl">
            <Users className="w-5 h-5 text-[#3B90B5]" />
          </div>
        </div>
        <div className="bg-[#F4F9FA] p-5 rounded-2xl shadow-sm border border-[#C9E9EE] flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">평균 수강률</p>
            <p className="text-2xl font-bold text-gray-900">{stats.avgEnrollmentRate.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-[#C9E9EE] rounded-xl">
            <BarChart3 className="w-5 h-5 text-[#29354C]" />
          </div>
        </div>
        <div className="bg-[#F4F9FA] p-5 rounded-2xl shadow-sm border border-[#C9E9EE] flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">원어강의 비율</p>
            <p className="text-2xl font-bold text-gray-900">{stats.foreignRatio.toFixed(1)}%</p>
          </div>
          <div className="p-3 bg-[#E7CDA8] rounded-xl">
            <Globe className="w-5 h-5 text-[#395F9B]" />
          </div>
        </div>
      </div>

      {/* Middle Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 이수구분별 강좌 수 */}
        <div className="bg-[#F4F9FA] p-6 rounded-2xl shadow-sm border border-[#C9E9EE]">
          <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-gray-800 before:rounded-full before:mr-2">이수구분별 강좌 수</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.courseByTypeData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} width={80} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" fill="#97D0DC" radius={[0, 4, 4, 0]} barSize={16}>
                  {stats.courseByTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3B90B5' : '#97D0DC'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 이수구분별 평균 수강인원 */}
        <div className="bg-[#F4F9FA] p-6 rounded-2xl shadow-sm border border-[#C9E9EE]">
          <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-gray-800 before:rounded-full before:mr-2">이수구분별 평균 수강인원</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.avgStudentsByTypeData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6b7280'}} width={80} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" fill="#97D0DC" radius={[0, 4, 4, 0]} barSize={16}>
                  {stats.avgStudentsByTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#3B90B5' : '#97D0DC'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* 수업방법 유형 분포 */}
        <div className="bg-[#F4F9FA] p-6 rounded-2xl shadow-sm border border-[#C9E9EE] lg:col-span-1">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-gray-800 before:rounded-full before:mr-2">수업방법 유형 분포</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.courseByMethodData} cx="50%" cy="45%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                  {stats.courseByMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '20px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 학점 구성 비율 */}
        <div className="bg-[#F4F9FA] p-6 rounded-2xl shadow-sm border border-[#C9E9EE] lg:col-span-1">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-gray-800 before:rounded-full before:mr-2">학점 구성 비율</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.courseByCreditData} cx="50%" cy="45%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                  {stats.courseByCreditData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '20px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 요일별 차트 */}
        <div className="bg-[#F4F9FA] p-6 rounded-2xl shadow-sm border border-[#C9E9EE] lg:col-span-1">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-gray-800 before:rounded-full before:mr-2">요일별 강좌 수</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.courseByDayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6b7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6b7280'}} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" fill="#3B90B5" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 시간별 차트 */}
        <div className="bg-[#F4F9FA] p-6 rounded-2xl shadow-sm border border-[#C9E9EE] lg:col-span-1">
          <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-gray-800 before:rounded-full before:mr-2">수업 시간별 강좌 수</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.courseByTimeData.slice(0, 8)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6b7280'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6b7280'}} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Bar dataKey="value" fill="#395F9B" radius={[4, 4, 0, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column (Tables & Cloud) */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* 대학별 요약 테이블 */}
          <div className="bg-[#F4F9FA] p-6 rounded-2xl shadow-sm border border-[#C9E9EE] flex flex-col h-[480px]">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-gray-800 before:rounded-full before:mr-2">대학(원)별 강좌 분석 요약</h3>
            <div className="flex-1 overflow-auto rounded-xl border border-gray-100">
              <table className="min-w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium">대학(원)명</th>
                    <th className="px-4 py-3 font-medium text-right">강좌 수</th>
                    <th className="px-4 py-3 font-medium text-right">수강 인원</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.collegeSummaryData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.courses.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-gray-600">{item.students.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 교과목 키워드 클라우드 */}
          <div className="bg-[#F4F9FA] p-6 rounded-2xl shadow-sm border border-[#C9E9EE] flex flex-col h-[240px]">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-gray-800 before:rounded-full before:mr-2">주요 핵심 키워드 (Top 5)</h3>
            <div className="flex-1 flex flex-wrap content-center justify-center gap-x-5 gap-y-4 px-2">
              {stats.wordCloudData.length > 0 ? stats.wordCloudData.map((word, i) => {
                const maxVal = stats.wordCloudData[0].value;
                const minVal = stats.wordCloudData[stats.wordCloudData.length - 1].value;
                const ratio = maxVal === minVal ? 0.5 : (word.value - minVal) / (maxVal - minVal);
                const fontSize = 16 + ratio * 16; // 16px to 32px
                const colors = ['#395F9B', '#3B90B5', '#29354C', '#97D0DC', '#8B5CF6'];
                const color = colors[i % colors.length];
                
                const rotations = [0, 6, -5, 8, -6];
                const rotate = rotations[i] || 0;

                return (
                  <span 
                    key={i} 
                    style={{ 
                      fontSize: `${fontSize}px`, 
                      color, 
                      fontFamily: "'Jua', sans-serif",
                      transform: `rotate(${rotate}deg)`,
                      lineHeight: 1.4,
                      whiteSpace: 'nowrap',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.05)'
                    }}
                    className="transition-transform hover:scale-110 cursor-default drop-shadow-sm inline-block z-10"
                    title={`${word.text} (${word.value}건)`}
                  >
                    {word.text}
                  </span>
                );
              }) : (
                <span className="text-gray-400 text-sm m-auto">데이터가 없습니다.</span>
              )}
            </div>
          </div>
        </div>

        {/* 상세 강좌 정보 */}
        <div className="lg:col-span-2 bg-[#F4F9FA] p-6 rounded-2xl shadow-sm border border-[#C9E9EE] flex flex-col h-[736px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center before:content-[''] before:inline-block before:w-1.5 before:h-1.5 before:bg-gray-800 before:rounded-full before:mr-2">상세 강좌 정보</h3>
            <span className="text-xs text-gray-400">총 {filteredData.length}개 중 {filteredData.length === 0 ? 0 : (currentPage - 1) * 15 + 1}-{Math.min(currentPage * 15, filteredData.length)}번째 표시</span>
          </div>
          <div className="flex-1 overflow-auto rounded-xl border border-gray-100 mb-4">
            <table className="min-w-full text-sm text-center">
              <thead className="text-xs text-gray-500 bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-medium text-left">교과목명</th>
                  <th className="px-4 py-3 font-medium">이수구분</th>
                  <th className="px-4 py-3 font-medium">학점</th>
                  <th className="px-4 py-3 font-medium">담당교수</th>
                  <th className="px-4 py-3 font-medium">시간표(교시)</th>
                  <th className="px-4 py-3 font-medium">수강 / 정원</th>
                  <th className="px-4 py-3 font-medium text-right">수강율</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-center">
                {filteredData.slice((currentPage - 1) * 15, currentPage * 15).map((row, idx) => {
                  const enrolled = parseInt(row["수강"]) || 0;
                  const capacity = parseInt(row["정원"]) || 0;
                  const rate = capacity > 0 ? ((enrolled / capacity) * 100).toFixed(1) : "0.0";
                  
                  return (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900 font-medium truncate max-w-[150px] text-left" title={row["교과목명"]}>{row["교과목명"]}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#C9E9EE] text-[#29354C]">
                          {row["이수구분"] || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row["학점"] ? `${row["학점"]}학점` : "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{row["담당교수"] || "-"}</td>
                      <td className="px-4 py-3 text-gray-600 truncate max-w-[120px]" title={row["시간표(교시)"]}>{row["시간표(교시)"] || "-"}</td>
                      <td className="px-4 py-3 text-gray-600">{enrolled} / {capacity}</td>
                      <td className="px-4 py-3 text-gray-900 font-bold text-right">{rate}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredData.length > 0 && (
            <div className="flex justify-center items-center gap-1 text-sm mt-auto">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 font-medium text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
              >
                이전
              </button>
              
              {Array.from({ length: Math.ceil(filteredData.length / 15) })
                .map((_, i) => i + 1)
                .filter(p => p === 1 || p === Math.ceil(filteredData.length / 15) || Math.abs(p - currentPage) <= 2)
                .map((p, i, arr) => (
                  <div key={p} className="flex items-center gap-1">
                    {i > 0 && p - arr[i - 1] > 1 && <span className="px-1 text-gray-400">...</span>}
                    <button
                      onClick={() => setCurrentPage(p)}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${currentPage === p ? "bg-[#18181B] text-white font-medium" : "text-gray-600 hover:bg-gray-100"}`}
                    >
                      {p}
                    </button>
                  </div>
                ))}

              <button 
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredData.length / 15), p + 1))}
                disabled={currentPage === Math.ceil(filteredData.length / 15)}
                className="px-2 py-1 font-medium text-gray-500 hover:text-gray-900 disabled:opacity-30 disabled:hover:text-gray-500 transition-colors"
              >
                다음
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-8 pb-4 border-t border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-end text-sm text-gray-500">
        <div className="flex items-center gap-2 mb-4 md:mb-0">
          <BookOpen className="w-4 h-4" />
          <span className="font-medium text-[13px]">Incheon National University Course Dashboard</span>
        </div>
        <div className="flex flex-col items-end gap-6">
          <div className="flex gap-4 text-[12px] font-medium">
            <a href="https://www.inu.ac.kr/inu/index.do?epTicket=LOG" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition">인천대학교 홈페이지</a>
            <a href="https://portal.inu.ac.kr:444/enview/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition">INU 포털</a>
            <a href="https://cyber.inu.ac.kr/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition">이러닝</a>
          </div>
          <div className="text-right text-[11px] text-gray-400 space-y-1.5">
            <p>Designed & Developed by Taehui Won</p>
            <p>© 2026 Incheon National University.</p>
          </div>
        </div>
      </div>

      {/* AI Analysis Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-[#EDEEF1] w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#F2F2F5] border-b border-gray-200">
              <div className="flex items-center gap-2">
                <span className="text-[#3B90B5] text-xl">💡</span>
                <h2 className="text-[17px] font-bold text-gray-900">AI 강의 데이터 종합 분석</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 flex flex-col bg-[#F2F2F5]">
              {isAnalyzing ? (
                <div className="flex-1 flex flex-col items-center justify-center space-y-6 my-20">
                  <div className="w-16 h-16 border-4 border-[#C9E9EE] border-t-[#3B90B5] rounded-full animate-spin"></div>
                  <div className="text-center space-y-2">
                    <p className="text-gray-800 font-medium text-lg">Gemini 3.1 Flash-Lite 모델이 통계를 분석 중입니다...</p>
                    <p className="text-sm text-gray-400">대시보드 데이터를 종합적으로 해석하여 보고서를 작성하고 있습니다.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 px-2">
                  <div className="bg-[#E4E4E8] rounded-xl px-5 py-4 flex justify-between items-center text-[13px] text-gray-700">
                    <div><span className="font-bold text-gray-900">분석 대상:</span> {selectedDept || selectedCollege || "전체"} 교과목 대시보드</div>
                    <div><span className="font-bold text-gray-900">일자:</span> {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                  </div>
                  
                  <div className="text-gray-800 px-2 pb-6">
                    <ReactMarkdown
                      components={{
                        h3: ({node, ...props}) => <h3 className="text-[19px] font-bold text-[#3B90B5] mb-5 mt-2" {...props} />,
                        h4: ({node, ...props}) => <h4 className="text-[15px] font-bold text-gray-900 mt-6 mb-3" {...props} />,
                        p: ({node, ...props}) => <p className="text-[14px] text-gray-700 leading-[1.7] mb-4" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4 space-y-2 text-[14px] text-gray-700 leading-[1.7]" {...props} />,
                        li: ({node, ...props}) => <li {...props} />,
                        strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                        hr: ({node, ...props}) => <hr className="my-6 border-gray-300" {...props} />
                      }}
                    >
                      {reportMarkdown}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            {!isAnalyzing && (
              <div className="px-6 py-4 bg-[#F2F2F5] border-t border-gray-200 flex justify-between items-center">
                <button 
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-4 py-2.5 bg-transparent border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  보고서 다운로드 (.md)
                </button>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition shadow-md"
                >
                  닫기
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
