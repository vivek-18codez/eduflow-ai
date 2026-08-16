import { useEffect } from "react";

function UploadBox({ onChange }) {

  useEffect(() => {

    const handlePaste = (e) => {

      const items = e.clipboardData.items;

      for (let item of items) {

        if (item.type.startsWith("image")) {

          const file = item.getAsFile();

          const event = {
            target: {
              files: [file]
            }
          };

          onChange(event);
        }
      }

    };

    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("paste", handlePaste);
    };

  }, [onChange]);

  const handleDrop = (e) => {

    e.preventDefault();

    const file = e.dataTransfer.files[0];

    if (file) {

      const event = {
        target: {
          files: [file]
        }
      };

      onChange(event);

    }

  };

  return (

    <label
      className="upload-box"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >

      <div className="upload-icon">
        📄
      </div>

      <h2>Upload Admission Form</h2>

      <p>
        Browse • Drag & Drop • Paste (Ctrl + V)
      </p>

      <input
        type="file"
        accept="image/*"
        onChange={onChange}
        hidden
      />

      <button
        type="button"
        className="browse-btn"
      >
        Browse Files
      </button>

    </label>

  );

}

export default UploadBox;