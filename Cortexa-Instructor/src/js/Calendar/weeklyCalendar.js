import { supaClient } from "../main.js";
import { subtractDates } from "../utilities/dateCalc.js";
import { getInstructorName } from "../main.js"; // Adjust the import path as needed

const userName = document.querySelector(".user__name");

// Existing calendar code
function updateWeekCalendar() {
  // Get current date
  const today = new Date();

  // Find what day of the week today is (0 = Sunday, 1 = Monday, etc.)
  const currentDayOfWeek = today.getDay();

  // Calculate the start date (Saturday)
  // In JavaScript, 0 is Sunday, so 6 is Saturday
  // We need to find the most recent Saturday
  const startDate = new Date(today);
  const daysToSubtract = currentDayOfWeek === 6 ? 0 : currentDayOfWeek + 1;
  startDate.setDate(today.getDate() - daysToSubtract);

  // Get all day boxes
  const dayBoxes = document.querySelectorAll(".week__calendar-day-box");

  // Update each day box with the correct date
  dayBoxes.forEach((dayBox, index) => {
    // Calculate the date for this box
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);

    // Update the day number
    const dayNumber = dayBox.querySelector(".day__number");
    dayNumber.textContent = date.getDate();

    // Highlight current day if it matches today
    const isSameDate =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isSameDate) {
      dayBox.classList.add("current-day");
    } else {
      dayBox.classList.remove("current-day");
    }
  });
}

// Function to advance the calendar to the next week
function nextWeek() {
  const firstDayNumber = document.querySelector(".day__number").textContent;
  const startDate = new Date();

  // Set the date to the first displayed day plus 7
  startDate.setDate(parseInt(firstDayNumber) + 7);
  updateWeekWithDate(startDate);
}

// Function to go back to the previous week
function prevWeek() {
  const firstDayNumber = document.querySelector(".day__number").textContent;
  const startDate = new Date();

  // Set the date to the first displayed day minus 7
  startDate.setDate(parseInt(firstDayNumber) - 7);
  updateWeekWithDate(startDate);
}

// Update the calendar with a specific date as reference
function updateWeekWithDate(referenceDate) {
  // Calculate the Saturday of the week containing the reference date
  const referenceDayOfWeek = referenceDate.getDay();
  const startDate = new Date(referenceDate);
  const daysToSubtract = referenceDayOfWeek === 6 ? 0 : referenceDayOfWeek + 1;
  startDate.setDate(referenceDate.getDate() - daysToSubtract);

  // Get all day boxes
  const dayBoxes = document.querySelectorAll(".week__calendar-day-box");

  // Update each day box with the correct date
  dayBoxes.forEach((dayBox, index) => {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + index);
    // Update the day number
    const dayNumber = dayBox.querySelector(".day__number");
    dayNumber.textContent = date.getDate();
  });
}

// Run the update when the page loads
document.addEventListener("DOMContentLoaded", function () {
  updateWeekCalendar();

  // Example of how to add navigation buttons
  // If you have navigation buttons, you can add event listeners like this:
  // document.getElementById("prev-week-btn").addEventListener("click", prevWeek);
  // document.getElementById("next-week-btn").addEventListener("click", nextWeek);
});

// Optional: Update the calendar every day at midnight
// This is useful if your website stays open for long periods
function scheduleNextUpdate() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const timeUntilMidnight = tomorrow - now;

  setTimeout(() => {
    updateWeekCalendar();
    scheduleNextUpdate(); // Schedule the next update
  }, timeUntilMidnight);
}

// Start the schedule
scheduleNextUpdate();

////////////////////////////////////////

//////////////////////////////////////////////////////////
const saturdayRow = document.querySelector(".saturday__row");
const sundayRow = document.querySelector(".sunday__row");
const mondayRow = document.querySelector(".monday__row");
const tuesdayRow = document.querySelector(".tuesday__row");
const wednesdayRow = document.querySelector(".wednesday__row");
const thursdayRow = document.querySelector(".thursday__row");
const fridayRow = document.querySelector(".friday__row");
const dayRows = document.querySelectorAll('.day__row')

const today = new Date();

const dayOfWeek = today.getDay();
const diffToSaturday = (dayOfWeek + 1) % 7;
const startOfWeek = new Date(today);
startOfWeek.setDate(today.getDate() - diffToSaturday);
startOfWeek.setHours(0, 0, 0, 0);

const endOfWeek = new Date(startOfWeek);
endOfWeek.setDate(startOfWeek.getDate() + 6);
endOfWeek.setHours(23, 59, 59, 999);

export const startStr = startOfWeek.toISOString();
export const endStr = endOfWeek.toISOString();

const instructorId = sessionStorage.getItem("instructorId");

// Clear all events from day rows
function clearAllEvents() {
  saturdayRow.innerHTML = "";
  sundayRow.innerHTML = "";
  mondayRow.innerHTML = "";
  tuesdayRow.innerHTML = "";
  wednesdayRow.innerHTML = "";
  thursdayRow.innerHTML = "";
  fridayRow.innerHTML = "";
}


async function getCalendarEvents() {
  let uniqueEvents = [];
  dayRows.forEach((row) => {
    row.innerHTML = "<div class='loading-spinner'></div>";
  });
  const { data, error } = await supaClient
    .from("calendar_event")
    .select("*")
    .eq("instructor_id", instructorId)
    .gte("event_startdatetime", startStr)
    .lte("event_startdatetime", endStr)
  if (error) {
    console.error("Error fetching calendar events:", error);
    return null;
  }
  if (data) {
    const seen = new Set();
    
    data.forEach(event => {
      const key = `${event.event_startdatetime}-${event.event_enddatetime}`;
    
      if (!seen.has(key)) {
        seen.add(key);
        uniqueEvents.push(event);
      }
    });
    
    console.log(seen);
    return uniqueEvents;
  
  }
}

function addEventToCalendar(event) {
  const eventNameLength = event.event_name.length;
  const day = new Date(event.event_startdatetime).getDay();

  let targetRow;
  let dayNumber;

  switch (day) {
    case 0: // Sunday
      targetRow = sundayRow;
      dayNumber = day + 2;
      break;
    case 1: // Monday
      targetRow = mondayRow;
      dayNumber = day + 2;
      break;
    case 2: // Tuesday
      targetRow = tuesdayRow;
      dayNumber = day + 2;
      break;
    case 3: // Wednesday
      targetRow = wednesdayRow;
      dayNumber = day + 2;
      break;
    case 4: // Thursday
      targetRow = thursdayRow;
      dayNumber = day + 2;
      break;
    case 5: // Friday
      targetRow = fridayRow;
      dayNumber = day + 2;
      break;
    case 6: // Saturday
      targetRow = saturdayRow;
      dayNumber = day - 5;
      break;
  }
  let eventTime = subtractDates(
    new Date(event.event_enddatetime),
    new Date(event.event_startdatetime)
  );
  if(eventTime > 1440){
    eventTime = `${Math.floor(eventTime / 1440)} day`;
  }
  if(eventTime >= 60){
    eventTime = `${Math.floor(eventTime / 60)} hour`;
  }
  if(eventTime < 60){
    eventTime = `${eventTime} min`;
  }

  if (targetRow) {
    targetRow.insertAdjacentHTML(
      "afterbegin",
      `<div class="day__event day-${dayNumber}__event ${
        event.event_type === "student event" ? "student-event" : ""
      }" data-event-id="${event.event_id}">
          <div class="event__time__left">${eventTime}</div>
          <div class="event__type" style="font-size:${
            eventNameLength > 8 ? "12" : "16"
          }px">${event.event_name}</div>
        </div>`
    );
  }
}

async function renderWeeklyEvents(eventsArray) {
  const events = await eventsArray;
  userName.textContent = await getInstructorName(instructorId);
  // Clear existing events
  clearAllEvents();

  if (!events || events.length === 0) {
    console.log("No events found for the week.");
    return;
  }

  // Sort events by start time (newest first)
  events.sort(
    (a, b) => new Date(b.event_startdatetime) - new Date(a.event_startdatetime)
  );

  // Add each event to the calendar
  events.forEach((event) => {
    addEventToCalendar(event);
  });
}

// Set up Supabase real-time subscription
function setupRealtimeSubscription() {
  // Enable the Realtime feature for the calendar_event table
  supaClient
    .channel("calendar_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "calendar_event",
        filter: `instructor_id=eq.${instructorId}`,
      },
      (payload) => {
        console.log("Change received!", payload);

        // Handle the different types of changes
        switch (payload.eventType) {
          case "INSERT":
            // If the new event falls within our current week view, add it
            const eventDate = new Date(payload.new.event_startdatetime);
            if (eventDate >= startOfWeek && eventDate <= endOfWeek) {
              console.log("Adding new event to calendar:", payload.new);
              addEventToCalendar(payload.new);
              renderWeeklyEvents(getCalendarEvents());
            }
            break;

          case "UPDATE":
            // For updates, easiest approach is to refresh the entire view
            console.log("Event updated, refreshing calendar");
            renderWeeklyEvents(getCalendarEvents());
            break;

          case "DELETE":
            // Remove the specific event if it exists in our DOM
            console.log("Removing deleted event:", payload.old);
            const eventElement = document.querySelector(
              `[data-event-id="${payload.old.id}"]`
            );
            if (eventElement) {
              eventElement.remove();
            }
            break;
        }
      }
    )
    .subscribe((status) => {
      console.log("Subscription status:", status);
    });
}

// Initialize the calendar and start real-time updates
document.addEventListener("DOMContentLoaded", async () => {
  await renderWeeklyEvents(getCalendarEvents());
  setupRealtimeSubscription();

  // If you have navigation buttons, you would set up their event listeners here
  // const prevWeekBtn = document.getElementById("prev-week-btn");
  // const nextWeekBtn = document.getElementById("next-week-btn");

  // if (prevWeekBtn) prevWeekBtn.addEventListener("click", prevWeek);
  // if (nextWeekBtn) nextWeekBtn.addEventListener("click", nextWeek);
});

// Export functions that might be needed by other modules
export { renderWeeklyEvents, getCalendarEvents };
