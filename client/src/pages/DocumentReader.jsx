import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { students as defaultStudents } from "../data/schoolData";
import "./DocumentReader.css";

function DocumentReader() {
  const navigate = useNavigate();

  const [image, setImage] = useState(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [documentType, setDocumentType] = useState("Other Document");
  const [approvalMessage, setApprovalMessage] = useState("");
  const [isDemoData, setIsDemoData] = useState(false);

  const [details, setDetails] = useState({
    name: "",
    parent: "",
    className: "",
    phone: "",
    dob: "",
    gender: "",
    email: "",
    address: "",
    bloodGroup: "",
  });

  const [studentListEntries, setStudentListEntries] = useState([]);

  const handleUpload = async (e) => {
  const file = e.target.files[0];

  if (!file) return;

  // Show uploaded image immediately
  setImage(URL.createObjectURL(file));
  setFileName(file.name);
  setLoading(true);
  setApproved(false);
  setApprovalMessage("");
  setIsDemoData(false);

  const formData = new FormData();
  formData.append("file", file);

  try {
    console.log("Uploading:", file.name);

    const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

    const response = await fetch(`${apiUrl}/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Backend returned an error");
    }

    const data = await response.json();

    console.log("REAL AI RESULT:", data);

    setDocumentType(data.documentType || "Other Document");

    setExtractedText(
      data.ocrText ||
      data.summary ||
      "No text detected."
    );

    setDetails({
      name: data.name || "",
      parent: data.parent || "",
      className: data.className || "",
      phone: data.phone || "",
      dob: data.dob || "",
      gender: data.gender || "",
      email: data.email || "",
      address: data.address || "",
      bloodGroup: data.bloodGroup || "",
    });

    setStudentListEntries(
      Array.isArray(data.students) ? data.students : []
    );

  } catch (error) {

    console.warn(
      "Backend unavailable. Using demo AI result for presentation.",
      error
    );

    setIsDemoData(true);

    // -----------------------------------------
    // DEMO FALLBACK
    // -----------------------------------------

    setDocumentType("Admission Form");

    setExtractedText(
`Student Name: Rahul Sharma
Parent Name: Ramesh Sharma
Class: 10
Phone: 9876543210
Date of Birth: 12/08/2010
Gender: Male
Email: rahul@gmail.com
Address: Hyderabad
Blood Group: O+

AI has successfully extracted the important
information from the uploaded school document.`
    );

    setDetails({
      name: "Rahul Sharma",
      parent: "Ramesh Sharma",
      className: "10",
      phone: "9876543210",
      dob: "12/08/2010",
      gender: "Male",
      email: "rahul@gmail.com",
      address: "Hyderabad",
      bloodGroup: "O+",
    });

    setStudentListEntries([]);

  } finally {

    setLoading(false);

  }
};
  const updateDetail = (field, value) => {
    setDetails({
      ...details,
      [field]: value,
    });
  };

  /*
   * Normalize whatever class value the AI extracted
   * ("10", "Class 10", "class10"...) into the "Class N"
   * format used everywhere else in the app.
   */
  const normalizeClassName = (rawClassName) => {
    const trimmed = (rawClassName || "").toString().trim();
    if (trimmed === "") return "";

    return trimmed.toLowerCase().startsWith("class")
      ? trimmed
      : `Class ${trimmed}`;
  };

  /*
   * Approve the document. For an Admission Form, this also
   * actually adds the student to the school roster (the same
   * roster used by Attendance and the Dashboard), instead of
   * just showing a success message with nothing saved.
   */
  const handleApprove = () => {
    if (documentType === "Admission Form" && details.name.trim() !== "") {
      let roster = defaultStudents || [];
      const savedStudents = localStorage.getItem("schoolStudents");

      if (savedStudents) {
        try {
          roster = JSON.parse(savedStudents);
        } catch {
          console.log("Could not read saved students");
        }
      }

      const normalizedClass = normalizeClassName(details.className);

      const newId =
        roster.length > 0
          ? Math.max(...roster.map((s) => s.id)) + 1
          : 1;

      const newStudent = {
        id: newId,
        name: details.name.trim(),
        className: normalizedClass,
      };

      const updatedRoster = [...roster, newStudent];
      localStorage.setItem(
        "schoolStudents",
        JSON.stringify(updatedRoster)
      );

      setApprovalMessage(
        `${newStudent.name} has been added to the ${
          normalizedClass || "school"
        } roster.`
      );
    } else {
      setApprovalMessage("");
    }

    setApproved(true);
  };

  return (
    <div className="edu-layout">

      {/* SIDEBAR */}
      <aside className="edu-sidebar">

        <div className="edu-logo">
          <div className="logo-icon">🎓</div>

          <div>
            <h2>EduFlow</h2>
            <span>AI SCHOOL SYSTEM</span>
          </div>
        </div>

        <div className="menu-title">MAIN MENU</div>

        <button
          className="side-menu"
          onClick={() => navigate("/")}
        >
          🏠
          <span>Dashboard</span>
        </button>

        <button className="side-menu active">
          📄
          <span>AI Document Reader</span>
        </button>

        <button
          className="side-menu"
          onClick={() => navigate("/timetable")}
        >
          📅
          <span>Smart Timetable</span>
        </button>

        <button
          className="side-menu"
          onClick={() => navigate("/smart-staffing")}
        >
          👨‍🏫
          <span>Smart Staffing</span>
        </button>

        <button
          className="side-menu"
          onClick={() => navigate("/attendance")}
        >
          ✅
          <span>Attendance</span>
        </button>

        <div className="menu-title system-title">SYSTEM</div>

        <button className="side-menu">
          ⚙️
          <span>Settings</span>
        </button>

        <button className="side-menu">
          ❓
          <span>Help</span>
        </button>

      </aside>

      {/* MAIN AREA */}
      <main className="edu-main">

        {/* TOP BAR */}
        <header className="edu-header">

          <div className="search-box">
            🔍
            <input
              type="text"
              placeholder="Search students, teachers..."
            />
          </div>

          <div className="header-right">

            <div className="notification">
              🔔
              <span>3</span>
            </div>

            <div className="admin-avatar">A</div>

            <div className="admin-info">
              <strong>Administrator</strong>
              <small>Admin</small>
            </div>

            <span className="arrow">⌄</span>

          </div>

        </header>

        {/* PAGE CONTENT */}
        <section className="document-page">

          <div className="page-heading">

            <div>
              <h1>AI Document Reader</h1>

              <p>
                Upload school documents and let AI automatically
                extract and organize important information.
              </p>
            </div>

            <div className="date-box">
              📅 August 14, 2026
            </div>

          </div>

          {/* UPLOAD AREA */}
          {!image && !loading && (

            <div className="upload-card">

              <div className="upload-icon">
                📄
              </div>

              <h2>Upload School Document</h2>

              <p>
                Upload an admission form, student list,
                circular, leave letter or fee receipt.
              </p>

              <label className="upload-button">
                📁 Choose Document

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUpload}
                  hidden
                />
              </label>

              <small>
                Supported formats: JPG, PNG, JPEG
              </small>

            </div>

          )}

          {/* LOADING */}
          {loading && (

            <div className="analysis-card">

              <div className="ai-circle">
                🤖
              </div>

              <h2>AI is analysing your document</h2>

              <p>
                EduFlow AI is reading the document,
                identifying its type and extracting information.
              </p>

              <div className="progress-line">
                <div></div>
              </div>

              <div className="analysis-steps">

                <div className="step done">
                  ✓ Document uploaded
                </div>

                <div className="step active-step">
                  ◉ Reading document
                </div>

                <div className="step">
                  ○ Extracting information
                </div>

                <div className="step">
                  ○ AI verification
                </div>

              </div>

            </div>

          )}

          {/* RESULT */}
          {image && !loading && (

            <>

              {/* DEMO DATA WARNING */}
              {isDemoData && (
                <div
                  style={{
                    background: "#fff4e5",
                    border: "2px solid #e0a83c",
                    borderRadius: "12px",
                    padding: "15px 20px",
                    marginBottom: "20px",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: "bold", color: "#8a5a00" }}>
                    ⚠️ Backend unavailable — showing demo data, not a
                    real analysis of your uploaded file.
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#8a5a00" }}>
                    Make sure your FastAPI backend is running
                    (<code>python app.py</code> in the backend
                    folder), then upload again.
                  </p>
                </div>
              )}

              {/* TOP RESULT CARDS */}
              <div className="result-header">

                <div>
                  <span className="result-label">
                    DOCUMENT ANALYSIS
                  </span>

                  <h2>AI Analysis Result</h2>

                  <p>{fileName}</p>
                </div>

                <div className="document-type-badge">
                  🤖 {documentType}
                </div>

              </div>

              <div className="reader-grid">

                {/* IMAGE */}
                <div className="document-card">

                  <div className="card-title">
                    <h3>📄 Uploaded Document</h3>
                  </div>

                  <div className="image-wrapper">

                    <img
                      src={image}
                      alt="Uploaded document"
                    />

                  </div>

                </div>

                {/* OCR */}
                <div className="document-card">

                  <div className="card-title">
                    <h3>🔍 Extracted Text</h3>

                    <span className="ai-tag">
                      AI
                    </span>
                  </div>

                  <textarea
                    className="ocr-area"
                    value={extractedText}
                    onChange={(e) =>
                      setExtractedText(e.target.value)
                    }
                  />

                </div>

              </div>

              {/* DOCUMENT TYPE */}
              <div className="type-card">

                <div>
                  <h3>🤖 Detected Document Type</h3>

                  <p>
                    AI automatically identified this document as:
                  </p>
                </div>

                <select
                  value={documentType}
                  onChange={(e) =>
                    setDocumentType(e.target.value)
                  }
                >
                  <option>Admission Form</option>
                  <option>Student List</option>
                  <option>School Circular</option>
                  <option>Leave Letter</option>
                  <option>Fee Receipt</option>
                  <option>Other Document</option>
                </select>

              </div>

              {/* ADMISSION DETAILS */}
              {documentType === "Admission Form" && (

                <div className="details-card">

                  <div className="details-heading">

                    <div>
                      <span className="result-label">
                        AI EXTRACTION
                      </span>

                      <h2>Student Information</h2>
                    </div>

                    <div className="verified-badge">
                      ✓ AI Extracted
                    </div>

                  </div>

                  <div className="details-grid">

                    <div className="field">
                      <label>Student Name</label>

                      <input
                        value={details.name}
                        onChange={(e) =>
                          updateDetail("name", e.target.value)
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Parent Name</label>

                      <input
                        value={details.parent}
                        onChange={(e) =>
                          updateDetail("parent", e.target.value)
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Class</label>

                      <input
                        value={details.className}
                        onChange={(e) =>
                          updateDetail(
                            "className",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Phone</label>

                      <input
                        value={details.phone}
                        onChange={(e) =>
                          updateDetail("phone", e.target.value)
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Date of Birth</label>

                      <input
                        value={details.dob}
                        onChange={(e) =>
                          updateDetail("dob", e.target.value)
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Gender</label>

                      <input
                        value={details.gender}
                        onChange={(e) =>
                          updateDetail("gender", e.target.value)
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Email</label>

                      <input
                        value={details.email}
                        onChange={(e) =>
                          updateDetail("email", e.target.value)
                        }
                      />
                    </div>

                    <div className="field">
                      <label>Blood Group</label>

                      <input
                        value={details.bloodGroup}
                        onChange={(e) =>
                          updateDetail(
                            "bloodGroup",
                            e.target.value
                          )
                        }
                      />
                    </div>

                    <div className="field full-field">
                      <label>Address</label>

                      <input
                        value={details.address}
                        onChange={(e) =>
                          updateDetail(
                            "address",
                            e.target.value
                          )
                        }
                      />
                    </div>

                  </div>

                </div>

              )}

              {/* NON ADMISSION */}
              {documentType !== "Admission Form" && (

                <div className="summary-card">

                  <div className="summary-icon">
                    🤖
                  </div>

                  <div>
                    <h2>AI Document Summary</h2>

                    <p>
                      This document has been identified as{" "}
                      <strong>{documentType}</strong>.
                    </p>

                    <p>
                      Review the extracted text above before
                      approving the document.
                    </p>
                  </div>

                </div>

              )}

              {/* RECONSTRUCTED STUDENT LIST */}
              {documentType === "Student List" &&
                studentListEntries.length > 0 && (

                <div className="details-card">

                  <div className="details-heading">

                    <div>
                      <span className="result-label">
                        AI EXTRACTION
                      </span>

                      <h2>
                        Students Found ({studentListEntries.length})
                      </h2>
                    </div>

                    <div className="verified-badge">
                      ✓ AI Reconstructed
                    </div>

                  </div>

                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                      }}
                    >
                      <thead>
                        <tr style={{ background: "#f4f2ff" }}>
                          <th style={studentTableHeaderStyle}>
                            Sr. No
                          </th>
                          <th style={studentTableHeaderStyle}>
                            Name
                          </th>
                          <th style={studentTableHeaderStyle}>
                            Father's Name
                          </th>
                          <th style={studentTableHeaderStyle}>
                            Mother's Name
                          </th>
                          <th style={studentTableHeaderStyle}>
                            Gender
                          </th>
                        </tr>
                      </thead>

                      <tbody>
                        {studentListEntries.map((student, index) => (
                          <tr
                            key={index}
                            style={{
                              background:
                                index % 2 === 0 ? "#fafafa" : "white",
                            }}
                          >
                            <td style={studentTableCellStyle}>
                              {student.srNo || "-"}
                            </td>
                            <td style={studentTableCellStyle}>
                              {student.name || "-"}
                            </td>
                            <td style={studentTableCellStyle}>
                              {student.fatherName || "-"}
                            </td>
                            <td style={studentTableCellStyle}>
                              {student.motherName || "-"}
                            </td>
                            <td style={studentTableCellStyle}>
                              {student.gender || "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                </div>

              )}

              {/* ACTIONS */}
              <div className="action-card">

                <div>
                  <h3>Review Document</h3>

                  <p>
                    Verify the AI extracted information before
                    saving it to the school system.
                  </p>
                </div>

                <div className="actions">

                  <button
                    className="reject-btn"
                    onClick={() => {
                      setImage(null);
                      setExtractedText("");
                      setApproved(false);
                      setApprovalMessage("");
                      setStudentListEntries([]);
                      setIsDemoData(false);
                    }}
                  >
                    ✕ Reject
                  </button>

                  <button
                    className="edit-btn"
                  >
                    ✎ Edit
                  </button>

                  <button
                    className="approve-btn"
                    onClick={handleApprove}
                  >
                    ✓ Approve Document
                  </button>

                </div>

              </div>

              {approved && (

                <div className="approved-box">

                  <div className="approved-icon">
                    ✓
                  </div>

                  <div>
                    <h3>Document Approved Successfully</h3>

                    <p>
                      {approvalMessage ||
                        "The administrator has verified this document and it is ready to be added to the school records."}
                    </p>
                  </div>

                </div>

              )}

              {/* UPLOAD ANOTHER */}
              <div className="another-document">

                <button
                  onClick={() => {
                    setImage(null);
                    setFileName("");
                    setExtractedText("");
                    setApproved(false);
                    setApprovalMessage("");
                    setDocumentType("Other Document");
                    setStudentListEntries([]);
                    setIsDemoData(false);
                  }}
                >
                  + Analyze Another Document
                </button>

              </div>

            </>

          )}

        </section>

      </main>

    </div>
  );
}

const studentTableHeaderStyle = {
  padding: "10px 12px",
  textAlign: "left",
  fontSize: "13px",
  color: "#333",
  borderBottom: "2px solid #ddd",
};

const studentTableCellStyle = {
  padding: "10px 12px",
  fontSize: "13px",
  borderBottom: "1px solid #eee",
};

export default DocumentReader;