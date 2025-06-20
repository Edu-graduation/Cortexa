/////////////////////////// SIXTH VERSION //////////////////////////////
import { supaClient } from "./app.js";
import { isInstitutionSchool } from "./app.js";
const pageTitle = document.querySelector(".page-title");
const courseId = sessionStorage.getItem("courseId");
const studentId = sessionStorage.getItem("studentId");

// Function to show interactive toast notifications
function showToast(message, type = "success") {
  // Create toast container if it doesn't exist
  let toastContainer = document.querySelector(".toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.className = "toast-container";
    document.body.appendChild(toastContainer);
  }

  // Create and display toast
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
    <span class="toast-close">&times;</span>
  `;

  // Add click event to close toast
  toast.addEventListener("click", () => {
    toast.classList.add("toast-hiding");
    setTimeout(() => toast.remove(), 300);
  });

  toastContainer.appendChild(toast);

  // Auto-remove toast after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.classList.add("toast-hiding");
      setTimeout(() => toast.remove(), 300);
    }
  }, 3000);
}

// Function to show loading spinner
function showLoadingSpinner(button, isLoading = true) {
  if (isLoading) {
    const originalText = button.textContent;
    button.setAttribute("data-original-text", originalText);
    button.innerHTML = `
      <span class="spinner"></span>
      <span>Uploading...</span>
    `;
    button.disabled = true;
  } else {
    const originalText = button.getAttribute("data-original-text") || "Submit";
    button.textContent = originalText;
    button.disabled = false;
  }
}

// Check if date has passed
function isDatePassed(dateString) {
  const dueDate = new Date(dateString);
  const today = new Date();
  return today > dueDate;
}

// Format date for better display
function formatDate(dateString) {
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

async function alreadyUploadedAssignments() {
  const { data, error } = await supaClient
    .from("student_assignment")
    .select("*")
    .eq("student_id", studentId)
    .neq("assign_path", null);

  if (error) {
    console.error("Error fetching uploaded assignments:", error);
    showToast("Failed to check for existing submissions", "error");
    return [];
  }

  console.log("Already uploaded assignments:", data);
  return data || [];
}

async function getCourseName() {
  const { data, error } = await supaClient
    .from("course")
    .select("*")
    .eq("course_id", courseId);

  if (error) {
    console.error("Error fetching course name:", error);
    showToast("Failed to load course information", "error");
    return;
  }

  if (data && data.length > 0) {
    pageTitle.innerHTML = `${data[0].course_name} Assignments <div class="back-button special">
            <button class="back-btn" onclick="window.history.back()">
                <i class="fa-solid fa-angle-left"></i>
            </button>
        </div>`;
    if (isInstitutionSchool()) {
      pageTitle.innerHTML = `${data[0].course_name} Homeworks <div class="back-button special">
            <button class="back-btn" onclick="window.history.back()">
                <i class="fa-solid fa-angle-left"></i>
            </button>
        </div>`;
    }
  }
}

async function getAssignments() {
  await getCourseName();
  const { data, error } = await supaClient
    .from("assignment")
    .select("*")
    .eq("course_id", courseId);

  if (error) {
    console.error("Error fetching assignments:", error);
    showToast("Failed to load assignments", "error");
    return [];
  }

  return data || [];
}

async function renderAssignments() {
  const assignmentsContainer = document.querySelector(".assignments-container");

  // Show loading state
  assignmentsContainer.innerHTML = `
    <div class="loading-assignments">
      <div class="loading-spinner"></div>
      <p>Loading ${isInstitutionSchool() ? "homeworks" : "assignments"}...</p>
    </div>
  `;

  const assignments = await getAssignments();
  const uploadedAssignments = await alreadyUploadedAssignments();

  if (assignments.length === 0) {
    assignmentsContainer.innerHTML = `<h2 class="empty">No assignments yet for this course</h2>`;
    if (isInstitutionSchool()) {
      assignmentsContainer.innerHTML = `<h2 class="empty">No homeworks yet for this course</h2>`;
    }
    return;
  }

  let markup = "";
  assignments.sort(
    (a, b) => new Date(b.assign_duedate) - new Date(a.assign_duedate)
  );
  assignments.forEach((assignment, index) => {
    // Check if this assignment has already been uploaded by the student
    const isUploaded = uploadedAssignments.some(
      (uploaded) =>
        uploaded.assign_id === assignment.assign_id &&
        uploaded.student_id === studentId
    );

    // Get the uploaded file path if it exists
    const uploadedAssignment = uploadedAssignments.find(
      (uploaded) =>
        uploaded.assign_id === assignment.assign_id &&
        uploaded.student_id === studentId
    );

    const uploadedFilePath = uploadedAssignment
      ? uploadedAssignment.assign_path
      : null;

    // Extract just the filename from the path for display
    const uploadedFileName = uploadedFilePath
      ? decodeURIComponent(
          uploadedFilePath.substring(uploadedFilePath.lastIndexOf("/") + 1)
        )
      : "";

    // Check if due date has passed
    const dueDatePassed = isDatePassed(assignment.assign_duedate);
    const dueDateFormatted = formatDate(assignment.assign_duedate);

    // Determine due date class
    let dueDateClass = "ok";
    const today = new Date();
    const dueDate = new Date(assignment.assign_duedate);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (dueDatePassed) {
      dueDateClass = "overdue";
    } else if (daysUntilDue <= 3) {
      dueDateClass = "upcoming";
    }

    markup += `<div class="project-box ${
      dueDatePassed && !isUploaded ? "disabled" : "active"
    }">
        <h3 class="project-title">${assignment.assign_title}</h3>
        <p class="project-description">${assignment.assign_description.slice(
          0,
          35
        )}</p>
        <hr class="project-divider" style="background-color:${
          dueDatePassed ? "#F44336" : "#5955B3"
        };" />
        <div class="due-date ${dueDateClass}">
          <i
           class="fi fi-rr-calendar-clock" style="margin-right: 8px; color:${
             dueDatePassed ? "#F44336" : "#5955B3"
           }; font-size: 20px;"
          ></i>
          <span>Due: ${dueDateFormatted}</span>
          ${
            dueDatePassed && !isUploaded
              ? `<span style="margin-left: auto; font-weight: bold; color: #F44336;">OVERDUE</span>`
              : ""
          }
        </div>
        <button class="instructions-btn" style="border-color:${
          dueDatePassed ? "#f9bec3" : "#5955B3"
        }"data-assignment-id="${assignment.assign_id}">
          <i class="fi fi-rr-document-signed" style="margin-right: 5px;color:${
            dueDatePassed ? "#f9bec3" : "#5955B3"
          }"></i>
         View Instructions
        </button>
        
        ${
          isUploaded
            ? `<div class="upload-status success">
             <i class="fi fi-rr-check-circle" style="font-size: 18px;"></i>
             <span>
               <strong>Submitted</strong><br>
               <strong>File:</strong> ${uploadedFileName.split("-").pop()}
             </span>
             <a href="${uploadedFilePath}" target="_blank" class="view-submission">View</a>
           </div>`
            : ""
        }
        
        <div class="file-selection-area" id="file-area-${index}" style="display: ${
      isUploaded || dueDatePassed ? "none" : "block"
    };">
          <label
            class="custum-file-upload"
            for="file-${index}"
          >
             <i class="fi fi-bs-cloud-download upload-icon"></i>
              <p>Drag and drop ${
                isInstitutionSchool() ? "homework" : "assignment"
              } file here or<br/><p class="upload-btn">  Upload File</p> </p>
            <div class="text">
              <span>Click to upload ${
                isInstitutionSchool() ? "homework" : "assignment"
              }</span>
            </div>
            <input class="file__input" type="file" id="file-${index}" data-file="${index}" data-assignment-id="${
      assignment.assign_id
    }" />
          </label>
          
          <div class="file-preview" id="file-preview-${index}" style="display: none;"></div>
          
          <button class="submit-btn" data-btn-file="${index}" data-assignment-id="${
      assignment.assign_id
    }">
            Submit
          </button>
        </div>
        
        ${
          dueDatePassed && !isUploaded
            ? `<div class="deadline-passed-message">
                <i class="fi fi-rr-ban" style="font-size: 18px; color: #F44336;"></i>
                <span>Submission deadline has passed. Contact your instructor if you need an extension.</span>
              </div>`
            : ""
        }
      </div>`;
  });

  assignmentsContainer.innerHTML = markup;

  // Add event listeners to all submit buttons and file inputs
  const uploadBtns = document.querySelectorAll(".submit-btn");
  const fileInputs = document.querySelectorAll(".file__input");

  uploadBtns.forEach((btn) => {
    btn.addEventListener("click", uploadFile);
  });

  fileInputs.forEach((input) => {
    // Add drag and drop functionality
    const uploadArea = input.parentElement;

    // Handle file selection
    input.addEventListener("change", (e) => {
      const fileIndex = e.target.dataset.file;
      const previewArea = document.getElementById(`file-preview-${fileIndex}`);

      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const fileName = file.name;
        const fileSize = (file.size / 1024).toFixed(2);

        // Show file icon based on type
        let fileIcon = "fi-rr-file";
        const fileExt = fileName.split(".").pop().toLowerCase();

        if (["pdf"].includes(fileExt)) {
          fileIcon = "fi-rr-file-pdf";
        } else if (["doc", "docx"].includes(fileExt)) {
          fileIcon = "fi-rr-file-word";
        } else if (["xls", "xlsx"].includes(fileExt)) {
          fileIcon = "fi-rr-file-excel";
        } else if (["ppt", "pptx"].includes(fileExt)) {
          fileIcon = "fi-rr-file-powerpoint";
        } else if (["jpg", "jpeg", "png", "gif"].includes(fileExt)) {
          fileIcon = "fi-rr-file-image";
        } else if (["zip", "rar", "7z"].includes(fileExt)) {
          fileIcon = "fi-rr-file-archive";
        }

        previewArea.innerHTML = `
          <div class="file-info">
            <i class="fi ${fileIcon}" style="color: #5955b3; font-size: 18px;"></i>
            <span class="file-name">${fileName}</span>
            <span class="file-size">(${fileSize} KB)</span>
            <span class="remove-file" data-file-index="${fileIndex}">✕</span>
          </div>
        `;
        previewArea.style.display = "block";
        uploadArea.style.borderColor = "#4CAF50";
        uploadArea.style.backgroundColor = "rgba(76, 175, 80, 0.05)";

        // Add event listener to remove file button
        const removeBtn = previewArea.querySelector(".remove-file");
        removeBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          input.value = "";
          previewArea.style.display = "none";
          uploadArea.style.borderColor = "#5955b3";
          uploadArea.style.backgroundColor = "rgba(89, 85, 179, 0.05)";
        });
      } else {
        previewArea.style.display = "none";
        uploadArea.style.borderColor = "#5955b3";
        uploadArea.style.backgroundColor = "rgba(89, 85, 179, 0.05)";
      }
    });

    // Drag and drop events
    uploadArea.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "#4a478f";
      uploadArea.style.backgroundColor = "rgba(89, 85, 179, 0.15)";
    });

    uploadArea.addEventListener("dragleave", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "#5955b3";
      uploadArea.style.backgroundColor = "rgba(89, 85, 179, 0.05)";
    });

    uploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadArea.style.borderColor = "#5955b3";
      uploadArea.style.backgroundColor = "rgba(89, 85, 179, 0.05)";

      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event("change"));
      }
    });
  });

  // Add event listeners to view instructions buttons
  const instructionBtns = document.querySelectorAll(".instructions-btn");
  instructionBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const assignmentId = btn.dataset.assignmentId;
      const assignment = assignments.find((a) => a.assign_id === +assignmentId);
      if (assignment) {
        // Create modal for instructions
        const modal = document.createElement("div");
        modal.className = "instructions-modal";
        modal.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h2>${assignment.assign_title} - Instructions</h2>
              <span class="modal-close">&times;</span>
            </div>
            <div class="modal-body">
              <div class="instruction-details">
                <p><strong>Due Date:</strong> ${formatDate(
                  assignment.assign_duedate
                )}</p>
                <div class="instruction-text">
                  ${assignment.assign_description}
                </div>
              </div>
            </div>
          </div>
        `;

        document.body.appendChild(modal);

        // Add modal styles if not already added
        if (!document.querySelector(".modal-styles")) {
          const modalStyles = document.createElement("style");
          modalStyles.className = "modal-styles";
          modalStyles.textContent = `
            .instructions-modal {
              display: flex;
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-color: rgba(0, 0, 0, 0.5);
              z-index: 1000;
              justify-content: center;
              align-items: center;
              opacity: 0;
              animation: fadeIn 0.3s ease forwards;
            }
            .modal-content {
              background-color: white;
              width: 90%;
              max-width: 600px;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
              transform: translateY(20px);
              animation: slideUp 0.3s ease forwards;
            }
            .modal-header {
              padding: 20px;
              background-color: #5955b3;
              color: white;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .modal-header h2 {
              margin: 0;
              font-size: 18px;
              font-weight: 500;
            }
            .modal-close {
              font-size: 24px;
              cursor: pointer;
              transition: all 0.2s ease;
            }
            .modal-close:hover {
              transform: scale(1.2);
            }
            .modal-body {
              padding: 20px;
              max-height: 70vh;
              overflow-y: auto;
            }
            .instruction-details {
              line-height: 1.6;
            }
            .instruction-text {
              margin-top: 15px;
              white-space: pre-line;
            }
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            @keyframes slideUp {
              from { transform: translateY(20px); }
              to { transform: translateY(0); }
            }
            @keyframes slideDown {
              from { transform: translateY(0); }
              to { transform: translateY(20px); opacity: 0; }
            }
          `;
          document.head.appendChild(modalStyles);
        }

        // Close modal on click
        const closeBtn = modal.querySelector(".modal-close");
        closeBtn.addEventListener("click", () => {
          modal.style.opacity = "0";
          modal.querySelector(".modal-content").style.animation =
            "slideDown 0.3s ease forwards";
          setTimeout(() => modal.remove(), 300);
        });

        // Close modal on outside click
        modal.addEventListener("click", (e) => {
          if (e.target === modal) {
            modal.style.opacity = "0";
            modal.querySelector(".modal-content").style.animation =
              "slideDown 0.3s ease forwards";
            setTimeout(() => modal.remove(), 300);
          }
        });
      }
    });
  });
}

async function uploadFile(e) {
  const fileIndex = e.target.dataset.btnFile;
  const assignmentId = e.target.dataset.assignmentId;
  const fileInput = document.getElementById(`file-${fileIndex}`);

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast("Please select a file to upload", "warning");
    return;
  }

  const file = fileInput.files[0];

  // Show loading state
  showLoadingSpinner(e.target, true);

  try {
    // First check if this assignment was already submitted
    const { data: existingSubmissions, error: checkError } = await supaClient
      .from("student_assignment")
      .select("*")
      .eq("student_id", studentId)
      .eq("assign_id", assignmentId)
      .neq("assign_path", null);

    if (checkError) {
      console.error("Error checking existing submissions:", checkError);
      showToast("Error checking submission status", "error");
      showLoadingSpinner(e.target, false);
      return;
    }

    // If already submitted, show message and prevent re-upload
    if (existingSubmissions && existingSubmissions.length > 0) {
      showToast(
        "This " +
          (isInstitutionSchool() ? "homework" : "assignment") +
          " has already been submitted",
        "warning"
      );
      showLoadingSpinner(e.target, false);
      // Refresh the assignments display to show the submission
      renderAssignments();
      return;
    }

    // Check if due date has passed for this assignment
    const assignment = await getAssignmentById(assignmentId);
    if (assignment && isDatePassed(assignment.assign_duedate)) {
      showToast(
        "This " +
          (isInstitutionSchool() ? "homework" : "assignment") +
          " deadline has passed. Cannot submit.",
        "error"
      );
      showLoadingSpinner(e.target, false);
      renderAssignments();
      return;
    }

    // Create a unique filename with timestamp to prevent overwriting
    const timestamp = new Date().getTime();
    const fileName = `${assignmentId}-${timestamp}-${file.name}`.replaceAll(
      "/",
      ""
    );

    // Define storage path
    const filePath = fileName;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supaClient.storage
      .from("students-assignments")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      showToast("Failed to upload file. Please try again.", "error");
      showLoadingSpinner(e.target, false);
      return;
    }

    // Get public URL for the uploaded file
    const { data: publicUrl } = supaClient.storage
      .from("students-assignments")
      .getPublicUrl(filePath);

    // Update database with the file path and submission information
    const { data: submissionData, error: submissionError } = await supaClient
      .from("student_assignment")
      .upsert(
        [
          {
            student_id: studentId,
            assign_id: assignmentId,
            assign_path: publicUrl.publicUrl,
          },
        ],
        { onConflict: ["student_id", "assign_id"] }
      );

    if (submissionError) {
      console.error("Error updating database:", submissionError);
      showToast(
        "File uploaded but failed to update records. Please contact support.",
        "warning"
      );
      showLoadingSpinner(e.target, false);
      return;
    }

    showToast(
      "This " +
        (isInstitutionSchool() ? "homework" : "assignment") +
        " submitted successfully!",
      "success"
    );

    // Update UI to show success and hide upload controls
    setTimeout(() => {
      renderAssignments(); // Refresh to show the uploaded file
    }, 1000);
  } catch (error) {
    console.error("Unexpected error during upload:", error);
    showToast("An unexpected error occurred. Please try again later.", "error");
    showLoadingSpinner(e.target, false);
  }
}

// Helper function to get assignment details by ID
async function getAssignmentById(assignmentId) {
  const { data, error } = await supaClient
    .from("assignment")
    .select("*")
    .eq("assign_id", assignmentId)
    .single();

  if (error) {
    console.error("Error fetching assignment details:", error);
    return null;
  }

  return data;
}

// Add CSS for new message styles
// function addCustomStyles() {
//   const customStyles = document.createElement("style");
//   customStyles.textContent = `
//     .deadline-passed-message {
//       background-color: rgba(244, 67, 54, 0.1);
//       color: #555;
//       padding: 15px;
//       border-radius: 8px;
//       margin-top: 15px;
//       display: flex;
//       align-items: center;
//       gap: 10px;
//     }

//     .project-box.inactive {
//       opacity: 0.8;
//       border-color: #ddd;
//     }

//     .toast-container {
//       position: fixed;
//       top: 20px;
//       right: 20px;
//       z-index: 9999;
//     }

//     .toast {
//       min-width: 250px;
//       margin-bottom: 10px;
//       padding: 12px 16px;
//       border-radius: 8px;
//       display: flex;
//       justify-content: space-between;
//       align-items: center;
//       box-shadow: 0 4px 12px rgba(0,0,0,0.15);
//       animation: slideInRight 0.3s ease forwards;
//     }

//     .toast.success {
//       background-color: #E8F5E9;
//       color: #2E7D32;
//       border-left: 4px solid #2E7D32;
//     }

//     .toast.error {
//       background-color: #FFEBEE;
//       color: #C62828;
//       border-left: 4px solid #C62828;
//     }

//     .toast.warning {
//       background-color: #FFF8E1;
//       color: #F57F17;
//       border-left: 4px solid #F57F17;
//     }

//     .toast.info {
//       background-color: #E3F2FD;
//       color: #1565C0;
//       border-left: 4px solid #1565C0;
//     }

//     .toast-close {
//       cursor: pointer;
//       margin-left: 10px;
//     }

//     .toast-hiding {
//       animation: fadeOut 0.3s ease forwards;
//     }

//     @keyframes slideInRight {
//       from {
//         transform: translateX(100%);
//         opacity: 0;
//       }
//       to {
//         transform: translateX(0);
//         opacity: 1;
//       }
//     }

//     @keyframes fadeOut {
//       from {
//         opacity: 1;
//       }
//       to {
//         opacity: 0;
//       }
//     }
//   `;
//   document.head.appendChild(customStyles);
// }

// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  const assignmentsContainer = document.querySelector(".assignments-container");
  assignmentsContainer.addEventListener("wheel", function (event) {
    if (event.deltaY !== 0) {
      event.preventDefault();
      assignmentsContainer.scrollLeft += event.deltaY;
    }
  });
  // Initialize assignments view
  renderAssignments();

  // Add refresh button functionality
  const refreshButton = document.querySelector(".refresh-button");
  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      renderAssignments();
      showToast("Assignments refreshed", "info");
    });
  }
});
