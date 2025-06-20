/////////////////// THIRD VIRSION ///////////////////
import { supaClient } from "./main.js";
import { isInstitutionSchool } from "./main.js";
      // Global variables for session management
      let currentEditingSessionId = null;
      let currentDeletingSessionId = null;

      // Modal elements
      const sessionModal = document.getElementById('sessionModal');
      const deleteModal = document.getElementById('deleteModal');
      const sessionForm = document.getElementById('sessionForm');
      const modalTitle = document.getElementById('modalTitle');
      const modalLoading = document.getElementById('modalLoading');

const pageTitle = document.querySelector(".page-title");
const courseId = sessionStorage.getItem("courseId");
const instructorId = sessionStorage.getItem("instructorId");
const sessionContainer = document.querySelector(".sessions-container");
const uploadButton = document.querySelector(".upload-btn");
const uploadFrom = document.querySelector(".upload-from");
uploadFrom.addEventListener("submit", uploadSession); // Fixed typo in "submit"
const institutionId = sessionStorage.getItem("institution_id");
const institutionName = sessionStorage.getItem("institution_name");

// Toast notification function
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
    const originalText = button.getAttribute("data-original-text") || "Upload";
    button.textContent = originalText;
    button.disabled = false;
  }
}

async function getCoursesWithEnrollmentCounts(instructorId) {
  // Step 1: Fetch all enrollments for this instructor
  const { data: enrollments, error } = await supaClient
    .from("enrollment")
    .select("course_id") // only need course_id
    .eq("instructor_id", instructorId);

  if (error) {
    console.error("Error fetching enrollments:", error);
    showToast("Error fetching enrollments", "error");
    return;
  }

  // Step 2: Get unique course_ids
  const uniqueCourses = [...new Set(enrollments.map((e) => e.course_id))];

  // Step 3: For each course_id, count number of students
  const results = [];
  for (let courseId of uniqueCourses) {
    const { count, error: countError } = await supaClient
      .from("enrollment")
      .select("student_id", { count: "exact", head: true }) // count students
      .eq("course_id", courseId)
      .eq("instructor_id", instructorId);

    if (countError) {
      console.error(
        `Error counting students for course ${courseId}:`,
        countError
      );
    } else {
      results.push({ course_id: courseId, student_count: count });
    }
  }
  return results;
}

// Modified to accept a specific courseId
async function getSessions(courseId) {
  if (!courseId) {
    const instructorCourses = await getCoursesWithEnrollmentCounts(
      instructorId
    );
    console.log("instructorCourses", instructorCourses);

    if (instructorCourses && instructorCourses.length > 0) {
      // Use the first course if no specific course is selected
      courseId = instructorCourses[0].course_id;
    } else {
      console.error("No courses found for this instructor");
      showToast("No courses found", "error");
      return [];
    }
  }

  console.log("Fetching sessions for course ID:", courseId);

  const { data, error } = await supaClient
    .from("session")
    .select("*")
    .eq("course_id", courseId);

  if (error) {
    console.error("Error fetching sessions:", error);
    showToast("Error fetching sessions", "error");
    return [];
  }

  console.log("Sessions:", data);
  return data || [];
}

// Modified to accept a specific courseId
async function getLectures(courseId) {
  const sessions = await getSessions(courseId);
  const lectures = sessions.filter(
    (session) => session.session_type === "lecture"
  );
  lectures.sort((a, b) => new Date(a.session_time) - new Date(b.session_time));
  console.log("lectures", lectures);
  return lectures;
}

// Modified to accept a specific courseId
async function getSections(courseId) {
  const sessions = await getSessions(courseId);
  const sections = sessions.filter(
    (session) => session.session_type === "section"
  );
  sections.sort((a, b) => new Date(a.session_time) - new Date(b.session_time));
  console.log("sections", sections);
  return sections;
}
async function getLessons(courseId) {
  const sessions = await getSessions(courseId);
  const lessons = sessions.filter(
    (session) => session.session_type === "session"
  );
  lessons.sort((a, b) => new Date(a.session_time) - new Date(b.session_time));
  console.log("lessons", lessons);
  return lessons;
}
// Update the renderSessions function to include session IDs in data attributes
async function renderSessions(courseId) {
  const sessionType = document.querySelector("#session-type");
  // Show loading state
  sessionContainer.innerHTML = `
      <div class="loading-sessions" style="text-align: center; padding: 20px;">
          <div class="spinner" style="margin: 0 auto;"></div>
          <p class="loading-spinner"></p>
      </div>
  `;

  let sectionCount = 0;
  let lectureCount = 0;
  let lessonCount = 0;
  const lectures = await getLectures(courseId);
  const sections = await getSections(courseId);
  const lessons = await getLessons(courseId);
  
  let lectureMarkup = "";
  let sectionMarkup = "";
  let lessonsMarkup= '';
  if (lectures.length === 0 && sections.length === 0 || lessons.length === 0) {
      sessionContainer.innerHTML = `
          <div class="no-sessions" style="text-align: center; padding: 20px;">
              <p>No sessions found for this course.</p>
          </div>
      `;
      // return;
  }
  
  lectures.forEach((lecture) => {
      lectureCount++;
      lectureMarkup += `
          <div class="session lecture" data-session-id="${lecture.session_id}">
              <p class="session__number"><span>${lectureCount}</span></p>
              <p class="session__date"><span>${new Date(
                  lecture.session_time
              ).toLocaleDateString()}</span></p>
              ${lecture.session_file_path ? 
                  `<a class="session__file" target="_blank" href="${lecture.session_file_path}"> 
                      ${isInstitutionSchool() ? "lesson" : "lecture"} ${lectureCount}
                  </a>` :
                  `<span class="session__file no-file"> 
                      ${isInstitutionSchool() ? "lesson" : "lecture"} ${lectureCount} (No file)
                  </span>`
              }
          </div>
      `;
  });
  if (!isInstitutionSchool()) {
      sections.forEach((section) => {
          sectionCount++;
          sectionMarkup += `
              <div class="session section" data-session-id="${section.session_id}">
                  <p class="session__number"><span>${sectionCount}</span></p>
                  <p class="session__date"><span>${new Date(
                      section.session_time
                  ).toLocaleDateString()}</span></p>
                  ${section.session_file_path ? 
                      `<a class="session__file" target="_blank" href="${section.session_file_path}"> 
                          section ${sectionCount}
                      </a>` :
                      `<span class="session__file no-file"> 
                          section ${sectionCount} (No file)
                      </span>`
                  }
              </div>
          `;
      });
  }
  if(isInstitutionSchool()){
    lessons.forEach((lesson) => {
      
        lessonCount++;
        lessonsMarkup += `
            <div class="session lesson" data-session-id="${lesson.session_id}">
                <p class="session__number"><span>${lessonCount}</span></p>
                <p class="session__date"><span>${new Date(
                    lesson.session_time
                ).toLocaleDateString()}</span></p>
                ${lesson.session_file_path ? 
                    `<a class="session__file" target="_blank" href="${lesson.session_file_path}"> 
                        lesson ${lessonCount}
                    </a>` :
                    `<span class="session__file no-file"> 
                        lesson ${lessonCount} (No file)
                    </span>`
                }
            </div>
        `;
    });
  }
  
  sessionContainer.innerHTML  = lectureMarkup + sectionMarkup + lessonsMarkup;

  // Add action buttons after rendering
  addSessionActionButtons();

  // Update session numbers in the form based on the current course
  updateSessionNumbers(courseId, sessionType.value);
}
// New function to update session numbers in the dropdown based on course and session type
async function updateSessionNumbers(courseId, sessionTypeValue) {
  const sessionNumber = document.querySelector("#session-number");
  const sessionType = document.querySelector("#session-type");

  sessionNumber.innerHTML = "";

  let count = 0;
  if (sessionTypeValue === "session") {
    const lessons = await getLessons(courseId);
    count = lessons.length;
  }
  else if (sessionTypeValue === "lecture") {
    const lectures = await getLectures(courseId);
    count = lectures.length;
  } else {
    const sections = await getSections(courseId);
    count = sections.length;
  }


  
  console.log(count);
  
  // If no sessions found, add a placeholder option
  if (count === 0) {
    sessionNumber.innerHTML = `<option value="">No ${isInstitutionSchool() ? "lessons" : sessionTypeValue} available</option>`;
  } else {
    // Add options for each session
    for (let i = 0; i < count; i++) {
      sessionNumber.innerHTML += `<option value="${i + 1}">${i + 1}</option>`;
    }
  }
}

async function renderFormData() {
  const sessionNumber = document.querySelector("#session-number");
  const courseName = document.querySelector("#course-name");
  const sessionType = document.querySelector("#session-type");
  
  courseName.innerHTML = "";
  if(isInstitutionSchool()){
    sessionType.innerHTML = "";
    sessionType.innerHTML += `<option value="session">Lesson</option>`;
  }
  if(!isInstitutionSchool()){
    sessionType.value = "lecture";
  }

  // Get instructor courses
  const instructorCourses = await getCoursesWithEnrollmentCounts(instructorId);
  if (!instructorCourses || instructorCourses.length === 0) {
    showToast("No courses found for this instructor", "warning");
    return;
  }

  const instructorCoursesID = instructorCourses.map((c) => c.course_id);

  // Get course details
  const { data, error } = await supaClient
    .from("course")
    .select("*")
    .in("course_id", instructorCoursesID);

  if (error) {
    console.error("Error loading courses:", error);
    showToast("Error loading courses", "error");
    return;
  }

  if (data && data.length > 0) {
    // Add course options to dropdown
    data.forEach((course) => {
      courseName.innerHTML += `<option value="${course.course_id}">${course.course_name}</option>`;
    });

    // Get the first course ID as default
    const defaultCourseId = data[0].course_id;

    // Set initial session numbers based on default course
    if(!isInstitutionSchool()){
      updateSessionNumbers(defaultCourseId, "lecture");
    }else{
      updateSessionNumbers(defaultCourseId, "session");
    }

    // Display sessions for the default course
    renderSessions(defaultCourseId);

    // Add event listener for course selection change
    courseName.addEventListener("change", (e) => {
      const selectedCourseId = e.target.value;
      renderSessions(selectedCourseId);
      
      updateSessionNumbers(selectedCourseId);
    });

    // Add event listener for session type change
    sessionType.addEventListener("change", (e) => {
      const selectedSessionType = e.target.value;
      const selectedCourseId = courseName.value;
      updateSessionNumbers(selectedCourseId, selectedSessionType);
    });
  } else {
    showToast("No courses found", "warning");
  }
}

// Enhanced file input handling
const fileInput = document.querySelector("#file");
const fileUploadArea = document.querySelector(".custum-file-upload");
let filePreviewArea;

// Create file preview area if it doesn't exist
if (!document.querySelector(".file-preview")) {
  filePreviewArea = document.createElement("div");
  filePreviewArea.className = "file-preview";
  filePreviewArea.style.display = "none";
  fileUploadArea.parentNode.insertBefore(
    filePreviewArea,
    fileUploadArea.nextSibling
  );
} else {
  filePreviewArea = document.querySelector(".file-preview");
}

// Handle file selection
fileInput.addEventListener("change", (e) => {
  if (e.target.files && e.target.files.length > 0) {
    const file = e.target.files[0];
    const fileName = file.name;
    const fileSize = (file.size / 1024).toFixed(2);

    // Show file icon based on type
    let fileIcon = "fi-rr-file";
    if (typeof fileName === "string") {
      const fileExt = fileName.split(".").pop().toLowerCase();

      if (fileExt === "pdf") {
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
    }

    filePreviewArea.innerHTML = `
      <div class="file-info">
        <i class="fi ${fileIcon}" style="color: var(--color-primary); font-size: 18px;"></i>
        <span class="file-name">${fileName}</span>
        <span class="file-size">(${fileSize} KB)</span>
        <span class="remove-file">✕</span>
      </div>
    `;

    filePreviewArea.style.display = "block";
    fileUploadArea.style.borderColor = "#4CAF50";
    fileUploadArea.style.backgroundColor = "rgba(76, 175, 80, 0.05)";

    // Add event listener to remove file button
    const removeBtn = filePreviewArea.querySelector(".remove-file");
    removeBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      fileInput.value = "";
      filePreviewArea.style.display = "none";
      fileUploadArea.style.borderColor = "var(--color-primary)";
      fileUploadArea.style.backgroundColor = "rgba(255, 255, 255, 1)";
    });
  } else {
    filePreviewArea.style.display = "none";
    fileUploadArea.style.borderColor = "var(--color-primary)";
    fileUploadArea.style.backgroundColor = "rgba(255, 255, 255, 1)";
  }
});

// Drag and drop events
fileUploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = "var(--color-primary-dark)";
  fileUploadArea.style.backgroundColor = "rgba(89, 85, 179, 0.15)";
});

fileUploadArea.addEventListener("dragleave", (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = "var(--color-primary)";
  fileUploadArea.style.backgroundColor = "rgba(255, 255, 255, 1)";
});

fileUploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  fileUploadArea.style.borderColor = "var(--color-primary)";
  fileUploadArea.style.backgroundColor = "rgba(255, 255, 255, 1)";

  if (e.dataTransfer.files.length) {
    fileInput.files = e.dataTransfer.files;
    fileInput.dispatchEvent(new Event("change"));
  }
});

/**
 * Handles the upload of a session file.
 * @param {Event} e The submit event that triggered this function.
 * @returns {Promise<void>}
 */
async function uploadSession(e) {
  e.preventDefault();
  const sessionType = document.querySelector("#session-type").value;
  const sessionNumber = +document.querySelector("#session-number").value;
  const selectedCourseId = document.querySelector("#course-name").value;
  const fileInput = document.querySelector("#file");

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast("Please select a file to upload", "warning");
    return;
  }

  if (!sessionNumber) {
    showToast("No session available for upload", "warning");
    return;
  }

  // Show loading state
  showLoadingSpinner(uploadButton, true);

  try {
  
    const sessionsToUpload =
      sessionType === "lecture"
        ? await getLectures(selectedCourseId)
        : await getSections(selectedCourseId) ? await getLessons(selectedCourseId) : null;

    const sessionToUplaod = sessionsToUpload.find(
      (_, index) => index + 1 === sessionNumber
    );

    if (!sessionToUplaod) {
      showToast("Session not found", "error");
      showLoadingSpinner(uploadButton, false);
      return;
    }
    const sessionId = sessionToUplaod.session_id;
    const file = fileInput.files[0];
    if (fileInput.files.length === 1) {
      const fileName = `${Math.random()}-${fileInput.files[0].name}`.replaceAll(
        "/",
        ""
      );
      const filePath = `https://nwwqsqkwmkkuunczucdm.supabase.co/storage/v1/object/public/sessions/${fileName}`;

      const { data, error } = await supaClient
        .from("session")
        .update({
          session_file_path: filePath,
        })
        .eq("session_id", sessionId);

      if (error) {
        console.error("Error updating session:", error);
        showToast("Failed to update session", "error");
        showLoadingSpinner(uploadButton, false);
        return;
      }

      // 2 upload the session
      const { error: uploadError } = await supaClient.storage
        .from("sessions")
        .upload(fileName, file);

      if (uploadError) {
        console.error(uploadError);
        showToast("Failed to upload file", "error");
        showLoadingSpinner(uploadButton, false);
        return;
      }

      // Success case
      showToast(
        `${sessionType} ${sessionNumber} uploaded successfully!`,
        "success"
      );

      // Reset the file input and preview
      fileInput.value = "";
      filePreviewArea.style.display = "none";
      fileUploadArea.style.borderColor = "var(--color-primary)";
      fileUploadArea.style.backgroundColor = "rgba(255, 255, 255, 1)";

      // Refresh sessions display with the current course
      renderSessions(selectedCourseId);
    }
  } catch (error) {
    console.error("Unexpected error during upload:", error);
    showToast("An unexpected error occurred. Please try again.", "error");
  } finally {
    showLoadingSpinner(uploadButton, false);
  }
}

uploadButton.addEventListener("click", uploadSession);

// Initialize the form data
renderFormData();

// Add font awesome icon link if not already present
if (!document.querySelector('link[href*="fontawesome"]')) {
  const fontAwesomeLink = document.createElement("link");
  fontAwesomeLink.rel = "stylesheet";
  fontAwesomeLink.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css";
  document.head.appendChild(fontAwesomeLink);
}
// Script to hide session type selector for school institutions
document.addEventListener("DOMContentLoaded", function () {
  // Get institution from session storage
  const institutionId = sessionStorage.getItem("institution_id");
  const institutionName = sessionStorage.getItem("institution_name");

  // Check if institution is a school (we can check by name or ID)
  // For this example, we'll check if institutionName contains "school" case-insensitive
  // or if a specific institution_id matches
  if (
    (institutionName && institutionName.toLowerCase().includes("school")) ||
    institutionId === "school_id" // Replace with actual school institution ID if known
  ) {
    // Get the session type container - this should be the parent element of the select
    const sessionTypeContainer =
      document.querySelector("#session-type").closest(".form-group") ||
      document.querySelector("#session-type").parentElement;

    // Hide the session type selector
    if (sessionTypeContainer) {
      sessionTypeContainer.style.display = "none";
    }

    // Make sure the session type is set to "lecture" by default
    const sessionTypeSelect = document.querySelector("#session-type");
    if (sessionTypeSelect) {
      sessionTypeSelect.value = "lecture";

      // Force update the session numbers based on lecture type
      const courseName = document.querySelector("#course-name");
      if (courseName && courseName.value) {
        // If updateSessionNumbers function exists, call it with the current course ID
        if (typeof updateSessionNumbers === "function") {
          updateSessionNumbers(courseName.value);
        }
      }

      // Trigger change event on session type to ensure any listeners update accordingly
      sessionTypeSelect.dispatchEvent(new Event("change"));
    }

    // Adjust the layout if necessary (if there are flex/grid containers)
    const uploadForm = document.querySelector(".upload-from");
    if (uploadForm) {
      // You might need to adjust the grid/flex layout here if removing one item affects layout
    }

    console.log(
      "Institution is a school. Session type selector has been hidden."
    );
  } else {
    console.log(
      "Institution is not a school. Session type selector is visible."
    );
  }
});

// Also modify the form rendering logic to check for the institution
// This ensures the check happens when form data is loaded
const originalRenderFormData = renderFormData;
renderFormData = async function () {
  await originalRenderFormData();

  // Check institution after the form has been rendered
  const institutionName = sessionStorage.getItem("institution_name");
  const institutionId = sessionStorage.getItem("institution_id");

  if (
    (institutionName && institutionName.toLowerCase().includes("school")) ||
    institutionId === "school_id" // Replace with actual school institution ID if known
  ) {
    const sessionTypeContainer =
      document.querySelector("#session-type").closest(".form-group") ||
      document.querySelector("#session-type").parentElement;

    if (sessionTypeContainer) {
      sessionTypeContainer.style.display = "none";
    }

    // Set session type to lecture and update the UI accordingly
    const sessionTypeSelect = document.querySelector("#session-type");

    if (sessionTypeSelect) {
      sessionTypeSelect.value = "lecture";
      if(isInstitutionSchool()){
        sessionTypeSelect.value = "session";
      }
      // Get the current selected course
      const courseName = document.querySelector("#course-name");
      if (courseName && courseName.value) {
        updateSessionNumbers(courseName.value, "lecture");
      }
    }
  }
};
function initializeSessionManagement() {
  // Create session button
  document.getElementById('createSessionBtn').addEventListener('click', openCreateModal);
  
  // Modal close buttons
  document.getElementById('closeModalBtn').addEventListener('click', closeSessionModal);
  document.getElementById('closeDeleteModalBtn').addEventListener('click', closeDeleteModal);
  document.getElementById('cancelBtn').addEventListener('click', closeSessionModal);
  document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
  
  // Form submission
  sessionForm.addEventListener('submit', handleSessionSubmit);
  
  // Delete confirmation
  document.getElementById('confirmDeleteBtn').addEventListener('click', handleDeleteSession);
  
  // Close modals when clicking outside
  sessionModal.addEventListener('click', (e) => {
      if (e.target === sessionModal) closeSessionModal();
  });
  
  deleteModal.addEventListener('click', (e) => {
      if (e.target === deleteModal) closeDeleteModal();
  });

  // Initialize modal file upload
  initializeModalFileUpload();

  // Load courses for modal
  loadCoursesForModal();
}
// Enhanced openEditModal function
function openEditModal(sessionId) {
  currentEditingSessionId = sessionId;
  modalTitle.textContent = 'Edit Session';
  
  // Reset file upload
  removeModalFile();
  
  showModalLoading(true);
  sessionModal.classList.add('active');
  document.body.style.overflow = 'hidden';
  
  // Load session data
  loadSessionForEdit(sessionId);
}
// Close session modal
function closeSessionModal() {
    sessionModal.classList.remove('active');
    document.body.style.overflow = '';
    currentEditingSessionId = null;
    showModalLoading(false);
}

// Close delete modal
function closeDeleteModal() {
    deleteModal.classList.remove('active');
    document.body.style.overflow = '';
    currentDeletingSessionId = null;
}

// Show/hide modal loading
function showModalLoading(show) {
    modalLoading.style.display = show ? 'flex' : 'none';
}

// Load courses for modal dropdown
async function loadCoursesForModal() {
    try {
        const instructorCourses = await getCoursesWithEnrollmentCounts(instructorId);
        if (!instructorCourses || instructorCourses.length === 0) return;

        const instructorCoursesID = instructorCourses.map(c => c.course_id);
        const { data, error } = await supaClient
            .from('course')
            .select('*')
            .in('course_id', instructorCoursesID);

        if (error) throw error;

        const modalCourse = document.getElementById('modalCourse');
        modalCourse.innerHTML = '<option value="">Select Course</option>';
        
        data.forEach(course => {
            modalCourse.innerHTML += `<option value="${course.course_id}">${course.course_name}</option>`;
        });
    } catch (error) {
        console.error('Error loading courses:', error);
        showToast('Error loading courses', 'error');
    }
}
// Show existing file in edit mode
function showExistingFile(filePath) {
  const modalFilePreview = document.getElementById('modalFilePreview');
  const modalFileUploadArea = document.getElementById('modalFileUploadArea');
  
  if (!modalFilePreview || !modalFileUploadArea) return;
  
  const fileName = filePath.split('/').pop();
  
  modalFilePreview.innerHTML = `
      <div class="modal-file-info existing-file">
          <i class="fi fi-rr-file" style="color: var(--color-primary); font-size: 18px;"></i>
          <span class="modal-file-name">Current: ${fileName}</span>
          <a href="${filePath}" target="_blank" class="view-file-btn">View</a>
      </div>
      <div class="file-upload-note">
          <small>Upload a new file to replace the current one</small>
      </div>
  `;
  
  modalFilePreview.style.display = 'block';
  modalFileUploadArea.classList.add('has-existing-file');
}

// Enhanced loadSessionForEdit function
async function loadSessionForEdit(sessionId) {
  try {
      const { data, error } = await supaClient
          .from('session')
          .select('*')
          .eq('session_id', sessionId)
          .single();

      if (error) throw error;

      // Populate form fields
      document.getElementById('modalCourse').value = data.course_id;
      document.getElementById('modalSessionType').value = data.session_type;
      
      // Format datetime for input
      const sessionTime = new Date(data.session_time);
      sessionTime.setMinutes(sessionTime.getMinutes() - sessionTime.getTimezoneOffset());
      document.getElementById('modalSessionTime').value = sessionTime.toISOString().slice(0, 16);
      // Show existing file if available
      if (data.session_file_path) {
          showExistingFile(data.session_file_path);
      }

      showModalLoading(false);
  } catch (error) {
      console.error('Error loading session:', error);
      showToast('Error loading session data', 'error');
      closeSessionModal();
  }
}

// Enhanced modal file upload handling
function initializeModalFileUpload() {
  const modalFileInput = document.getElementById('modalFileInput');
  const modalFileUploadArea = document.getElementById('modalFileUploadArea');
  const modalFilePreview = document.getElementById('modalFilePreview');
  const sessionType = document.getElementById('modalSessionType');

  if (!modalFileInput || !modalFileUploadArea) {
      console.warn('Modal file upload elements not found');
      return;
  }
  if(isInstitutionSchool()){
    sessionType.innerHTML = "";
    sessionType.innerHTML += `<option value="session">Lesson</option>`;
  }
  // Handle file selection
  modalFileInput.addEventListener('change', (e) => {
      handleModalFileSelection(e.target.files);
  });

  // Drag and drop events
  modalFileUploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      modalFileUploadArea.classList.add('drag-over');
  });

  modalFileUploadArea.addEventListener('dragleave', (e) => {
      e.preventDefault();
      modalFileUploadArea.classList.remove('drag-over');
  });

  modalFileUploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      modalFileUploadArea.classList.remove('drag-over');
      
      if (e.dataTransfer.files.length) {
          modalFileInput.files = e.dataTransfer.files;
          handleModalFileSelection(e.dataTransfer.files);
      }
  });

  // Click to select file
  modalFileUploadArea.addEventListener('click', () => {
      modalFileInput.click();
  });
}
// Handle file selection in modal
function handleModalFileSelection(files) {
  const modalFilePreview = document.getElementById('modalFilePreview');
  const modalFileUploadArea = document.getElementById('modalFileUploadArea');
  
  if (!files || files.length === 0) {
      modalFilePreview.style.display = 'none';
      modalFileUploadArea.classList.remove('has-file');
      return;
  }

  const file = files[0];
  const fileName = file.name;
  const fileSize = (file.size / 1024).toFixed(2);

  // Show file icon based on type
  let fileIcon = "fi-rr-file";
  if (typeof fileName === "string") {
      const fileExt = fileName.split(".").pop().toLowerCase();

      if (fileExt === "pdf") {
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
  }

  modalFilePreview.innerHTML = `
      <div class="modal-file-info">
          <i class="fi ${fileIcon}" style="color: var(--color-primary); font-size: 18px;"></i>
          <span class="modal-file-name">${fileName}</span>
          <span class="modal-file-size">(${fileSize} KB)</span>
          <span class="modal-remove-file" onclick="removeModalFile()">✕</span>
      </div>
  `;

  modalFilePreview.style.display = 'block';
  modalFileUploadArea.classList.add('has-file');
  // showExistingFile()
}
// Remove file from modal
function removeModalFile() {
  const modalFileInput = document.getElementById('modalFileInput');
  const modalFilePreview = document.getElementById('modalFilePreview');
  const modalFileUploadArea = document.getElementById('modalFileUploadArea');
  
  modalFileInput.value = '';
  modalFilePreview.style.display = 'none';
  modalFileUploadArea.classList.remove('has-file');
}
// New function to handle file upload for sessions
async function uploadSessionFile(sessionId, file) {
  try {
      // Generate unique filename
      const fileName = `${Math.random()}-${file.name}`.replaceAll("/", "");
      const filePath = `https://nwwqsqkwmkkuunczucdm.supabase.co/storage/v1/object/public/sessions/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supaClient.storage
          .from("sessions")
          .upload(fileName, file);

      if (uploadError) {
          throw uploadError;
      }

      // Update session with file path
      const { error: updateError } = await supaClient
          .from("session")
          .update({
              session_file_path: filePath,
          })
          .eq("session_id", sessionId);

      if (updateError) {
          throw updateError;
      }

      showToast("File uploaded successfully!", "success");
  } catch (error) {
      console.error("Error uploading file:", error);
      showToast("Error uploading file", "error");
      throw error; // Re-throw to be caught by the calling function
  }
}
async function handleSessionSubmit(e) {
  e.preventDefault();
  
  const formData = new FormData(sessionForm);
  const fileInput = document.getElementById('modalFileInput');
  
  const sessionData = {
      course_id: formData.get('course_id'),
      session_type: formData.get('session_type'),
      session_time: formData.get('session_time'),
      session_place: formData.get('session_place'),
  };

  showModalLoading(true);

  try {
      let result;
      let sessionId;
      
      if (currentEditingSessionId) {
          // Update existing session
          result = await supaClient
              .from('session')
              .update(sessionData)
              .eq('session_id', currentEditingSessionId);
          sessionId = currentEditingSessionId;
      } else {
          // Create new session
          result = await supaClient
              .from('session')
              .insert([sessionData])
              .select();
          
          if (result.data && result.data.length > 0) {
              sessionId = result.data[0].session_id;
          }
      }

      if (result.error) throw result.error;

      // Handle file upload if a file is selected
      if (fileInput.files && fileInput.files.length > 0) {
          await uploadSessionFile(sessionId, fileInput.files[0]);
      }

      showToast(
          `Session ${currentEditingSessionId ? 'updated' : 'created'} successfully!`,
          'success'
      );

      closeSessionModal();
      
      // Refresh sessions display
      const selectedCourseId = document.querySelector('#course-name').value;
      if (selectedCourseId) {
          renderSessions(selectedCourseId);
      }
  } catch (error) {
      console.error('Error saving session:', error);
      showToast(`Error ${currentEditingSessionId ? 'updating' : 'creating'} session`, 'error');
  } finally {
      showModalLoading(false);
  }
}
// Open delete confirmation modal
function openDeleteModal(sessionId) {
    currentDeletingSessionId = sessionId;
    deleteModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Handle session deletion
async function handleDeleteSession() {
    if (!currentDeletingSessionId) return;

    try {
        const { error } = await supaClient
            .from('session')
            .delete()
            .eq('session_id', currentDeletingSessionId);

        if (error) throw error;

        showToast('Session deleted successfully!', 'success');
        closeDeleteModal();

        // Refresh sessions display
        const selectedCourseId = document.querySelector('#course-name').value;
        if (selectedCourseId) {
            renderSessions(selectedCourseId);
        }
    } catch (error) {
        console.error('Error deleting session:', error);
        showToast('Error deleting session', 'error');
    }
}

// Modified renderSessions function to include action buttons
// Add this modification to your existing renderSessions function
function addSessionActionButtons() {
    // This should be called after rendering sessions
    const sessionElements = document.querySelectorAll('.session');
    
    sessionElements.forEach((sessionElement, index) => {
        // Add session-item class for styling
        sessionElement.classList.add('session-item');
        
        // Create actions container
        const actionsContainer = document.createElement('div');
        actionsContainer.className = 'session-actions';
        
        // Edit button
        const editBtn = document.createElement('button');
        editBtn.className = 'action-btn edit-btn';
        editBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
        `;
        editBtn.title = 'Edit Session';
        
        // Delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
            </svg>
        `;
        deleteBtn.title = 'Delete Session';
        
        // Add event listeners
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            // You'll need to store session ID in a data attribute
            const sessionId = sessionElement.dataset.sessionId;
            openEditModal(sessionId);
        });
        
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const sessionId = sessionElement.dataset.sessionId;
            openDeleteModal(sessionId);
        });
        
        actionsContainer.appendChild(editBtn);
        actionsContainer.appendChild(deleteBtn);
        sessionElement.appendChild(actionsContainer);
    });
}
// Enhanced openCreateModal function
function openCreateModal() {
  currentEditingSessionId = null;
  modalTitle.textContent = 'Create New Session';
  sessionForm.reset();
  
  // Reset file upload
  removeModalFile();
  
  // Set default datetime to current time
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  document.getElementById('modalSessionTime').value = now.toISOString().slice(0, 16);
  
  sessionModal.classList.add('active');
  document.body.style.overflow = 'hidden';
}
// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeSessionManagement();
});

// Export functions for use in other parts of the application
window.sessionManagement = {
    openCreateModal,
    openEditModal,
    openDeleteModal,
    addSessionActionButtons
};