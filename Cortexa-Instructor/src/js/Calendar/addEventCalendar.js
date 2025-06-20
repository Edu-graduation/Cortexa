import { supaClient } from "../main.js";
const addEventButton = document.querySelector(".add__event-btn");
const eventModal = document.querySelector(".event-modal");

const btnCloseModal = document.querySelector(".btn-close-modal");
const overlay = document.querySelector(".overlay");
if (eventModal) {
  btnCloseModal.addEventListener("click", hideEventModal);
  addEventButton.addEventListener("click", showEventModal);
}
function showEventModal() {
  eventModal.classList.remove("modal-hidden");
  eventModal.classList.add("modal-show");
  overlay.style.display = "block";
}

function hideEventModal() {
  eventModal.classList.remove("modal-show");
  eventModal.classList.add("modal-hidden");
  overlay.style.display = "none";
}
document.addEventListener("click", function (e) {
  if (e.target.closest(".event-modal") !== eventModal && e.target === overlay) {
    hideEventModal();
  }
});
// Get existing form elements
const startInput = document.getElementById("event-start-date");
const endInput = document.getElementById("event-end-date");
const saveEventBtn = document.getElementById("save-event");
const addEventForm = document.getElementById("event-form");
const eventType = document.getElementById("event-type");
const instructorId = sessionStorage.getItem("instructorId");
// 1. Set min start date to today
const today = new Date().toISOString().slice(0, 16);
startInput.min = today;

// 2. Set min end date to selected start date
startInput.addEventListener("change", () => {
  const selectedStart = startInput.value;
  endInput.min = selectedStart;
  if (endInput.value && endInput.value <= selectedStart) {
    endInput.value = "";
  }
});

// 3. Optional: check that end date is after start
endInput.addEventListener("change", () => {
  if (endInput.value <= startInput.value) {
    alert("End date must be after start date!");
    endInput.value = "";
  }
});
getStudentsIdWhoEnrolledInThisCourse().then((data) => {
  console.log(data);
});
// 4. Save event to database with real-time support
addEventForm.addEventListener("submit", async (e) => {
  e.preventDefault(); // Prevent form submission

  // Disable save button during submission
  saveEventBtn.disabled = true;

  const title = document.getElementById("event-title").value;
  const startDate = document.getElementById("event-start-date").value;
  const endDate = document.getElementById("event-end-date").value;
  const description = document.getElementById("event-description").value;
  const eventType = document.getElementById("event-type").value;
  if (!title || !startDate || !endDate || !description || !eventType) {
    alert("Please fill in all fields!");
    saveEventBtn.disabled = false;
    return;
  }

  try {
    const studentsId = await getStudentsIdWhoEnrolledInThisCourse();
    const { data, error } = await supaClient
      .from("calendar_event")
      .insert(studentsId.map((studentId) => ({
        event_name: title,
        event_startdatetime: startDate,
        event_enddatetime: endDate,
        event_type: eventType,
        event_details: description,
        instructor_id: instructorId,
        student_id: studentId,
      })))
      .select("*");

    if (error) {
      console.error("Error inserting event:", error);
      alert("Failed to save event: " + error.message);
    } else {
      hideEventModal(); // Hide modal after successful save
      console.log("Event inserted:", data);
      alert("Event saved successfully!");

      // Reset form fields
      document.getElementById("event-title").value = "";
      document.getElementById("event-description").value = "";
      document.getElementById("event-start-date").value = "";
      document.getElementById("event-end-date").value = "";

      // Option: redirect to calendar page
      // Since we now have real-time updates, redirection is optional
      // window.location.href = "calendar.html";
    }
  } catch (err) {
    console.error("Exception when saving event:", err);
    alert("An unexpected error occurred");
  } finally {
    // Re-enable save button
    saveEventBtn.disabled = false;
  }
});

async function getStudentsIdWhoEnrolledInThisCourse(){
  const { data, error } = await supaClient
    .from("enrollment")
    .select("student_id")
    .eq("instructor_id", instructorId);


  if (error) {
    console.error("Error fetching students:", error);
    return null;
  }

  if (data) {
    const uniqueStudentsId = new Set(data.map((student) => student.student_id));
    return Array.from(uniqueStudentsId);
  }
}