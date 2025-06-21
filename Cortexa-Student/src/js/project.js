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
    const originalText = button.textContent.trim();
    button.setAttribute("data-original-text", originalText);
    button.innerHTML = `
      <span class="spinner"></span>
      <span>Uploading...</span>
    `;
    button.disabled = true;
  } else {
    const originalText = button.getAttribute("data-original-text") || "Submit";
    button.innerHTML = originalText;
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
    pageTitle.innerHTML = `${data[0].course_name} Projects <div class="back-button special">
            <button class="back-btn" onclick="window.history.back()">
                <i class="fa-solid fa-angle-left"></i>
            </button>
        </div>`;
    if (isInstitutionSchool()) {
      pageTitle.innerHTML = `${data[0].course_name} Activities <div class="back-button special">
            <button class="back-btn" onclick="window.history.back()">
                <i class="fa-solid fa-angle-left"></i>
            </button>
        </div>`;
    }
  }
}

// Get student's team ID
async function getStudentTeamId() {
  try {
    // First, get the student's team ID
    const { data, error } = await supaClient
      .from("student_activity")
      .select("team_id")
      .eq("student_id", studentId)
      .limit(1);

    if (error) {
      console.error("Error fetching team ID:", error);
      return 1; // Default team ID if error
    }

    if (data && data.length > 0 && data[0].team_id) {
      return data[0].team_id;
    } else {
      return 1; // Default team ID if not found
    }
  } catch (error) {
    console.error("Unexpected error getting team ID:", error);
    return 1; // Default team ID on error
  }
}

async function alreadyUploadedActivities() {
  const { data, error } = await supaClient
    .from("student_activity")
    .select("*")
    .eq("student_id", studentId)
    .neq("activity_path", null);

  if (error) {
    console.error("Error fetching uploaded activities:", error);
    showToast("Failed to check for existing submissions", "error");
    return [];
  }

  console.log("Already uploaded activities by student:", data);
  return data || [];
}

async function getCourseActivities() {
  await getCourseName();

  // First get the course_activity records
  const { data: courseActivityData, error: courseActivityError } =
    await supaClient
      .from("course_activity")
      .select("*")
      .eq("course_id", courseId);

  if (courseActivityError) {
    console.error("Error fetching course activities:", courseActivityError);
    showToast("Failed to load course activities", "error");
    return [];
  }

  if (!courseActivityData || courseActivityData.length === 0) {
    return [];
  }

  // Get all activity IDs for this course
  const activityIds = courseActivityData.map((ca) => ca.activity_id);
  // Fetch the actual activity details
  const { data: activities, error: activitiesError } = await supaClient
    .from("activity")
    .select("*")
    .in("activity_id", activityIds);

  if (activitiesError) {
    console.error("Error fetching activities:", activitiesError);
    showToast("Failed to load activities", "error");
    return [];
  }

  return activities || [];
}

// async function renderActivities() {
//   const activitiesContainer = document.querySelector(".projects-container");

//   // Show loading state
//   activitiesContainer.innerHTML = `
//     <div class="loading-activities">
//       <div class="loading-spinner"></div>
//       <p>Loading ${isInstitutionSchool() ? "activities" : "projects"}...</p>
//     </div>
//   `;

//   const activities = await getCourseActivities();
//   const uploadedActivities = await alreadyUploadedActivities();

//   if (activities.length === 0) {
//     activitiesContainer.innerHTML = `<h2 class="empty">No ${
//       isInstitutionSchool() ? "activities" : "projects"
//     } yet for this course</h2>`;
//     return;
//   }

//   let markup = "";
//   activities.sort(
//     (a, b) => new Date(b.activity_duedate) - new Date(a.activity_duedate)
//   );

//   // Process each activity
//   for (const [index, activity] of activities.entries()) {
//     // Check if this activity has already been uploaded by the student or team
//     const teamSubmissionStatus = await checkTeamSubmission(
//       activity.activity_id
//     );

//     // Get the uploaded file path if it exists
//     const uploadedActivity = uploadedActivities.find(
//       (uploaded) => uploaded.activity_id === activity.activity_id
//     );

//     const uploadedFilePath = uploadedActivity
//       ? uploadedActivity.activity_path
//       : null;

//     // Extract just the filename from the path for display
//     const uploadedFileName = uploadedFilePath
//       ? decodeURIComponent(
//           uploadedFilePath.substring(uploadedFilePath.lastIndexOf("/") + 1)
//         )
//       : "";

//     // Check if due date has passed
//     const dueDatePassed = isDatePassed(activity.activity_duedate);
//     const dueDateFormatted = formatDate(activity.activity_duedate);

//     // Determine due date class
//     let dueDateClass = "ok";
//     const today = new Date();
//     const dueDate = new Date(activity.activity_duedate);
//     const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

//     if (dueDatePassed) {
//       dueDateClass = "overdue";
//     } else if (daysUntilDue <= 3) {
//       dueDateClass = "upcoming";
//     }

//     // Determine if the activity has been submitted by the team but not the current student
//     const isTeamSubmission =
//       teamSubmissionStatus.submitted && teamSubmissionStatus.byTeammate;
//     const isAlreadySubmitted = teamSubmissionStatus.submitted;
// console.log(isAlreadySubmitted);

//     markup += `<div class="project-box ${
//       dueDatePassed ? "disabled" : "active"
//     }">
//         <h3 class="project-title">${activity.activity_title}</h3>
//         <p class="project-description">${activity.activity_description.slice(
//           0,
//           35
//         )}</p>
//         <hr class="project-divider" style="background-color:${
//           dueDatePassed ? "#F44336" : "#5955B3"
//         };" />
//         <div class="due-date ${dueDateClass}">
//          <i
//            class="fi fi-rr-calendar-clock" style="margin-right: 8px; color:${
//              dueDatePassed ? "#F44336" : "#5955B3"
//            }; font-size: 20px;"
//           ></i>
//           <span>Due: ${dueDateFormatted}</span>
//           ${
//             dueDatePassed && !isAlreadySubmitted
//               ? `<span style="margin-left: auto; font-weight: bold; color: #F44336;">OVERDUE</span>`
//               : ""
//           }
//         </div>
// <button class="instructions-btn" style="border-color:${
//       dueDatePassed ? "#f9bec3" : "#5955B3"
//     }"data-activity-id="${activity.activity_id}">
//           <i class="fi fi-rr-document-signed" style="margin-right: 5px;color:${
//             dueDatePassed ? "#f9bec3" : "#5955B3"
//           }"></i>
//          View Instructions
//         </button>
        
//         ${
//           isTeamSubmission
//             ? `<div class="upload-status success" style="margin-top: 15px; background-color: rgba(76, 175, 80, 0.1); color: #4CAF50;">
//                 <i class="fi fi-rr-check-circle" style="font-size: 18px;"></i>
//                 <span>
//                   This ${
//                     isInstitutionSchool() ? "Activity" : "project"
//                   } has already been submitted by one of your teammates!
//                 </span>
//               </div>`
//             : ""
//         }
        
//         ${
//           uploadedFilePath
//             ? `<div class="upload-status success">
//              <i class="fi fi-rr-check-circle" style="font-size: 18px;"></i>
//              <span>
//                <strong>File:</strong> ${uploadedFileName.split("-").pop()}
//              </span>
//              <a href="${uploadedFilePath}" target="_blank" class="view-submission">View</a>
//            </div>`
//             : ""
//         }
        
//         ${
//           !isAlreadySubmitted && dueDatePassed
//             ? `<div class="upload-status error" style="margin-top: 15px; background-color: rgba(244, 67, 54, 0.1); color: #F44336;">
//               <i class="fi fi-rr-exclamation-circle" style="font-size: 18px;"></i>
//               <span>Submission closed. Due date has passed.</span>
//             </div>`
//             : ""
//         }
        
//         <div class="file-selection-area" id="file-area-${index}" style="display: ${
//       isAlreadySubmitted || dueDatePassed ? "none" : "block"
//     };">
//            <label
//             class="custum-file-upload"
//             for="file-${index}"
//           >
//              <i class="fi fi-bs-cloud-download upload-icon"></i>
//               <p>Drag and drop ${
//                 isInstitutionSchool() ? "activity" : "project"
//               } file here or<br/><p class="upload-btn">  Upload File</p> </p>
//             <div class="text">
//               <span>Click to upload ${
//                 isInstitutionSchool() ? "activity" : "project"
//               }</span>
//             </div>
//             <input class="file__input" type="file" id="file-${index}" data-file="${index}" data-activity-id="${
//       activity.activity_id
//     }" />
//           </label>    
//           <div class="file-preview" id="file-preview-${index}" style="display: none;"></div>
          
//           <button class="submit-btn" data-btn-file="${index}" data-activity-id="${
//       activity.activity_id
//     }">
//             Submit
//           </button>
//         </div>
//       </div>`;
//   }

//   activitiesContainer.innerHTML = markup;

//   // Add event listeners to all submit buttons and file inputs
//   const uploadBtns = document.querySelectorAll(".submit-btn");
//   const fileInputs = document.querySelectorAll(".file__input");

//   uploadBtns.forEach((btn) => {
//     btn.addEventListener("click", uploadFile);
//   });

//   fileInputs.forEach((input) => {
//     // Add drag and drop functionality
//     const uploadArea = input.parentElement;

//     // Handle file selection
//     input.addEventListener("change", (e) => {
//       const fileIndex = e.target.dataset.file;
//       const previewArea = document.getElementById(`file-preview-${fileIndex}`);

//       if (e.target.files && e.target.files.length > 0) {
//         const file = e.target.files[0];
//         const fileName = file.name;
//         const fileSize = (file.size / 1024).toFixed(2);

//         // Show file icon based on type
//         let fileIcon = "fi-rr-file";
//         const fileExt = fileName.split(".").pop().toLowerCase();

//         if (["pdf"].includes(fileExt)) {
//           fileIcon = "fi-rr-file-pdf";
//         } else if (["doc", "docx"].includes(fileExt)) {
//           fileIcon = "fi-rr-file-word";
//         } else if (["xls", "xlsx"].includes(fileExt)) {
//           fileIcon = "fi-rr-file-excel";
//         } else if (["ppt", "pptx"].includes(fileExt)) {
//           fileIcon = "fi-rr-file-powerpoint";
//         } else if (["jpg", "jpeg", "png", "gif"].includes(fileExt)) {
//           fileIcon = "fi-rr-file-image";
//         } else if (["zip", "rar", "7z"].includes(fileExt)) {
//           fileIcon = "fi-rr-file-archive";
//         }

//         previewArea.innerHTML = `
//           <div class="file-info">
//             <i class="fi ${fileIcon}" style="color: #5955b3; font-size: 18px;"></i>
//             <span class="file-name">${fileName}</span>
//             <span class="file-size">(${fileSize} KB)</span>
//             <span class="remove-file" data-file-index="${fileIndex}">✕</span>
//           </div>
//         `;
//         previewArea.style.display = "block";
//         uploadArea.style.borderColor = "#4CAF50";
//         uploadArea.style.backgroundColor = "rgba(76, 175, 80, 0.05)";

//         // Add event listener to remove file button
//         const removeBtn = previewArea.querySelector(".remove-file");
//         removeBtn.addEventListener("click", (event) => {
//           event.stopPropagation();
//           input.value = "";
//           previewArea.style.display = "none";
//           uploadArea.style.borderColor = "#5955b3";
//           uploadArea.style.backgroundColor = "rgba(89, 85, 179, 0.05)";
//         });
//       } else {
//         previewArea.style.display = "none";
//         uploadArea.style.borderColor = "#5955b3";
//         uploadArea.style.backgroundColor = "rgba(89, 85, 179, 0.05)";
//       }
//     });

//     // Drag and drop events
//     uploadArea.addEventListener("dragover", (e) => {
//       e.preventDefault();
//       uploadArea.style.borderColor = "#4a478f";
//       uploadArea.style.backgroundColor = "rgba(89, 85, 179, 0.15)";
//     });

//     uploadArea.addEventListener("dragleave", (e) => {
//       e.preventDefault();
//       uploadArea.style.borderColor = "#5955b3";
//       uploadArea.style.backgroundColor = "rgba(89, 85, 179, 0.05)";
//     });

//     uploadArea.addEventListener("drop", (e) => {
//       e.preventDefault();
//       uploadArea.style.borderColor = "#5955b3";
//       uploadArea.style.backgroundColor = "rgba(89, 85, 179, 0.05)";

//       if (e.dataTransfer.files.length) {
//         input.files = e.dataTransfer.files;
//         input.dispatchEvent(new Event("change"));
//       }
//     });
//   });

//   // Add event listeners to view instructions buttons
//   const instructionBtns = document.querySelectorAll(".instructions-btn");
//   instructionBtns.forEach((btn) => {
//     btn.addEventListener("click", () => {
//       const activityId = btn.dataset.activityId;
//       const activity = activities.find((a) => a.activity_id === +activityId);

//       if (activity) {
//         // Create modal for instructions
//         const modal = document.createElement("div");
//         modal.className = "instructions-modal";
//         modal.innerHTML = `
//           <div class="modal-content">
//             <div class="modal-header">
//               <h2>${activity.activity_title} - Instructions</h2>
//               <span class="modal-close">&times;</span>
//             </div>
//             <div class="modal-body">
//               <div class="instruction-details">
//                 <p><strong>Due Date:</strong> ${formatDate(
//                   activity.activity_duedate
//                 )}</p>
//                 <div class="instruction-text">
//                   ${activity.activity_description}
//                 </div>
//                 ${
//                   isDatePassed(activity.activity_duedate)
//                     ? `<div class="overdue-notice" style="margin-top: 20px; padding: 10px; background-color: rgba(244, 67, 54, 0.1); color: #F44336; border-radius: 8px;">
//                         <strong>Note:</strong> The due date for this ${
//                           isInstitutionSchool() ? "activity" : "project"
//                         } has passed. Submissions are no longer accepted.
//                       </div>`
//                     : ""
//                 }
//               </div>
//             </div>
//           </div>
//         `;

//         document.body.appendChild(modal);

//         // Add modal styles if not already added
//         if (!document.querySelector(".modal-styles")) {
//           const modalStyles = document.createElement("style");
//           modalStyles.className = "modal-styles";
//           modalStyles.textContent = `
//             .instructions-modal {
//               display: flex;
//               position: fixed;
//               top: 0;
//               left: 0;
//               width: 100%;
//               height: 100%;
//               background-color: rgba(0, 0, 0, 0.5);
//               z-index: 1000;
//               justify-content: center;
//               align-items: center;
//               opacity: 0;
//               animation: fadeIn 0.3s ease forwards;
//             }
//             .modal-content {
//               background-color: white;
//               width: 90%;
//               max-width: 600px;
//               border-radius: 12px;
//               overflow: hidden;
//               box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
//               transform: translateY(20px);
//               animation: slideUp 0.3s ease forwards;
//             }
//             .modal-header {
//               padding: 20px;
//               background-color: #5955b3;
//               color: white;
//               display: flex;
//               justify-content: space-between;
//               align-items: center;
//             }
//             .modal-header h2 {
//               margin: 0;
//               font-size: 18px;
//               font-weight: 500;
//             }
//             .modal-close {
//               font-size: 24px;
//               cursor: pointer;
//               transition: all 0.2s ease;
//             }
//             .modal-close:hover {
//               transform: scale(1.2);
//             }
//             .modal-body {
//               padding: 20px;
//               max-height: 70vh;
//               overflow-y: auto;
//             }
//             .instruction-details {
//               line-height: 1.6;
//             }
//             .instruction-text {
//               margin-top: 15px;
//               white-space: pre-line;
//             }
//             @keyframes fadeIn {
//               from { opacity: 0; }
//               to { opacity: 1; }
//             }
//             @keyframes slideUp {
//               from { transform: translateY(20px); }
//               to { transform: translateY(0); }
//             }
//             @keyframes slideDown {
//               from { transform: translateY(0); }
//               to { transform: translateY(20px); opacity: 0; }
//             }
//           `;
//           document.head.appendChild(modalStyles);
//         }

//         // Close modal on click
//         const closeBtn = modal.querySelector(".modal-close");
//         closeBtn.addEventListener("click", () => {
//           modal.style.opacity = "0";
//           modal.querySelector(".modal-content").style.animation =
//             "slideDown 0.3s ease forwards";
//           setTimeout(() => modal.remove(), 300);
//         });

//         // Close modal on outside click
//         modal.addEventListener("click", (e) => {
//           if (e.target === modal) {
//             modal.style.opacity = "0";
//             modal.querySelector(".modal-content").style.animation =
//               "slideDown 0.3s ease forwards";
//             setTimeout(() => modal.remove(), 300);
//           }
//         });
//       }
//     });
//   });
// }
///////////////////////////////// V2
async function renderActivities() {
  const activitiesContainer = document.querySelector(".projects-container");

  // Show loading state
  activitiesContainer.innerHTML = `
    <div class="loading-activities">
      <div class="loading-spinner"></div>
      <p>Loading ${isInstitutionSchool() ? "activities" : "projects"}...</p>
    </div>
  `;

  const activities = await getCourseActivities();
  const uploadedActivities = await alreadyUploadedActivities();

  if (activities.length === 0) {
    activitiesContainer.innerHTML = `<h2 class="empty">No ${
      isInstitutionSchool() ? "activities" : "projects"
    } yet for this course</h2>`;
    return;
  }

  let markup = "";
  activities.sort(
    (a, b) => new Date(b.activity_duedate) - new Date(a.activity_duedate)
  );

  // Process each activity
  for (const [index, activity] of activities.entries()) {
    // Check if this activity has already been uploaded by the student or team
    const teamSubmissionStatus = await checkTeamSubmission(
      activity.activity_id
    );

    // Get the uploaded file path if it exists
    const uploadedActivity = uploadedActivities.find(
      (uploaded) => uploaded.activity_id === activity.activity_id
    );

    const uploadedFilePath = uploadedActivity
      ? uploadedActivity.activity_path
      : null;

    // Extract just the filename from the path for display
    const uploadedFileName = uploadedFilePath
      ? decodeURIComponent(
          uploadedFilePath.substring(uploadedFilePath.lastIndexOf("/") + 1)
        )
      : "";

    // Check if due date has passed
    const dueDatePassed = isDatePassed(activity.activity_duedate);
    const dueDateFormatted = formatDate(activity.activity_duedate);

    // Determine due date class
    let dueDateClass = "ok";
    const today = new Date();
    const dueDate = new Date(activity.activity_duedate);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

    if (dueDatePassed) {
      dueDateClass = "overdue";
    } else if (daysUntilDue <= 3) {
      dueDateClass = "upcoming";
    }

    // Fix: Properly determine submission status
    // Check if the current student has submitted (either individually or as part of team)
    const currentStudentSubmitted = uploadedActivity !== undefined;
    
    // Determine if the activity has been submitted by the team but not the current student
    const isTeamSubmission = teamSubmissionStatus.submitted && teamSubmissionStatus.byTeammate;
    
    // The activity is considered submitted if either:
    // 1. Current student has submitted it, OR
    // 2. Team has submitted it (including by teammates)
    const isAlreadySubmitted = currentStudentSubmitted || teamSubmissionStatus.submitted;

    console.log('Activity:', activity.activity_id, 'Current student submitted:', currentStudentSubmitted, 'Team submitted:', teamSubmissionStatus.submitted, 'Is already submitted:', isAlreadySubmitted);

    markup += `<div class="project-box ${
      dueDatePassed ? "disabled" : "active"
    }">
        <h3 class="project-title">${activity.activity_title}</h3>
        <p class="project-description">${activity.activity_description.slice(
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
            dueDatePassed && !isAlreadySubmitted
              ? `<span style="margin-left: auto; font-weight: bold; color: #F44336;">OVERDUE</span>`
              : ""
          }
        </div>
<button class="instructions-btn" style="border-color:${
      dueDatePassed ? "#f9bec3" : "#5955B3"
    }"data-activity-id="${activity.activity_id}">
          <i class="fi fi-rr-document-signed" style="margin-right: 5px;color:${
            dueDatePassed ? "#f9bec3" : "#5955B3"
          }"></i>
         View Instructions
        </button>
        
        ${
          isAlreadySubmitted
            ? `<div class="upload-status success" style="margin-top: 15px; background-color: rgba(76, 175, 80, 0.1); color: #4CAF50;">
                <i class="fi fi-rr-check-circle" style="font-size: 18px;"></i>
                <span>
                  This ${
                    isInstitutionSchool() ? "Activity" : "project"
                  } has already been submitted by one of your teammates!
                </span>
              </div>`
            : ""
        }
        
        ${
          uploadedFilePath
            ? `<div class="upload-status success">
             <i class="fi fi-rr-check-circle" style="font-size: 18px;"></i>
             <span>
               <strong>File:</strong> ${uploadedFileName.split("-").pop()}
             </span>
             <a href="${uploadedFilePath}" target="_blank" class="view-submission">View</a>
           </div>`
            : ""
        }
        
        ${
          !isAlreadySubmitted && dueDatePassed
            ? `<div class="upload-status error" style="margin-top: 15px; background-color: rgba(244, 67, 54, 0.1); color: #F44336;">
              <i class="fi fi-rr-exclamation-circle" style="font-size: 18px;"></i>
              <span>Submission closed. Due date has passed.</span>
            </div>`
            : ""
        }
        
        <div class="file-selection-area" id="file-area-${index}" style="display: ${
      isAlreadySubmitted || dueDatePassed ? "none" : "block"
    };">
           <label
            class="custum-file-upload"
            for="file-${index}"
          >
             <i class="fi fi-bs-cloud-download upload-icon"></i>
              <p>Drag and drop ${
                isInstitutionSchool() ? "activity" : "project"
              } file here or<br/><p class="upload-btn">  Upload File</p> </p>
            <div class="text">
              <span>Click to upload ${
                isInstitutionSchool() ? "activity" : "project"
              }</span>
            </div>
            <input class="file__input" type="file" id="file-${index}" data-file="${index}" data-activity-id="${
      activity.activity_id
    }" />
          </label>    
          <div class="file-preview" id="file-preview-${index}" style="display: none;"></div>
          
          <button class="submit-btn" data-btn-file="${index}" data-activity-id="${
      activity.activity_id
    }">
            Submit
          </button>
        </div>
      </div>`;
  }

  activitiesContainer.innerHTML = markup;

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
      const activityId = btn.dataset.activityId;
      const activity = activities.find((a) => a.activity_id === +activityId);

      if (activity) {
        // Create modal for instructions
        const modal = document.createElement("div");
        modal.className = "instructions-modal";
        modal.innerHTML = `
          <div class="modal-content">
            <div class="modal-header">
              <h2>${activity.activity_title} - Instructions</h2>
              <span class="modal-close">&times;</span>
            </div>
            <div class="modal-body">
              <div class="instruction-details">
                <p><strong>Due Date:</strong> ${formatDate(
                  activity.activity_duedate
                )}</p>
                <div class="instruction-text">
                  ${activity.activity_description}
                </div>
                ${
                  isDatePassed(activity.activity_duedate)
                    ? `<div class="overdue-notice" style="margin-top: 20px; padding: 10px; background-color: rgba(244, 67, 54, 0.1); color: #F44336; border-radius: 8px;">
                        <strong>Note:</strong> The due date for this ${
                          isInstitutionSchool() ? "activity" : "project"
                        } has passed. Submissions are no longer accepted.
                      </div>`
                    : ""
                }
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

// Updated uploadFile function with proper team filtering
async function uploadFile(e) {
  const fileIndex = e.target.dataset.btnFile;
  const activityId = e.target.dataset.activityId;
  const fileInput = document.getElementById(`file-${fileIndex}`);

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast("Please select a file to upload", "warning");
    return;
  }

  const file = fileInput.files[0];

  // Get activity details to check due date
  const { data: activityData, error: activityError } = await supaClient
    .from("activity")
    .select("*")
    .eq("activity_id", activityId)
    .single();

  if (activityError) {
    console.error("Error fetching activity details:", activityError);
    showToast("Error checking due date", "error");
    return;
  }

  // Check if due date has passed
  if (isDatePassed(activityData.activity_duedate)) {
    showToast(
      "Due date has passed. Submissions are no longer accepted.",
      "error"
    );
    return;
  }

  // Show loading state
  showLoadingSpinner(e.target, true);

  try {
    // Get the student's team ID, level, and institution
    const teamId = await getStudentTeamId();
    const studentLevel = await getStudentLevel();
    const studentInstitution = await getStudentInstitution();

    // Check if any team member has already submitted this activity
    const teamSubmission = await checkTeamSubmission(activityId);

    if (teamSubmission.submitted) {
      if (teamSubmission.byTeammate) {
        showToast(
          "This " + (isInstitutionSchool() ? "activity" : "project") +
            " has already been submitted by one of your teammates!",
          "warning"
        );
      } else {
        showToast(
          "You have already submitted this " + (isInstitutionSchool() ? "activity" : "project"),
          "warning"
        );
      }
      showLoadingSpinner(e.target, false);
      renderActivities(); // Refresh the activities display
      return;
    }

    // Create a unique filename with timestamp to prevent overwriting
    const timestamp = new Date().getTime();
    const fileName =
      `team-${teamId}-${activityId}-${timestamp}-${file.name}`.replaceAll(
        "/",
        ""
      );

    // Define storage path
    const filePath = fileName;

    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supaClient.storage
      .from("students-activities")
      .upload(filePath, file);

    if (uploadError) {
      console.error("Error uploading file:", uploadError);
      showToast("Failed to upload file. Please try again.", "error");
      showLoadingSpinner(e.target, false);
      return;
    }

    // Get public URL for the uploaded file
    const { data: publicUrl } = supaClient.storage
      .from("students-activities")
      .getPublicUrl(filePath);

    // Get all students in the same team, level, and institution
    const { data: allTeamData, error: teamError } = await supaClient
      .from("student")
      .select("student_id")
      .eq("student_level", studentLevel)
      .eq("institution_id", studentInstitution);
      
    if (teamError) {
      console.error("Error fetching team members:", teamError);
      // Continue with just the current student if we can't get teammates
      var teamMembers = [{ student_id: studentId }];
    } else {
      // Filter students who are in the same team_id
      var teamMembers = [];

      if (allTeamData && allTeamData.length > 0) {
        // Get student_activity records for all students in same level/institution to find team members
        const studentIds = allTeamData.map(s => s.student_id);
        
        const { data: studentActivityData, error: saError } = await supaClient
          .from("student_activity")
          .select("student_id")
          .eq("team_id", teamId)
          .in("student_id", studentIds);

        if (saError) {
          console.error("Error fetching student activity data:", saError);
          teamMembers = [{ student_id: studentId }];
        } else {
          // Remove duplicates
          const seenIds = new Set();
          if (studentActivityData && studentActivityData.length > 0) {
            studentActivityData.forEach((record) => {
              if (!seenIds.has(record.student_id)) {
                seenIds.add(record.student_id);
                teamMembers.push({ student_id: record.student_id });
              }
            });
          }
        }
      }

      // If we didn't find any team members, add at least the current student
      if (teamMembers.length === 0) {
        teamMembers.push({ student_id: studentId });
      }
    }

    // Create an array of records to upsert - one for each team member
    const teamRecords = teamMembers.map((member) => ({
      student_id: member.student_id,
      activity_id: activityId,
      activity_path: publicUrl.publicUrl,
      team_id: teamId,
    }));

    // Update database with the file path for ALL team members
    const { data: submissionData, error: submissionError } = await supaClient
      .from("student_activity")
      .upsert(teamRecords, { onConflict: ["student_id", "activity_id"] });

    if (submissionError) {
      console.error("Error updating database for team:", submissionError);
      showToast(
        "File uploaded but failed to update team records. Please contact support.",
        "warning"
      );
      showLoadingSpinner(e.target, false);
      return;
    }

    const teamSize = teamMembers.length;
    showToast(
      `${
        isInstitutionSchool() ? "Activity" : "Project"
      } submitted successfully for all ${teamSize} team members!`,
      "success"
    );

    // Update UI to show success and hide upload controls
    setTimeout(() => {
      renderActivities(); // Refresh to show the uploaded file
    }, 1000);
  } catch (error) {
    console.error("Unexpected error during upload:", error);
    showToast("An unexpected error occurred. Please try again later.", "error");
    showLoadingSpinner(e.target, false);
  }
}
// Initialize page
document.addEventListener("DOMContentLoaded", () => {
  // Check if user is logged in
  // Initialize activities view
  renderActivities();
  const projectsContainer = document.querySelector(".projects-container");
  projectsContainer.addEventListener('wheel', function (event) {
    if (event.deltaY !== 0) {
      event.preventDefault();
      projectsContainer.scrollLeft += event.deltaY;
    }
  });

  // Add refresh button functionality
  const refreshButton = document.querySelector(".refresh-button");
  if (refreshButton) {
    refreshButton.addEventListener("click", () => {
      renderActivities();
      showToast("Projects refreshed", "info");
    });
  }
});
async function getStudentLevel() {
  const {data:student,stError} = await supaClient
  .from('student').select('*').eq('student_id',studentId);
  const studentLevel = student[0].student_level;
  return studentLevel;
}
async function getStudentInstitution() {
  const {data:student,stError} = await supaClient
  .from('student').select('*').eq('student_id',studentId);
  const studentInstitution = student[0].institution_id;
  return studentInstitution;
}

// Check if any team member has submitted the activity
async function checkTeamSubmission(activityId) {
  try {
    // Get the student's team ID, level, and institution
    const teamId = await getStudentTeamId();
    const studentLevel = await getStudentLevel();
    const studentInstitution = await getStudentInstitution();

    // Get all students in the same team, level, and institution
    const { data: teamMembersData, error: teamMembersError } = await supaClient
      .from("student")
      .select("student_id")
      .eq("student_level", studentLevel)
      .eq("institution_id", studentInstitution);

    if (teamMembersError) {
      console.error("Error fetching team members:", teamMembersError);
      return { submitted: false, byTeammate: false };
    }

    const teamMemberIds = teamMembersData.map(student => student.student_id);

    // Check if anyone in the same team (same level, institution, and team_id) has already submitted this activity
    const { data, error } = await supaClient
      .from("student_activity")
      .select("*")
      .eq("activity_id", activityId)
      .eq("team_id", teamId)
      .in("student_id", teamMemberIds)
      .neq("activity_path", null);

    if (error) {
      console.error("Error checking team submissions:", error);
      return { submitted: false, byTeammate: false };
    }

    if (data && data.length > 0) {
      // Check if the submission is by the current student or a teammate
      const isSubmittedByCurrentStudent = data.some(
        (submission) => submission.student_id === studentId
      );

      return {
        submitted: true,
        byTeammate: !isSubmittedByCurrentStudent,
        submitter: isSubmittedByCurrentStudent ? "you" : "a teammate",
        submissionData: data[0],
      };
    }

    return { submitted: false, byTeammate: false };
  } catch (error) {
    console.error("Unexpected error checking team submissions:", error);
    return { submitted: false, byTeammate: false };
  }
}



// async function uploadFile(e) {
//   const fileIndex = e.target.dataset.btnFile;
//   const activityId = e.target.dataset.activityId;
//   const fileInput = document.getElementById(`file-${fileIndex}`);

//   if (!fileInput.files || fileInput.files.length === 0) {
//     showToast("Please select a file to upload", "warning");
//     return;
//   }

//   const file = fileInput.files[0];

//   // Get activity details to check due date
//   const { data: activityData, error: activityError } = await supaClient
//     .from("activity")
//     .select("*")
//     .eq("activity_id", activityId)
//     .single();

//   if (activityError) {
//     console.error("Error fetching activity details:", activityError);
//     showToast("Error checking due date", "error");
//     return;
//   }

//   // Check if due date has passed
//   if (isDatePassed(activityData.activity_duedate)) {
//     showToast(
//       "Due date has passed. Submissions are no longer accepted.",
//       "error"
//     );
//     return;
//   }

//   // Show loading state
//   showLoadingSpinner(e.target, true);

//   try {
//     // Get the student's team ID
//     const teamId = await getStudentTeamId();

//     // Check if any team member has already submitted this activity
//     const teamSubmission = await checkTeamSubmission(activityId);

//     if (teamSubmission.submitted) {
//       if (teamSubmission.byTeammate) {
//         showToast(
//           "This " + isInstitutionSchool()
//             ? "activity"
//             : "project" +
//                 "has already been submitted by one of your teammates!",
//           "warning"
//         );
//       } else {
//         showToast(
//           "You have already submitted this " + isInstitutionSchool()
//             ? "activity"
//             : "project",
//           "warning"
//         );
//       }
//       showLoadingSpinner(e.target, false);
//       renderActivities(); // Refresh the activities display
//       return;
//     }

//     // Create a unique filename with timestamp to prevent overwriting
//     const timestamp = new Date().getTime();
//     const fileName =
//       `team-${teamId}-${activityId}-${timestamp}-${file.name}`.replaceAll(
//         "/",
//         ""
//       );

//     // Define storage path
//     const filePath = fileName;

//     // Upload file to storage
//     const { data: uploadData, error: uploadError } = await supaClient.storage
//       .from("students-activities")
//       .upload(filePath, file);

//     if (uploadError) {
//       console.error("Error uploading file:", uploadError);
//       showToast("Failed to upload file. Please try again.", "error");
//       showLoadingSpinner(e.target, false);
//       return;
//     }

//     // Get public URL for the uploaded file
//     const { data: publicUrl } = supaClient.storage
//       .from("students-activities")
//       .getPublicUrl(filePath);

//     // First, get all students in the same team
//     const { data: allTeamData, error: teamError } = await supaClient
//       .from("student_activity")
//       .select("student_id")
//       .eq("team_id", teamId);
      
//     if (teamError) {
//       console.error("Error fetching team members:", teamError);
//       // Continue with just the current student if we can't get teammates
//       var teamMembers = [{ student_id: studentId }];
//     } else {
//       // Filter out duplicates manually since distinct isn't available
//       const seenIds = new Set();
//       var teamMembers = [];

//       if (allTeamData && allTeamData.length > 0) {
//         allTeamData.forEach((record) => {
//           if (!seenIds.has(record.student_id)) {
//             seenIds.add(record.student_id);
//             teamMembers.push({ student_id: record.student_id });
//           }
//         });
//       }

//       // If we didn't find any team members, add at least the current student
//       if (teamMembers.length === 0) {
//         teamMembers.push({ student_id: studentId });
//       }
//     }

//     // Create an array of records to upsert - one for each team member
//     const teamRecords = teamMembers.map((member) => ({
//       student_id: member.student_id,
//       activity_id: activityId,
//       activity_path: publicUrl.publicUrl,
//       team_id: teamId,
//     }));

//     // Update database with the file path for ALL team members
//     const { data: submissionData, error: submissionError } = await supaClient
//       .from("student_activity")
//       .upsert(teamRecords, { onConflict: ["student_id", "activity_id"] });

//     if (submissionError) {
//       console.error("Error updating database for team:", submissionError);
//       showToast(
//         "File uploaded but failed to update team records. Please contact support.",
//         "warning"
//       );
//       showLoadingSpinner(e.target, false);
//       return;
//     }

//     const teamSize = teamMembers.length;
//     showToast(
//       `${
//         isInstitutionSchool() ? "Activity" : "Project"
//       } submitted successfully for all ${teamSize} team members!`,
//       "success"
//     );

//     // Update UI to show success and hide upload controls
//     setTimeout(() => {
//       renderActivities(); // Refresh to show the uploaded file
//     }, 1000);
//   } catch (error) {
//     console.error("Unexpected error during upload:", error);
//     showToast("An unexpected error occurred. Please try again later.", "error");
//     showLoadingSpinner(e.target, false);
//   }
// }


// Check if any team member has submitted the activity
// async function checkTeamSubmission(activityId) {
//   try {
//     // Get the student's team ID
//     const teamId = await getStudentTeamId();

//     // Check if anyone in the same team has already submitted this activity
//     const { data, error } = await supaClient
//       .from("student_activity")
//       .select("*")
//       .eq("activity_id", activityId)
//       .eq("team_id", teamId)
//       .neq("activity_path", null);

//     if (error) {
//       console.error("Error checking team submissions:", error);
//       return { submitted: false, byTeammate: false };
//     }

//     if (data && data.length > 0) {
//       // Check if the submission is by the current student or a teammate
//       const isSubmittedByCurrentStudent = data.some(
//         (submission) => submission.student_id === studentId
//       );

//       return {
//         submitted: true,
//         byTeammate: !isSubmittedByCurrentStudent,
//         submitter: isSubmittedByCurrentStudent ? "you" : "a teammate",
//         submissionData: data[0],
//       };
//     }

//     return { submitted: false, byTeammate: false };
//   } catch (error) {
//     console.error("Unexpected error checking team submissions:", error);
//     return { submitted: false, byTeammate: false };
//   }
// }