import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  teachers as defaultTeachers,
  students as defaultStudents,
} from "../data/schoolData";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState("Dashboard");

  const [teachers, setTeachers] = useState(defaultTeachers || []);
  const [students, setStudents] = useState(defaultStudents || []);
  const [presentStudents, setPresentStudents] = useState(0);
  const [absentStudents, setAbsentStudents] = useState(0);
  const [weeklyAttendance, setWeeklyAttendance] = useState([]);

  const classes = [
    "Class 1",
    "Class 2",
    "Class 3",
    "Class 4",
    "Class 5",
    "Class 6",
    "Class 7",
    "Class 8",
    "Class 9",
    "Class 10",
  ];

  /*
   * For a given date ("YYYY-MM-DD"), work out each student's
   * most recently saved attendance mark that day, across all
   * classes and periods.
   */
  const getLatestStatusByStudentForDate = (dateStr, allRecords) => {
    const latestStatusByStudent = {};

    Object.keys(allRecords).forEach((key) => {
      if (!key.startsWith(`${dateStr}_`)) return;

      const record = allRecords[key];
      Object.keys(record).forEach((studentId) => {
        latestStatusByStudent[studentId] = record[studentId];
      });
    });

    return latestStatusByStudent;
  };

  /*
   * Load live data from Smart Staffing and Attendance
   * (falling back to schoolData.js defaults), so the
   * dashboard reflects real, current numbers.
   */
  const loadDashboardData = () => {
    let staff = defaultTeachers || [];
    const savedTeachers = localStorage.getItem("schoolTeachers");
    if (savedTeachers) {
      try {
        staff = JSON.parse(savedTeachers);
      } catch {
        console.log("Could not read saved teachers");
      }
    }

    let roster = defaultStudents || [];
    const savedStudents = localStorage.getItem("schoolStudents");
    if (savedStudents) {
      try {
        roster = JSON.parse(savedStudents);
      } catch {
        console.log("Could not read saved students");
      }
    }

    setTeachers(staff);
    setStudents(roster);

    const allRecords = JSON.parse(
      localStorage.getItem("attendanceRecords") || "{}"
    );

    /*
     * Today's present/absent counts for the stat card.
     */
    const today = new Date().toISOString().slice(0, 10);
    const todayStatus = getLatestStatusByStudentForDate(
      today,
      allRecords
    );

    const presentCount = Object.values(todayStatus).filter(
      (status) => status === "Present"
    ).length;

    const absentCount = Object.values(todayStatus).filter(
      (status) => status === "Absent"
    ).length;

    setPresentStudents(presentCount);
    setAbsentStudents(absentCount);

    /*
     * Weekly attendance percentages (Mon-Sat of the current
     * week) for the Attendance Overview chart. Percentage is
     * out of students actually marked that day (present /
     * (present + absent)), so days with no attendance taken
     * yet show as 0 rather than misleadingly counting everyone
     * as absent.
     */
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday...
    const offsetToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const monday = new Date(now);
    monday.setDate(now.getDate() + offsetToMonday);

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const weekly = dayLabels.map((label, index) => {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + index);
      const dateStr = dayDate.toISOString().slice(0, 10);

      const statusForDay = getLatestStatusByStudentForDate(
        dateStr,
        allRecords
      );

      const dayPresent = Object.values(statusForDay).filter(
        (s) => s === "Present"
      ).length;

      const dayAbsent = Object.values(statusForDay).filter(
        (s) => s === "Absent"
      ).length;

      const markedTotal = dayPresent + dayAbsent;
      const percentage =
        markedTotal > 0 ? Math.round((dayPresent / markedTotal) * 100) : 0;

      return { label, percentage };
    });

    setWeeklyAttendance(weekly);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboardData();
  }, []);

  const availableTeachers = teachers.filter(
    (t) => t.status?.toLowerCase() === "available"
  ).length;

  const teachersOnLeave = teachers.filter(
    (t) => t.status?.toLowerCase() === "on leave"
  ).length;

  const notYetMarkedStudents = Math.max(
    students.length - presentStudents - absentStudents,
    0
  );

  const menuItems = [
    { name: "Dashboard", icon: "🏠", path: "/" },
    { name: "AI Document Reader", icon: "📄", path: "/document-reader" },
    { name: "Smart Timetable", icon: "📅", path: "/timetable" },
    { name: "Smart Staffing", icon: "👨‍🏫", path: "/smart-staffing" },
    { name: "Attendance", icon: "✅", path: "/attendance" },
  ];

  const openPage = (item) => {
    setActiveMenu(item.name);

    if (item.path !== "#") {
      navigate(item.path);
    }
  };

  return (
    <div className="dashboard">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">🎓</div>
          <div>
            <h2>EduFlow</h2>
            <span>AI SCHOOL SYSTEM</span>
          </div>
        </div>

        <div className="menu-title">MAIN MENU</div>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={`menu-item ${
                activeMenu === item.name ? "active" : ""
              }`}
              onClick={() => openPage(item)}
            >
              <span className="menu-icon">{item.icon}</span>
              <span>{item.name}</span>
            </button>
          ))}
        </nav>

        <div className="menu-title bottom-title">SYSTEM</div>

        <button className="menu-item">
          <span className="menu-icon">⚙️</span>
          <span>Settings</span>
        </button>

        <button className="menu-item">
          <span className="menu-icon">❓</span>
          <span>Help</span>
        </button>

        <div className="sidebar-bottom">
          <div className="admin-mini">
            <div className="admin-avatar">A</div>

            <div>
              <strong>Administrator</strong>
              <small>School Admin</small>
            </div>

            <span>⋮</span>
          </div>
        </div>

      </aside>


      {/* MAIN AREA */}
      <main className="main-content">

        {/* TOP BAR */}
        <header className="topbar">

          <div className="search-box">
            🔍
            <input
              type="text"
              placeholder="Search students, teachers..."
            />
          </div>

          <div className="top-actions">

            <button className="notification">
              🔔
              <span>3</span>
            </button>

            <div className="profile">
              <div className="profile-avatar">A</div>

              <div>
                <strong>Administrator</strong>
                <small>Admin</small>
              </div>

              <span>⌄</span>
            </div>

          </div>

        </header>


        {/* PAGE HEADER */}
        <section className="page-header">

          <div>
            <h1>Admin Dashboard</h1>
            <p>
              Welcome back! Here's what's happening in your school today.
            </p>
          </div>

          <div className="date-box">
            📅 August 14, 2026
          </div>

        </section>


        {/* STAT CARDS */}
        <section className="stats-grid">

          <div className="stat-card">

            <div className="stat-top">
              <span>Students</span>
              <div className="stat-icon purple">👨‍🎓</div>
            </div>

            <h2>{students.length}</h2>

            <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>
              🟢 Present: <b>{presentStudents}</b> &nbsp; 🔴 Absent:{" "}
              <b>{absentStudents}</b>
              {notYetMarkedStudents > 0 && (
                <>
                  {" "}
                  &nbsp; ⚪ Not marked: <b>{notYetMarkedStudents}</b>
                </>
              )}
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">
              <span>Teachers</span>
              <div className="stat-icon blue">👨‍🏫</div>
            </div>

            <h2>{teachers.length}</h2>

            <p style={{ fontSize: "11px", color: "#666", margin: 0 }}>
              🟢 Available: <b>{availableTeachers}</b> &nbsp; 🔴 On Leave:{" "}
              <b>{teachersOnLeave}</b>
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">
              <span>Classes</span>
              <div className="stat-icon orange">🏫</div>
            </div>

            <h2>{classes.length}</h2>

            <p>
              <span>Class 1 to Class 10</span>
            </p>

          </div>


          <div className="stat-card">

            <div className="stat-top">
              <span>Pending Alerts</span>
              <div className="stat-icon red">⚠️</div>
            </div>

            <h2>3</h2>

            <p className="warning">
              Needs attention
            </p>

          </div>

        </section>


        {/* MAIN DASHBOARD GRID */}
        <section className="dashboard-grid">


          {/* ATTENDANCE CHART */}
          <div className="panel attendance-panel">

            <div className="panel-header">
              <div>
                <h2>Attendance Overview</h2>
                <p>Weekly attendance percentage</p>
              </div>

              <select>
                <option>This Week</option>
                <option>This Month</option>
              </select>
            </div>


            <div className="chart">

              <div className="chart-y">
                <span>100%</span>
                <span>80%</span>
                <span>60%</span>
                <span>40%</span>
                <span>20%</span>
              </div>

              <div className="bars">

                {weeklyAttendance.map((day) => (
                  <div className="bar-group" key={day.label}>
                    <div
                      className="bar"
                      style={{
                        height: `${Math.max(day.percentage, 2)}%`,
                      }}
                      title={`${day.percentage}% present`}
                    ></div>
                    <span>{day.label}</span>
                  </div>
                ))}

              </div>

            </div>

          </div>


          {/* SCHOOL OVERVIEW */}
          <div className="panel overview-panel">

            <div className="panel-header">
              <div>
                <h2>School Overview</h2>
                <p>Current student distribution</p>
              </div>
            </div>

            <div className="donut-container">

              <div className="donut">
                <div className="donut-center">
                  <strong>1,250</strong>
                  <span>Students</span>
                </div>
              </div>

            </div>

            <div className="legend">

              <div>
                <span className="dot grade-a"></span>
                Primary
                <strong>42%</strong>
              </div>

              <div>
                <span className="dot grade-b"></span>
                Middle
                <strong>33%</strong>
              </div>

              <div>
                <span className="dot grade-c"></span>
                High School
                <strong>25%</strong>
              </div>

            </div>

          </div>

        </section>


        {/* LOWER SECTION */}
        <section className="lower-grid">


          {/* SMART STAFFING */}
          <div className="panel staffing-panel">

            <div className="panel-header">

              <div>
                <h2>Smart Staffing</h2>
                <p>Teacher availability</p>
              </div>

              <button
                className="view-button"
                onClick={() => navigate("/smart-staffing")}
              >
                View →
              </button>

            </div>


            <div className="staff-status">

              <div className="status-row">
                <div>
                  <span className="status-dot available"></span>
                  Available Teachers
                </div>

                <strong>{availableTeachers}</strong>
              </div>

              <div className="status-row">
                <div>
                  <span className="status-dot leave"></span>
                  On Leave
                </div>

                <strong>{teachersOnLeave}</strong>
              </div>

              <div className="status-row">
                <div>
                  <span className="status-dot assigned"></span>
                  Classes
                </div>

                <strong>{classes.length}</strong>
              </div>

            </div>

          </div>


          {/* RECENT ACTIVITY */}
          <div className="panel activity-panel">

            <div className="panel-header">

              <div>
                <h2>Recent Activity</h2>
                <p>Latest system updates</p>
              </div>

            </div>


            <div className="activity">

              <div className="activity-item">
                <div className="activity-icon">📄</div>

                <div>
                  <strong>Admission form processed</strong>
                  <span>AI Document Reader</span>
                </div>

                <small>5 min</small>
              </div>


              <div className="activity-item">
                <div className="activity-icon">👨‍🏫</div>

                <div>
                  <strong>Teacher marked on leave</strong>
                  <span>Smart Staffing</span>
                </div>

                <small>18 min</small>
              </div>


              <div className="activity-item">
                <div className="activity-icon">📅</div>

                <div>
                  <strong>Timetable updated</strong>
                  <span>Smart Timetable</span>
                </div>

                <small>32 min</small>
              </div>

            </div>

          </div>

        </section>


        {/* AI STATUS */}
        <div className="ai-status">

          <div className="ai-status-icon">🤖</div>

          <div>
            <strong>EduFlow AI is active</strong>
            <p>
              Your school operations are being monitored for conflicts,
              missing information and administrative actions.
            </p>
          </div>

          <span className="online">
            ● System Online
          </span>

        </div>

      </main>

    </div>
  );
}

export default Dashboard;