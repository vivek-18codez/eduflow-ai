import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { teachers as defaultTeachers } from "../data/schoolData";

function SmartStaffing() {
  const navigate = useNavigate();

  // Load teachers saved by the administrator.
  // If nothing is saved yet, use the initial school data.
  const [teachers, setTeachers] = useState(() => {
    const savedTeachers = localStorage.getItem("schoolTeachers");

    if (savedTeachers) {
      try {
        return JSON.parse(savedTeachers);
      } catch {
        return defaultTeachers;
      }
    }

    return defaultTeachers;
  });

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    classes: "",
  });

  // Save changes to browser storage
  useEffect(() => {
    localStorage.setItem(
      "schoolTeachers",
      JSON.stringify(teachers)
    );
  }, [teachers]);

  // --------------------------------
  // ADD / UPDATE TEACHER
  // --------------------------------

  const handleSubmit = (e) => {
    e.preventDefault();

    if (
      formData.name.trim() === "" ||
      formData.subject.trim() === "" ||
      formData.classes.trim() === ""
    ) {
      alert("Please fill all teacher details.");
      return;
    }

    const classList = formData.classes
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item !== "");

    // EDIT EXISTING TEACHER
    if (editingId !== null) {
      setTeachers((currentTeachers) =>
        currentTeachers.map((teacher) =>
          teacher.id === editingId
            ? {
                ...teacher,
                name: formData.name.trim(),
                subject: formData.subject.trim(),
                classes: classList,
              }
            : teacher
        )
      );

      resetForm();
      return;
    }

    // ADD NEW TEACHER
    const newId =
      teachers.length > 0
        ? Math.max(
            ...teachers.map((teacher) => teacher.id)
          ) + 1
        : 1;

    const newTeacher = {
      id: newId,
      name: formData.name.trim(),
      subject: formData.subject.trim(),
      classes: classList,
      status: "Available",
    };

    setTeachers((currentTeachers) => [
      ...currentTeachers,
      newTeacher,
    ]);

    resetForm();
  };

  // --------------------------------
  // DELETE TEACHER
  // --------------------------------

  const deleteTeacher = (id) => {
    const teacher = teachers.find(
      (item) => item.id === id
    );

    if (!teacher) return;

    const confirmed = window.confirm(
      `Are you sure you want to remove ${teacher.name}?`
    );

    if (!confirmed) return;

    setTeachers((currentTeachers) =>
      currentTeachers.filter(
        (item) => item.id !== id
      )
    );
  };

  // --------------------------------
  // EDIT TEACHER
  // --------------------------------

  const editTeacher = (teacher) => {
    setEditingId(teacher.id);

    setFormData({
      name: teacher.name,
      subject: teacher.subject,
      classes: teacher.classes.join(", "),
    });

    setShowForm(true);
  };

  // --------------------------------
  // MARK LEAVE / AVAILABLE
  // --------------------------------

  const toggleLeave = (id) => {
    setTeachers((currentTeachers) =>
      currentTeachers.map((teacher) =>
        teacher.id === id
          ? {
              ...teacher,
              status:
                teacher.status === "Available"
                  ? "On Leave"
                  : "Available",
            }
          : teacher
      )
    );
  };

  // --------------------------------
  // RESET FORM
  // --------------------------------

  const resetForm = () => {
    setFormData({
      name: "",
      subject: "",
      classes: "",
    });

    setEditingId(null);
    setShowForm(false);
  };

  // --------------------------------
  // STATISTICS
  // --------------------------------

  const totalStaff = teachers.length;

  const availableStaff = teachers.filter(
    (teacher) =>
      teacher.status === "Available"
  ).length;

  const leaveStaff = teachers.filter(
    (teacher) =>
      teacher.status === "On Leave"
  ).length;

  const teachersOnLeave = teachers.filter(
    (teacher) =>
      teacher.status === "On Leave"
  );

  // --------------------------------
  // PAGE
  // --------------------------------

  return (
    <div className="app">

      {/* BACK BUTTON */}

      <button
        onClick={() => navigate("/")}
      >
        ⬅ Back to Dashboard
      </button>

      {/* TITLE */}

      <h1>👨‍🏫 Smart Staffing</h1>

      <p>
        Manage teachers, subjects, classes and
        staff availability.
      </p>

      {/* STATISTICS */}

      <div className="info-grid">

        <div className="info-card">
          <h3>👥 Total Staff</h3>
          <h1>{totalStaff}</h1>
        </div>

        <div className="info-card">
          <h3>🟢 Available</h3>
          <h1>{availableStaff}</h1>
        </div>

        <div className="info-card">
          <h3>🔴 On Leave</h3>
          <h1>{leaveStaff}</h1>
        </div>

      </div>

      {/* STAFF MANAGEMENT */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "40px",
          marginBottom: "20px",
        }}
      >

        <h2>👨‍🏫 Teacher Management</h2>

        <button
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setShowForm(true);
            }
          }}
        >
          {showForm
            ? "✖ Close"
            : "➕ Add Teacher"}
        </button>

      </div>

      {/* ADD / EDIT FORM */}

      {showForm && (
        <form
          className="info-card"
          onSubmit={handleSubmit}
          style={{
            marginBottom: "30px",
          }}
        >

          <h2>
            {editingId !== null
              ? "✏ Edit Teacher"
              : "➕ Add New Teacher"}
          </h2>

          <input
            className="edit-input"
            type="text"
            placeholder="Teacher Name"
            value={formData.name}
            onChange={(e) =>
              setFormData({
                ...formData,
                name: e.target.value,
              })
            }
          />

          <input
            className="edit-input"
            type="text"
            placeholder="Subject"
            value={formData.subject}
            onChange={(e) =>
              setFormData({
                ...formData,
                subject: e.target.value,
              })
            }
          />

          <input
            className="edit-input"
            type="text"
            placeholder="Classes e.g. Class 8, Class 9, Class 10"
            value={formData.classes}
            onChange={(e) =>
              setFormData({
                ...formData,
                classes: e.target.value,
              })
            }
          />

          <div style={{ marginTop: "15px" }}>

            <button type="submit">
              {editingId !== null
                ? "✔ Update Teacher"
                : "✔ Add Teacher"}
            </button>

            {editingId !== null && (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  marginLeft: "10px",
                }}
              >
                Cancel
              </button>
            )}

          </div>

        </form>
      )}

      {/* TEACHER TABLE */}

      <div
        style={{
          overflowX: "auto",
          marginTop: "20px",
        }}
      >

        <table
          className="table"
          style={{
            width: "100%",
          }}
        >

          <thead>

            <tr>
              <th>Teacher</th>
              <th>Subject</th>
              <th>Classes</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>

          </thead>

          <tbody>

            {teachers.length === 0 ? (

              <tr>

                <td
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    padding: "30px",
                  }}
                >
                  No teachers added yet.
                </td>

              </tr>

            ) : (

              teachers.map((teacher) => (

                <tr key={teacher.id}>

                  <td>
                    <strong>
                      {teacher.name}
                    </strong>
                  </td>

                  <td>
                    {teacher.subject}
                  </td>

                  <td>
                    {teacher.classes.join(", ")}
                  </td>

                  <td>

                    {teacher.status ===
                    "Available" ? (
                      <span>
                        🟢 Available
                      </span>
                    ) : (
                      <span>
                        🔴 On Leave
                      </span>
                    )}

                  </td>

                  <td>

                    <button
                      onClick={() =>
                        editTeacher(teacher)
                      }
                    >
                      ✏ Edit
                    </button>

                    <button
                      onClick={() =>
                        toggleLeave(
                          teacher.id
                        )
                      }
                      style={{
                        marginLeft: "5px",
                      }}
                    >
                      {teacher.status ===
                      "Available"
                        ? "📅 Leave"
                        : "🟢 Available"}
                    </button>

                    <button
                      onClick={() =>
                        deleteTeacher(
                          teacher.id
                        )
                      }
                      style={{
                        marginLeft: "5px",
                      }}
                    >
                      🗑 Delete
                    </button>

                  </td>

                </tr>

              ))

            )}

          </tbody>

        </table>

      </div>

      {/* LEAVE ALERT */}

      {teachersOnLeave.length > 0 && (

        <div
          className="success-box"
          style={{
            marginTop: "30px",
          }}
        >

          <h2>
            ⚠️ Staff Leave Detected
          </h2>

          {teachersOnLeave.map(
            (teacher) => (

              <div
                key={teacher.id}
                style={{
                  marginBottom: "15px",
                }}
              >

                <strong>
                  🔴 {teacher.name}
                </strong>

                <br />

                Subject:{" "}
                {teacher.subject}

                <br />

                Affected Classes:{" "}
                {teacher.classes.join(", ")}

              </div>

            )
          )}

          <hr />

          <p>
            🤖{" "}
            <strong>
              Smart Timetable Alert:
            </strong>
          </p>

          <p>
            The timetable will check these
            affected classes and find
            available teachers.
          </p>

          <button
            onClick={() =>
              navigate("/timetable")
            }
          >
            📅 Open Smart Timetable
          </button>

        </div>

      )}

    </div>
  );
}

export default SmartStaffing;