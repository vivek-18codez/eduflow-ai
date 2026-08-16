import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teachers as defaultTeachers } from "../data/schoolData";

function Timetable() {
  const navigate = useNavigate();

  const [timetable, setTimetable] = useState([]);
  const [teachers, setTeachers] = useState(defaultTeachers || []);
  const [classSubjects, setClassSubjects] = useState({});
  const [selectedClass, setSelectedClass] = useState(null);
  const [editingClass, setEditingClass] = useState(null);
  const [editValue, setEditValue] = useState("");

  const [schoolTimings, setSchoolTimings] = useState({
    startTime: "09:00",
    endTime: "16:00",
    periodDuration: 60,
    lunchStart: "12:00",
    lunchDuration: 60,
  });
  const [editingTimings, setEditingTimings] = useState(false);
  const [timingsDraft, setTimingsDraft] = useState(schoolTimings);

  const [approvedSubstitutions, setApprovedSubstitutions] = useState({});
  const [substituteOverrides, setSubstituteOverrides] = useState({});
  const [editingSubKey, setEditingSubKey] = useState(null);
  const [subDraftTeacher, setSubDraftTeacher] = useState("");

  // Classes
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
   * Default subject groups.
   * Classes 1-5 share one subject set, Classes 6-10 share another,
   * matching how the teaching staff is organised.
   */
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

  /*
   * Time helpers — everything is stored as "HH:MM" (24-hour)
   * and converted to minutes-since-midnight for math.
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

  /*
   * Build the list of periods (including lunch) from the
   * current school timings.
   */
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

  /*
   * Build the default subject rotation for a class based on
   * whether it's in the lower group (1-5) or upper group (6-10).
   */
  const buildDefaultSubjectsForClass = (classIndex, periodsList) => {
    const group =
      classIndex <= 4 ? subjectGroupLower : subjectGroupUpper;

    const teachingPeriodCount = periodsList.filter(
      (p) => !p.isLunch
    ).length;

    const subjectIndex = classIndex % group.length;
    const result = [];

    for (let i = 0; i < teachingPeriodCount; i++) {
      result.push(group[(subjectIndex + i) % group.length]);
    }

    return result;
  };

  /*
   * Load saved school timings, or fall back to defaults.
   */
  const loadSchoolTimings = () => {
    const saved = localStorage.getItem("schoolTimings");

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        console.log("Could not read saved school timings");
      }
    }

    return {
      startTime: "09:00",
      endTime: "16:00",
      periodDuration: 60,
      lunchStart: "12:00",
      lunchDuration: 60,
    };
  };

  /*
   * Load saved class-subject mapping, or build defaults
   * the first time the page is used.
   */
  const loadClassSubjects = (periodsList) => {
    const saved = localStorage.getItem("classSubjects");

    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        console.log("Could not read saved class subjects");
      }
    }

    const defaults = {};

    classes.forEach((className, classIndex) => {
      defaults[className] = buildDefaultSubjectsForClass(
        classIndex,
        periodsList
      );
    });

    return defaults;
  };

  /*
   * Check whether a teacher teaches a particular class.
   */
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

  /*
   * Check whether teacher teaches the subject.
   */
  const teachesSubject = (teacher, subject) => {
    if (!teacher.subject) return false;

    return (
      teacher.subject.toString().toLowerCase() === subject.toLowerCase()
    );
  };

  /*
   * Find replacement teacher.
   *
   * Conditions:
   * 1. Available
   * 2. Same subject (does not need to already teach this exact class)
   * 3. Not already teaching another class at that time
   */
  const findReplacementTeacher = (
    subject,
    className,
    period,
    currentTimetable,
    allTeachers
  ) => {
    const candidates = allTeachers.filter((teacher) => {
      const available =
        teacher.status?.toLowerCase() === "available";

      const correctSubject = teachesSubject(teacher, subject);

      const alreadyTeaching = currentTimetable.some(
        (row) =>
          row.time === period &&
          row.teacher === teacher.name
      );

      return (
        available &&
        correctSubject &&
        !alreadyTeaching
      );
    });

    return candidates.length > 0 ? candidates[0] : null;
  };

  /*
   * Generate timetable using the current periods list and
   * the (editable) subjects assigned to each class.
   *
   * overridesMap lets the admin manually pick a substitute for
   * a specific class+period, overriding the automatic pick.
   */
  const generateTimetable = (
    staff,
    subjectsMap,
    periodsList,
    overridesMap = {}
  ) => {
    const generated = [];

    classes.forEach((className, classIndex) => {
      const subjectsForClass =
        subjectsMap[className] && subjectsMap[className].length > 0
          ? subjectsMap[className]
          : classIndex <= 4
          ? subjectGroupLower
          : subjectGroupUpper;

      let subjectPointer = 0;

      periodsList.forEach((period) => {
        if (period.isLunch) {
          generated.push({
            time: period.time,
            class: className,
            subject: "Lunch Break",
            teacher: "-",
            room: `${100 + classIndex + 1}`,
            isLunch: true,
            isSubstitution: false,
            absentTeacherName: null,
          });
          return;
        }

        const subject =
          subjectsForClass[subjectPointer % subjectsForClass.length];

        subjectPointer += 1;

        /*
         * Find the teacher who is regularly assigned to teach
         * this subject to this class, regardless of whether
         * they're currently available — this is who we compare
         * against to detect a substitution.
         */
        const assignedTeacher = staff.find(
          (teacher) =>
            teachesSubject(teacher, subject) &&
            teachesClass(teacher, className)
        );

        const assignedAvailable =
          assignedTeacher &&
          assignedTeacher.status?.toLowerCase() === "available" &&
          !generated.some(
            (row) =>
              row.time === period.time &&
              row.teacher === assignedTeacher.name
          );

        let selectedTeacher;
        let isSubstitution = false;
        let absentTeacherName = null;

        if (assignedAvailable) {
          selectedTeacher = assignedTeacher;
        } else {
          selectedTeacher = findReplacementTeacher(
            subject,
            className,
            period.time,
            generated,
            staff
          );

          if (
            assignedTeacher &&
            assignedTeacher.status?.toLowerCase() === "on leave"
          ) {
            isSubstitution = true;
            absentTeacherName = assignedTeacher.name;
          }
        }

        /*
         * A manually chosen substitute (from the timetable UI)
         * overrides the automatic pick.
         */
        const overrideKey = `${className}::${period.time}`;
        const overrideName = overridesMap[overrideKey];

        if (overrideName) {
          const overrideTeacher = staff.find(
            (teacher) => teacher.name === overrideName
          );
          if (overrideTeacher) {
            selectedTeacher = overrideTeacher;
          }
        }

        generated.push({
          time: period.time,
          class: className,
          subject: subject,
          teacher: selectedTeacher
            ? selectedTeacher.name
            : "No Teacher Available",
          room: `${100 + classIndex + 1}`,
          isLunch: false,
          isSubstitution,
          absentTeacherName,
        });
      });
    });

    setTimetable(generated);
  };

  /*
   * Load everything (timings, teachers, subjects) and
   * generate the timetable.
   */
  const loadDataAndGenerateTimetable = () => {
    const savedTeachers = localStorage.getItem("schoolTeachers");

    let staff = defaultTeachers || [];

    if (savedTeachers) {
      try {
        staff = JSON.parse(savedTeachers);
      } catch {
        console.log("Could not read saved teachers");
      }
    }

    let approvals = {};
    const savedApprovals = localStorage.getItem("approvedSubstitutions");
    if (savedApprovals) {
      try {
        approvals = JSON.parse(savedApprovals);
      } catch {
        console.log("Could not read saved substitution approvals");
      }
    }

    let overrides = {};
    const savedOverrides = localStorage.getItem("substituteOverrides");
    if (savedOverrides) {
      try {
        overrides = JSON.parse(savedOverrides);
      } catch {
        console.log("Could not read saved substitute overrides");
      }
    }

    const timings = loadSchoolTimings();
    const periodsList = buildPeriods(timings);
    const subjectsMap = loadClassSubjects(periodsList);

    setTeachers(staff);
    setSchoolTimings(timings);
    setTimingsDraft(timings);
    setClassSubjects(subjectsMap);
    setApprovedSubstitutions(approvals);
    setSubstituteOverrides(overrides);
    generateTimetable(staff, subjectsMap, periodsList, overrides);
  };

  /*
   * Generate timetable when page opens.
   */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDataAndGenerateTimetable();
  }, []);

  /*
   * Listen for Smart Staffing changes.
   */
  useEffect(() => {
    const handleStorageChange = () => {
      loadDataAndGenerateTimetable();
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  /*
   * Clear all saved teacher / subject / timing data so the
   * page falls back to the defaults shipped in schoolData.js.
   */
  const resetToDefaults = () => {
    const confirmed = window.confirm(
      "This will clear any saved teachers, subjects and school timings from this browser, and reload the default data. Continue?"
    );

    if (!confirmed) return;

    localStorage.removeItem("schoolTeachers");
    localStorage.removeItem("classSubjects");
    localStorage.removeItem("schoolTimings");

    window.location.reload();
  };

  /*
   * Start editing a class's subject list.
   */
  const startEditingClass = (className) => {
    setEditingClass(className);
    setEditValue((classSubjects[className] || []).join(", "));
  };

  /*
   * Save the edited subject list for a class.
   */
  const saveClassSubjects = (className) => {
    const newSubjects = editValue
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "");

    if (newSubjects.length === 0) {
      alert("Please enter at least one subject.");
      return;
    }

    const updatedMap = {
      ...classSubjects,
      [className]: newSubjects,
    };

    setClassSubjects(updatedMap);
    localStorage.setItem("classSubjects", JSON.stringify(updatedMap));

    const periodsList = buildPeriods(schoolTimings);
    generateTimetable(teachers, updatedMap, periodsList, substituteOverrides);

    setEditingClass(null);
    setEditValue("");
  };

  const cancelEditingClass = () => {
    setEditingClass(null);
    setEditValue("");
  };

  /*
   * Key used to identify a specific class+period slot for
   * substitution approval / manual override.
   */
  const subKey = (className, periodTime) =>
    `${className}::${periodTime}`;

  /*
   * Approve the currently assigned substitute for a slot.
   */
  const approveSubstitution = (className, periodTime) => {
    const key = subKey(className, periodTime);
    const updated = { ...approvedSubstitutions, [key]: true };
    setApprovedSubstitutions(updated);
    localStorage.setItem(
      "approvedSubstitutions",
      JSON.stringify(updated)
    );
  };

  /*
   * Start editing (changing) the substitute teacher for a slot.
   */
  const startEditingSubstitute = (className, periodTime, currentTeacher) => {
    const key = subKey(className, periodTime);
    setEditingSubKey(key);
    setSubDraftTeacher(
      currentTeacher === "No Teacher Available" ? "" : currentTeacher
    );
  };

  const cancelEditingSubstitute = () => {
    setEditingSubKey(null);
    setSubDraftTeacher("");
  };

  /*
   * Save a manually chosen substitute for a slot. This both
   * overrides the auto-assigned teacher and approves the slot.
   */
  const saveSubstitute = (className, periodTime) => {
    if (!subDraftTeacher) {
      alert("Please choose a teacher.");
      return;
    }

    const key = subKey(className, periodTime);

    const updatedOverrides = {
      ...substituteOverrides,
      [key]: subDraftTeacher,
    };
    setSubstituteOverrides(updatedOverrides);
    localStorage.setItem(
      "substituteOverrides",
      JSON.stringify(updatedOverrides)
    );

    const updatedApprovals = { ...approvedSubstitutions, [key]: true };
    setApprovedSubstitutions(updatedApprovals);
    localStorage.setItem(
      "approvedSubstitutions",
      JSON.stringify(updatedApprovals)
    );

    const periodsList = buildPeriods(schoolTimings);
    generateTimetable(teachers, classSubjects, periodsList, updatedOverrides);

    setEditingSubKey(null);
    setSubDraftTeacher("");
  };

  /*
   * Save edited school timings.
   */
  const saveTimings = () => {
    const start = timeToMinutes(timingsDraft.startTime);
    const end = timeToMinutes(timingsDraft.endTime);
    const lunch = timeToMinutes(timingsDraft.lunchStart);
    const periodLen = Number(timingsDraft.periodDuration);
    const lunchLen = Number(timingsDraft.lunchDuration);

    if (end <= start) {
      alert("End time must be after start time.");
      return;
    }

    if (!periodLen || periodLen <= 0) {
      alert("Period duration must be a positive number of minutes.");
      return;
    }

    if (!lunchLen || lunchLen <= 0) {
      alert("Lunch duration must be a positive number of minutes.");
      return;
    }

    if (lunch < start || lunch >= end) {
      alert("Lunch start time must fall within school hours.");
      return;
    }

    localStorage.setItem("schoolTimings", JSON.stringify(timingsDraft));

    const periodsList = buildPeriods(timingsDraft);
    const currentSubjects =
      Object.keys(classSubjects).length > 0
        ? classSubjects
        : loadClassSubjects(periodsList);

    setSchoolTimings(timingsDraft);
    generateTimetable(teachers, currentSubjects, periodsList, substituteOverrides);
    setEditingTimings(false);
  };

  const cancelEditingTimings = () => {
    setTimingsDraft(schoolTimings);
    setEditingTimings(false);
  };

  /*
   * Count teachers on leave.
   */
  const teachersOnLeave = teachers.filter(
    (teacher) => teacher.status?.toLowerCase() === "on leave"
  );

  /*
   * Count available teachers.
   */
  const availableTeachers = teachers.filter(
    (teacher) => teacher.status?.toLowerCase() === "available"
  );

  /*
   * Whether a class has any substitution that hasn't been
   * approved yet — used to show a red mark on that class's
   * button. Once every substitution for a class is approved,
   * the red mark clears (even though the teacher is still
   * on leave in Smart Staffing).
   */
  const classHasPendingSubstitution = (className) =>
    timetable.some(
      (row) =>
        row.class === className &&
        row.isSubstitution &&
        !approvedSubstitutions[subKey(className, row.time)]
    );

  /*
   * Rows for the currently selected class only.
   */
  const visibleRows = selectedClass
    ? timetable.filter((row) => row.class === selectedClass)
    : [];

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
        📅 Smart Timetable
      </h1>

      <p
        style={{
          textAlign: "center",
          color: "#666",
          fontSize: "18px",
        }}
      >
        AI-generated timetable based on teacher availability
      </p>

      {/* Reset button */}
      <div style={{ textAlign: "center", marginBottom: "10px" }}>
        <button
          onClick={resetToDefaults}
          style={{
            background: "transparent",
            color: "#999",
            border: "1px solid #ccc",
            borderRadius: "8px",
            padding: "6px 14px",
            fontSize: "12px",
            cursor: "pointer",
          }}
        >
          🔄 Reset Teachers, Subjects &amp; Timings to Defaults
        </button>
      </div>

      {/* Staff status */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "20px",
          margin: "30px 0",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            background: "white",
            padding: "18px 35px",
            borderRadius: "12px",
            boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
          }}
        >
          👥 Total Staff: <b>{teachers.length}</b>
        </div>

        <div
          style={{
            background: "#e8fff0",
            padding: "18px 35px",
            borderRadius: "12px",
          }}
        >
          🟢 Available: <b>{availableTeachers.length}</b>
        </div>

        <div
          style={{
            background: "#ffecec",
            padding: "18px 35px",
            borderRadius: "12px",
          }}
        >
          🔴 On Leave: <b>{teachersOnLeave.length}</b>
        </div>
      </div>

      {/* School Timings (editable) */}
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto 25px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 3px 12px rgba(0,0,0,0.08)",
          padding: "20px 25px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px" }}>
            🕒 School Timings
          </h2>

          {!editingTimings && (
            <button
              onClick={() => setEditingTimings(true)}
              style={{
                background: "#eeeaff",
                color: "#6656d9",
                border: "none",
                borderRadius: "6px",
                padding: "6px 12px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              ✏ Edit
            </button>
          )}
        </div>

        {!editingTimings ? (
          <p style={{ color: "#555", marginBottom: 0, marginTop: "10px" }}>
            School runs {minutesToDisplayTime(
              timeToMinutes(schoolTimings.startTime)
            )}{" "}
            – {minutesToDisplayTime(timeToMinutes(schoolTimings.endTime))},{" "}
            {schoolTimings.periodDuration}-minute periods, lunch at{" "}
            {minutesToDisplayTime(
              timeToMinutes(schoolTimings.lunchStart)
            )}{" "}
            for {schoolTimings.lunchDuration} minutes.
          </p>
        ) : (
          <div style={{ marginTop: "15px" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
              }}
            >
              <div>
                <label style={labelStyle}>School Start Time</label>
                <input
                  type="time"
                  value={timingsDraft.startTime}
                  onChange={(e) =>
                    setTimingsDraft({
                      ...timingsDraft,
                      startTime: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>School End Time</label>
                <input
                  type="time"
                  value={timingsDraft.endTime}
                  onChange={(e) =>
                    setTimingsDraft({
                      ...timingsDraft,
                      endTime: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Period Duration (minutes)
                </label>
                <input
                  type="number"
                  min="10"
                  value={timingsDraft.periodDuration}
                  onChange={(e) =>
                    setTimingsDraft({
                      ...timingsDraft,
                      periodDuration: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>
                  Lunch Duration (minutes)
                </label>
                <input
                  type="number"
                  min="10"
                  value={timingsDraft.lunchDuration}
                  onChange={(e) =>
                    setTimingsDraft({
                      ...timingsDraft,
                      lunchDuration: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>

              <div>
                <label style={labelStyle}>Lunch Start Time</label>
                <input
                  type="time"
                  value={timingsDraft.lunchStart}
                  onChange={(e) =>
                    setTimingsDraft({
                      ...timingsDraft,
                      lunchStart: e.target.value,
                    })
                  }
                  style={inputStyle}
                />
              </div>
            </div>

            <p
              style={{
                color: "#999",
                fontSize: "12px",
                marginTop: "10px",
              }}
            >
              Lunch start time must land exactly on a period boundary
              (e.g. if periods are 60 minutes starting at 9:00, valid
              lunch starts are 10:00, 11:00, 12:00...).
            </p>

            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
              <button onClick={saveTimings} style={saveBtnStyle}>
                ✔ Save
              </button>

              <button
                onClick={cancelEditingTimings}
                style={cancelBtnStyle}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CLASS PICKER or SELECTED CLASS TIMETABLE */}
      {!selectedClass ? (
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
          }}
        >
          <h2 style={{ textAlign: "center" }}>
            Select a class to view its timetable
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(150px, 1fr))",
              gap: "15px",
              marginTop: "20px",
            }}
          >
            {classes.map((className) => (
              <button
                key={className}
                onClick={() => setSelectedClass(className)}
                style={{
                  position: "relative",
                  background: "white",
                  color: "#222",
                  border: "1px solid #ddd",
                  borderRadius: "12px",
                  padding: "25px 10px",
                  fontSize: "17px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
                }}
              >
                {classHasPendingSubstitution(className) && (
                  <span
                    title="A teacher for this class is on leave"
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "10px",
                      color: "red",
                      fontSize: "20px",
                    }}
                  >
                    🔴
                  </span>
                )}
                <span style={{ color: "#222" }}>{className}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "15px",
            }}
          >
            <button
              onClick={() => setSelectedClass(null)}
              style={{
                background: "#eee",
                color: "#333",
                border: "none",
                borderRadius: "8px",
                padding: "10px 18px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              ← Back to Class List
            </button>

            <h2 style={{ margin: 0 }}>
              {selectedClass}
              {classHasPendingSubstitution(selectedClass) && (
                <span style={{ color: "red", marginLeft: "10px" }}>
                  🔴 Substitution needs approval
                </span>
              )}
            </h2>
          </div>

          {/* Timetable */}
          <div
            style={{
              background: "white",
              borderRadius: "12px",
              overflowX: "auto",
              boxShadow: "0 3px 15px rgba(0,0,0,0.08)",
            }}
          >
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "700px",
              }}
            >
              <thead>
                <tr
                  style={{
                    background: "#2864e8",
                    color: "white",
                  }}
                >
                  <th style={thStyle}>Time</th>
                  <th style={thStyle}>Subject</th>
                  <th style={thStyle}>Teacher</th>
                  <th style={thStyle}>Room</th>
                </tr>
              </thead>

              <tbody>
                {visibleRows.map((row, index) => (
                  <tr
                    key={index}
                    style={{
                      background: row.isLunch
                        ? "#fff7df"
                        : index % 2 === 0
                        ? "#f8fafc"
                        : "white",
                    }}
                  >
                    <td style={tdStyle}>{row.time}</td>

                    <td style={tdStyle}>
                      {row.isLunch ? (
                        <b>🍱 Lunch Break</b>
                      ) : (
                        row.subject
                      )}
                    </td>

                    <td style={tdStyle}>
                      {row.teacher === "No Teacher Available" ? (
                        <span
                          style={{
                            color: "red",
                            fontWeight: "bold",
                          }}
                        >
                          ⚠ No Teacher Available
                        </span>
                      ) : (
                        row.teacher
                      )}
                    </td>

                    <td style={tdStyle}>{row.room}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Substitution notices for this class */}
          {visibleRows
            .filter((row) => row.isSubstitution)
            .map((row) => {
              const key = subKey(row.class, row.time);
              const isApproved = Boolean(approvedSubstitutions[key]);
              const isEditingThis = editingSubKey === key;
              const hasSubstitute = row.teacher !== "No Teacher Available";

              return (
                <div
                  key={key}
                  style={{
                    marginTop: "15px",
                    background: isApproved ? "#e9f9ed" : "#fff8e6",
                    border: `2px solid ${
                      isApproved ? "#32b64a" : "#e0a83c"
                    }`,
                    borderRadius: "10px",
                    padding: "15px 18px",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "14px" }}>
                    {isApproved ? "✅" : "⚠️"}{" "}
                    <b>{row.absentTeacherName}</b> is absent for{" "}
                    <b>{row.subject}</b> ({row.time}).{" "}
                    {hasSubstitute ? (
                      <>
                        <b>{row.teacher}</b> is substituting for{" "}
                        {row.class}.
                      </>
                    ) : (
                      <span style={{ color: "red" }}>
                        No substitute has been assigned yet.
                      </span>
                    )}
                  </p>

                  {isEditingThis ? (
                    <div
                      style={{
                        marginTop: "10px",
                        display: "flex",
                        gap: "8px",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <select
                        value={subDraftTeacher}
                        onChange={(e) =>
                          setSubDraftTeacher(e.target.value)
                        }
                        style={{ ...inputStyle, width: "auto" }}
                      >
                        <option value="">Choose a teacher</option>
                        {teachers
                          .filter(
                            (t) =>
                              t.status?.toLowerCase() === "available"
                          )
                          .map((t) => (
                            <option key={t.id} value={t.name}>
                              {t.name} ({t.subject})
                            </option>
                          ))}
                      </select>

                      <button
                        onClick={() => saveSubstitute(row.class, row.time)}
                        style={saveBtnStyle}
                      >
                        ✔ Save
                      </button>

                      <button
                        onClick={cancelEditingSubstitute}
                        style={cancelBtnStyle}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div
                      style={{
                        marginTop: "10px",
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      {!isApproved && hasSubstitute && (
                        <button
                          onClick={() =>
                            approveSubstitution(row.class, row.time)
                          }
                          style={saveBtnStyle}
                        >
                          ✔ Approve
                        </button>
                      )}

                      <button
                        onClick={() =>
                          startEditingSubstitute(
                            row.class,
                            row.time,
                            row.teacher
                          )
                        }
                        style={{
                          background: "#eeeaff",
                          color: "#6656d9",
                          border: "none",
                          borderRadius: "6px",
                          padding: "6px 12px",
                          fontSize: "13px",
                          cursor: "pointer",
                        }}
                      >
                        ✏{" "}
                        {hasSubstitute
                          ? "Change Substitute"
                          : "Assign Substitute"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Class Subjects Overview (editable) */}
      <div
        style={{
          margin: "35px auto",
          maxWidth: "1000px",
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 3px 15px rgba(0,0,0,0.08)",
          padding: "25px",
        }}
      >
        <h2 style={{ textAlign: "center", marginTop: 0 }}>
          📚 Subjects by Class
        </h2>

        <p
          style={{
            textAlign: "center",
            color: "#666",
            marginBottom: "25px",
          }}
        >
          Which subjects each class has — click Edit to change them
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "15px",
          }}
        >
          {classes.map((className) => {
            const subjectsForClass = classSubjects[className] || [];
            const isEditing = editingClass === className;

            return (
              <div
                key={className}
                style={{
                  border: "1px solid #eee",
                  borderRadius: "10px",
                  padding: "15px",
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "10px",
                  }}
                >
                  <h3 style={{ margin: 0 }}>{className}</h3>

                  {!isEditing && (
                    <button
                      onClick={() => startEditingClass(className)}
                      style={{
                        background: "#eeeaff",
                        color: "#6656d9",
                        border: "none",
                        borderRadius: "6px",
                        padding: "5px 10px",
                        fontSize: "12px",
                        cursor: "pointer",
                      }}
                    >
                      ✏ Edit
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <div>
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      placeholder="e.g. English, Maths, Hindi"
                      style={{
                        width: "100%",
                        minHeight: "70px",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        resize: "vertical",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        marginTop: "8px",
                      }}
                    >
                      <button
                        onClick={() => saveClassSubjects(className)}
                        style={saveBtnStyle}
                      >
                        ✔ Save
                      </button>

                      <button
                        onClick={cancelEditingClass}
                        style={cancelBtnStyle}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : subjectsForClass.length === 0 ? (
                  <p style={{ color: "#999", margin: 0 }}>
                    No subjects assigned
                  </p>
                ) : (
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "18px",
                    }}
                  >
                    {subjectsForClass.map((subject, i) => (
                      <li key={`${subject}-${i}`}>{subject}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI analysis */}
      <div
        style={{
          margin: "35px auto",
          maxWidth: "1000px",
          background: "#e9f9ed",
          border: "2px solid #32b64a",
          borderRadius: "12px",
          padding: "25px",
          textAlign: "center",
        }}
      >
        <h2>🤖 AI Timetable Analysis</h2>

        <p>✅ Teacher availability checked</p>

        <p>✅ Teacher double-booking prevented</p>

        <p>✅ Staff on leave detected</p>

        <p>✅ Replacement teachers assigned where possible</p>

        <p>✅ Lunch break scheduled automatically</p>

        <p>✅ Classes scheduled from Class 1 to Class 10</p>
      </div>

      {/* Leave information */}
      {teachersOnLeave.length > 0 && (
        <div
          style={{
            maxWidth: "1000px",
            margin: "20px auto",
            background: "#fff4f4",
            border: "2px solid #e05252",
            borderRadius: "12px",
            padding: "25px",
          }}
        >
          <h2>⚠️ Staff Leave Detected</h2>

          {teachersOnLeave.map((teacher) => (
            <p key={teacher.id || teacher.name}>
              🔴 <b>{teacher.name}</b> — {teacher.subject} —{" "}
              {Array.isArray(teacher.classes)
                ? teacher.classes.join(", ")
                : teacher.classes}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

const thStyle = {
  padding: "18px",
  border: "1px solid #ddd",
  textAlign: "center",
  fontSize: "17px",
};

const tdStyle = {
  padding: "15px",
  border: "1px solid #ddd",
  textAlign: "center",
  fontSize: "16px",
};

const labelStyle = {
  display: "block",
  fontSize: "12px",
  color: "#666",
  marginBottom: "4px",
};

const inputStyle = {
  width: "100%",
  padding: "8px",
  borderRadius: "6px",
  border: "1px solid #ccc",
  fontSize: "14px",
  boxSizing: "border-box",
};

const saveBtnStyle = {
  background: "#2864e8",
  color: "white",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "13px",
  cursor: "pointer",
};

const cancelBtnStyle = {
  background: "#eee",
  color: "#333",
  border: "none",
  borderRadius: "6px",
  padding: "6px 12px",
  fontSize: "13px",
  cursor: "pointer",
};

export default Timetable;
