import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  teachers as defaultTeachers,
  students as defaultStudents,
} from "../data/schoolData";

function Attendance() {
  const navigate = useNavigate();

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

  const subjectGroupLower = [
    "English",
    "Maths",
    "Environmental Studies",
    "General Knowledge",
    "Hindi",
  ];

  const subjectGroupUpper = [
    "Hindi",
    "Maths",
    "English",
    "Science",
    "Social Science",
    "Computer",
  ];

  const [students, setStudents] = useState(defaultStudents || []);
  const [periodsForClass, setPeriodsForClass] = useState([]);

  const [selectedClass, setSelectedClass] = useState("");
  const [selectedPeriodIndex, setSelectedPeriodIndex] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );

  const [marks, setMarks] = useState({});
  const [newStudentName, setNewStudentName] = useState("");
  const [savedMessage, setSavedMessage] = useState("");

  /*
   * Time helpers, matching the same logic used on the
   * Smart Timetable page so periods line up.
   */
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToDisplayTime = (mins) => {
    const normalized = ((mins % 1440) + 1440) % 1440;
    let hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    const period = hour >= 12 ? "PM" : "AM";

    let displayHour = hour % 12;
    if (displayHour === 0) displayHour = 12;

    return `${displayHour}:${minute
      .toString()
      .padStart(2, "0")} ${period}`;
  };

  const buildPeriods = (timings) => {
    const start = timeToMinutes(timings.startTime);
    const end = timeToMinutes(timings.endTime);
    const lunchStart = timeToMinutes(timings.lunchStart);
    const periodLen = Number(timings.periodDuration) || 60;
    const lunchLen = Number(timings.lunchDuration) || 60;

    const result = [];
    let current = start;
    let safety = 0;

    while (current < end && safety < 30) {
      safety += 1;

      if (current === lunchStart) {
        result.push({
          time: `${minutesToDisplayTime(current)} - ${minutesToDisplayTime(
            current + lunchLen
          )}`,
          isLunch: true,
        });
        current += lunchLen;
        continue;
      }

      result.push({
        time: `${minutesToDisplayTime(current)} - ${minutesToDisplayTime(
          current + periodLen
        )}`,
        isLunch: false,
      });
      current += periodLen;
    }

    return result;
  };

  const teachesClass = (teacher, className) => {
    if (!teacher.classes) return false;

    if (Array.isArray(teacher.classes)) {
      return teacher.classes.includes(className);
    }

    return teacher.classes
      .toString()
      .toLowerCase()
      .includes(className.toLowerCase());
  };

  const teachesSubject = (teacher, subject) => {
    if (!teacher.subject) return false;

    return (
      teacher.subject.toString().toLowerCase() === subject.toLowerCase()
    );
  };

  /*
   * Load teachers, students, subjects and timings from
   * localStorage (falling back to the defaults from
   * schoolData.js), same sources the Timetable page uses.
   */
  const loadData = () => {
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

    let subjectsMap = {};
    const savedSubjects = localStorage.getItem("classSubjects");
    if (savedSubjects) {
      try {
        subjectsMap = JSON.parse(savedSubjects);
      } catch {
        console.log("Could not read saved class subjects");
      }
    }

    let timings = {
      startTime: "09:00",
      endTime: "16:00",
      periodDuration: 60,
      lunchStart: "12:00",
      lunchDuration: 60,
    };
    const savedTimings = localStorage.getItem("schoolTimings");
    if (savedTimings) {
      try {
        timings = JSON.parse(savedTimings);
      } catch {
        console.log("Could not read saved school timings");
      }
    }

    setStudents(roster);

    return { staff, subjectsMap, timings };
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  /*
   * Whenever the selected class changes, work out that
   * class's periods for the day — subject + teacher for each,
   * auto-filled from the same data the timetable uses.
   */
  useEffect(() => {
    if (!selectedClass) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPeriodsForClass([]);
      return;
    }

    const { staff, subjectsMap, timings } = loadData();
    const periodsList = buildPeriods(timings);
    const classIndex = classes.indexOf(selectedClass);

    const subjectsForClass =
      subjectsMap[selectedClass] && subjectsMap[selectedClass].length > 0
        ? subjectsMap[selectedClass]
        : classIndex <= 4
        ? subjectGroupLower
        : subjectGroupUpper;

    let subjectPointer = 0;

    const built = periodsList
      .filter((p) => !p.isLunch)
      .map((p) => {
        const subject =
          subjectsForClass[subjectPointer % subjectsForClass.length];
        subjectPointer += 1;

        const teacherMatch = staff.find(
          (teacher) =>
            teacher.status?.toLowerCase() === "available" &&
            teachesSubject(teacher, subject) &&
            teachesClass(teacher, selectedClass)
        );

        return {
          time: p.time,
          subject,
          teacher: teacherMatch ? teacherMatch.name : "No Teacher Available",
        };
      });

    setPeriodsForClass(built);
    setSelectedPeriodIndex("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass]);

  /*
   * When class + period + date are all chosen, load any
   * previously saved marks for that combination, or default
   * every student to Present.
   */
  useEffect(() => {
    if (selectedClass === "" || selectedPeriodIndex === "") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMarks({});
      return;
    }

    const period = periodsForClass[selectedPeriodIndex];
    if (!period) return;

    const recordKey = `${attendanceDate}_${selectedClass}_${period.time}`;
    const allRecords = JSON.parse(
      localStorage.getItem("attendanceRecords") || "{}"
    );

    const rosterForClass = students.filter(
      (s) => s.className === selectedClass
    );

    if (allRecords[recordKey]) {
      setMarks(allRecords[recordKey]);
    } else {
      const defaultMarks = {};
      rosterForClass.forEach((s) => {
        defaultMarks[s.id] = "Present";
      });
      setMarks(defaultMarks);
    }

    setSavedMessage("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClass, selectedPeriodIndex, attendanceDate, students]);

  const toggleMark = (studentId) => {
    setMarks((current) => ({
      ...current,
      [studentId]:
        current[studentId] === "Present" ? "Absent" : "Present",
    }));
  };

  const saveAttendance = () => {
    const period = periodsForClass[selectedPeriodIndex];
    if (!period) return;

    const recordKey = `${attendanceDate}_${selectedClass}_${period.time}`;
    const allRecords = JSON.parse(
      localStorage.getItem("attendanceRecords") || "{}"
    );

    allRecords[recordKey] = marks;
    localStorage.setItem("attendanceRecords", JSON.stringify(allRecords));

    setSavedMessage("✅ Attendance saved for " + selectedClass);
  };

  const addStudent = () => {
    if (newStudentName.trim() === "" || !selectedClass) return;

    const newId =
      students.length > 0
        ? Math.max(...students.map((s) => s.id)) + 1
        : 1;

    const updated = [
      ...students,
      { id: newId, name: newStudentName.trim(), className: selectedClass },
    ];

    setStudents(updated);
    localStorage.setItem("schoolStudents", JSON.stringify(updated));
    setNewStudentName("");
  };

  const removeStudent = (studentId) => {
    const student = students.find((s) => s.id === studentId);
    if (!student) return;

    const confirmed = window.confirm(
      `Remove ${student.name} from the roster?`
    );
    if (!confirmed) return;

    const updated = students.filter((s) => s.id !== studentId);
    setStudents(updated);
    localStorage.setItem("schoolStudents", JSON.stringify(updated));
  };

  const rosterForClass = students.filter(
    (s) => s.className === selectedClass
  );

  const presentCount = rosterForClass.filter(
    (s) => marks[s.id] === "Present"
  ).length;

  const absentCount = rosterForClass.filter(
    (s) => marks[s.id] === "Absent"
  ).length;

  const selectedPeriod =
    selectedPeriodIndex !== "" ? periodsForClass[selectedPeriodIndex] : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#eef4f8",
        padding: "30px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Back button */}
      <button
        onClick={() => navigate("/")}
        style={{
          background: "#2864e8",
          color: "white",
          border: "none",
          padding: "12px 24px",
          borderRadius: "8px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        ← Back to Dashboard
      </button>

      {/* Heading */}
      <h1
        style={{
          textAlign: "center",
          marginTop: "35px",
          fontSize: "40px",
        }}
      >
        ✅ Attendance
      </h1>

      <p
        style={{
          textAlign: "center",
          color: "#666",
          fontSize: "18px",
        }}
      >
        Pick a class and period — subject and teacher fill in
        automatically from the timetable
      </p>

      {/* Selectors */}
      <div
        style={{
          maxWidth: "800px",
          margin: "30px auto",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 3px 15px rgba(0,0,0,0.08)",
          padding: "25px",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "15px",
          }}
        >
          <div>
            <label style={labelStyle}>Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={inputStyle}
            >
              <option value="">Select class</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Period</label>
            <select
              value={selectedPeriodIndex}
              onChange={(e) => setSelectedPeriodIndex(e.target.value)}
              disabled={!selectedClass}
              style={inputStyle}
            >
              <option value="">Select period</option>
              {periodsForClass.map((p, index) => (
                <option key={index} value={index}>
                  {p.time} — {p.subject}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {selectedPeriod && (
          <div
            style={{
              marginTop: "18px",
              display: "flex",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <div style={autoFillBoxStyle}>
              📘 Subject: <b>{selectedPeriod.subject}</b>
            </div>

            <div style={autoFillBoxStyle}>
              👨‍🏫 Teacher:{" "}
              <b
                style={{
                  color:
                    selectedPeriod.teacher === "No Teacher Available"
                      ? "red"
                      : "inherit",
                }}
              >
                {selectedPeriod.teacher}
              </b>
            </div>

            <div style={autoFillBoxStyle}>
              🕒 Time: <b>{selectedPeriod.time}</b>
            </div>
          </div>
        )}
      </div>

      {/* Roster */}
      {selectedClass && selectedPeriodIndex !== "" && (
        <div
          style={{
            maxWidth: "800px",
            margin: "0 auto 30px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 3px 15px rgba(0,0,0,0.08)",
            padding: "25px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <h2 style={{ margin: 0 }}>{selectedClass} Roster</h2>

            <div style={{ fontSize: "14px", color: "#555" }}>
              🟢 Present: <b>{presentCount}</b> &nbsp; 🔴 Absent:{" "}
              <b>{absentCount}</b> &nbsp; Total:{" "}
              <b>{rosterForClass.length}</b>
            </div>
          </div>

          {rosterForClass.length === 0 ? (
            <p style={{ color: "#999" }}>
              No students in this class yet — add one below.
            </p>
          ) : (
            <div>
              {rosterForClass.map((student) => (
                <div
                  key={student.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid #f0f0f4",
                  }}
                >
                  <span>{student.name}</span>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => toggleMark(student.id)}
                      style={{
                        background:
                          marks[student.id] === "Present"
                            ? "#e8fff0"
                            : "#ffecec",
                        color:
                          marks[student.id] === "Present"
                            ? "#2a9d5c"
                            : "#e05252",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 16px",
                        fontSize: "13px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        minWidth: "100px",
                      }}
                    >
                      {marks[student.id] === "Present"
                        ? "🟢 Present"
                        : "🔴 Absent"}
                    </button>

                    <button
                      onClick={() => removeStudent(student.id)}
                      style={{
                        background: "#f5f5f5",
                        color: "#888",
                        border: "none",
                        borderRadius: "8px",
                        padding: "8px 10px",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add student */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <input
              type="text"
              placeholder={`Add a student to ${selectedClass}`}
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              style={{ ...inputStyle, flex: 1 }}
            />

            <button
              onClick={addStudent}
              style={{
                background: "#eeeaff",
                color: "#6656d9",
                border: "none",
                borderRadius: "8px",
                padding: "10px 18px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              ➕ Add
            </button>
          </div>

          {/* Save */}
          <div style={{ textAlign: "center", marginTop: "25px" }}>
            <button
              onClick={saveAttendance}
              style={{
                background: "#2864e8",
                color: "white",
                border: "none",
                borderRadius: "10px",
                padding: "14px 30px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              ✔ Save Attendance
            </button>

            {savedMessage && (
              <p style={{ color: "#2a9d5c", marginTop: "12px" }}>
                {savedMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "12px",
  color: "#666",
  marginBottom: "5px",
  fontWeight: "bold",
};

const inputStyle = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #ccc",
  fontSize: "14px",
  boxSizing: "border-box",
};

const autoFillBoxStyle = {
  background: "#f8fafc",
  border: "1px solid #eee",
  borderRadius: "8px",
  padding: "10px 16px",
  fontSize: "14px",
};

export default Attendance;