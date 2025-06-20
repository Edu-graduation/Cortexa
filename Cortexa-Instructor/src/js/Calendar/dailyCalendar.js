///////////////////// VERSION TWO ///////////////////////
import { supaClient } from "../main.js";
import { subtractDates } from "../utilities/dateCalc.js";
import { endStr, startStr } from "./weeklyCalendar.js";

const dailySchedule = document.querySelector(".daily__event-container");
const hoursContainer = document.querySelector(".time");
const instructorId = sessionStorage.getItem("instructorId");

// Helper function to format time in a readable format
function formatTimeDisplay(dateTimeStr) {
  return new Date(dateTimeStr).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

// Helper function to clear and rebuild hours display
function updateHoursDisplay(timeArray) {
  // Clear existing hours
  hoursContainer.innerHTML = "";

  // If no events, display default hours
  if (!timeArray || timeArray.length === 0) {
    const defaultHours = [
      "8:00 AM",
      "10:00 AM",
      "12:00 PM",
      "2:00 PM",
      "4:00 PM",
      "6:00 PM",
      "8:00 PM",
    ];
    defaultHours.forEach((time) => {
      const hourElement = document.createElement("div");
      hourElement.className = "hour";
      hourElement.textContent = time;
      hoursContainer.appendChild(hourElement);
    });
    return;
  }

  // Get unique times (to avoid duplicates)
  const uniqueTimes = [
    ...new Set(
      timeArray.map((time) =>
        new Date(time).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      )
    ),
  ];

  // Sort times chronologically
  uniqueTimes.sort((a, b) => {
    return new Date(`1/1/2000 ${a}`) - new Date(`1/1/2000 ${b}`);
  });

  // Create hour elements for each time
  uniqueTimes.forEach((time, index) => {
    const hourElement = document.createElement("div");
    hourElement.className = "hour";
    hourElement.textContent = time;
    hourElement.dataset.time = time;
    hourElement.dataset.index = index;
    hoursContainer.appendChild(hourElement);
  });
}

async function getDailySchedule() {
  dailySchedule.innerHTML = "<div class='loading-spinner'></div>";
  const { data, error } = await supaClient
    .from("calendar_event")
    .select("*")
    .eq("instructor_id", instructorId);

  if (error) {
    console.error("Error fetching calendar events:", error);
    return [];
  }
  let uniqueEvents = [];
  const seen = new Set();

  data.forEach(event => {
    const key = `${event.event_startdatetime}-${event.event_enddatetime}`;
  
    if (!seen.has(key)) {
      seen.add(key);
      uniqueEvents.push(event);
    }
  });
  return uniqueEvents || [];
}

// Track the currently selected day for real-time updates
let currentlySelectedDay = new Date().getDate();
let currentlySelectedMonth = new Date().getMonth();
let currentlySelectedYear = new Date().getFullYear();

// Group events by time to handle events with the same start time
function groupEventsByTime(events) {
  const groupedEvents = {};

  events.forEach((event) => {
    const timeKey = formatTimeDisplay(event.event_startdatetime);
    if (!groupedEvents[timeKey]) {
      groupedEvents[timeKey] = [];
    }
    groupedEvents[timeKey].push(event);
  });

  return groupedEvents;
}

// Function to render events in the daily view
async function renderDailyEvents(eventsPromise) {
  const events = await eventsPromise;
  let timeHours = [];

  // Clear previous content
  dailySchedule.innerHTML = "";

  // Update currently selected day to today
  const today = new Date();
  currentlySelectedDay = today.getDate();
  currentlySelectedMonth = today.getMonth();
  currentlySelectedYear = today.getFullYear();

  // Sort events by start time
  events.sort(
    (a, b) => new Date(a.event_startdatetime) - new Date(b.event_startdatetime)
  );

  // Filter events for the current day
  const todayEvents = events.filter((event) => {
    const eventDate = new Date(event.event_startdatetime);
    const eventDay = eventDate.getDate();
    const eventMonth = eventDate.getMonth();
    const eventYear = eventDate.getFullYear();

    return (
      eventDay === currentlySelectedDay &&
      eventMonth === currentlySelectedMonth &&
      eventYear === currentlySelectedYear
    );
  });

  // If no events, show message
  if (todayEvents.length === 0) {
    dailySchedule.innerHTML = `<p class="no-events">No events for today</p>`;
    updateHoursDisplay([]);
    return;
  }

  // Group events by start time
  const groupedEvents = groupEventsByTime(todayEvents);

  // Store all times for the hours display
  todayEvents.forEach((event) => {
    timeHours.push(event.event_startdatetime);
  });

  // Create and append time blocks for each group of events
  Object.keys(groupedEvents)
    .sort((a, b) => {
      return new Date(`1/1/2000 ${a}`) - new Date(`1/1/2000 ${b}`);
    })
    .forEach((timeKey) => {
      const eventsAtTime = groupedEvents[timeKey];

      // Create a time block container for this time
      const timeBlock = document.createElement("div");
      timeBlock.className = "daily__time-block";

      // Create a time label
      // const timeLabel = document.createElement("div");
      // timeLabel.className = "daily__time-label";
      // timeLabel.textContent = timeKey;
      // dailySchedule.appendChild(timeLabel);

      // Create a row container for events at this time
      const eventRow = document.createElement("div");
      eventRow.className = "daily__event-row";

      // Add all events for this time
      eventsAtTime.forEach((event) => {
        const eventDate = new Date(event.event_startdatetime);
        const day = eventDate.getDay();
        const number = day === 6 ? day - 5 : day + 2;

        const eventElement = document.createElement("div");
        eventElement.className = `daily__event daily__event-${number} ${
          event.event_type === "student event" ? "student-event" : ""
        }`;
        eventElement.dataset.day = day;
        eventElement.dataset.eventId = event.event_id;

        eventElement.innerHTML = `
        <p class="daily__event-title">${event.event_name}</p>
        <p class="daliy__event-description">${event.event_details || ""}</p>
      `;

        eventRow.appendChild(eventElement);
      });

      timeBlock.appendChild(eventRow);
      dailySchedule.appendChild(timeBlock);
    });

  // Update hours display
  updateHoursDisplay(timeHours);
}

// Function to handle day clicks for event display
export function attachDayClickListeners() {
  document.querySelectorAll(".calendar__day").forEach((dayEl) => {
    dayEl.addEventListener("click", async (e) => {
      // Get the selected day's information
      const selectedDay = +e.target.textContent;
      const elementMonth = parseInt(dayEl.dataset.month);
      const elementYear = parseInt(dayEl.dataset.year);

      // Update currently selected day for real-time updates
      currentlySelectedDay = selectedDay;
      currentlySelectedMonth = elementMonth;
      currentlySelectedYear = elementYear;

      // Fetch events
      const { data, error } = await supaClient
        .from("calendar_event")
        .select("*")
        .eq("instructor_id", instructorId);

      if (error) {
        console.error("Error fetching events:", error);
        dailySchedule.innerHTML = `<p class="no-events">Error loading events</p>`;
        return;
      }

      // Clear previous content
      dailySchedule.innerHTML = "";
      let timeHours = [];

      if (!data || data.length === 0) {
        dailySchedule.innerHTML = `<p class="no-events">No events for this day</p>`;
        updateHoursDisplay([]);
        return;
      }

      // Filter events for the selected day
      const selectedDayEvents = data.filter((event) => {
        const eventDate = new Date(event.event_startdatetime);
        const eventDay = eventDate.getDate();
        const eventMonth = eventDate.getMonth();
        const eventYear = eventDate.getFullYear();

        return (
          eventDay === selectedDay &&
          eventMonth === elementMonth &&
          eventYear === elementYear
        );
      });

      if (selectedDayEvents.length === 0) {
        dailySchedule.innerHTML = `<p class="no-events">No events for this day</p>`;
        updateHoursDisplay([]);
        return;
      }

      // Group events by start time
      const groupedEvents = groupEventsByTime(selectedDayEvents);

      // Store all times for the hours display
      selectedDayEvents.forEach((event) => {
        timeHours.push(event.event_startdatetime);
      });

      // Create and append time blocks for each group of events
      Object.keys(groupedEvents)
        .sort((a, b) => {
          return new Date(`1/1/2000 ${a}`) - new Date(`1/1/2000 ${b}`);
        })
        .forEach((timeKey) => {
          const eventsAtTime = groupedEvents[timeKey];

          // Create a time block container for this time
          const timeBlock = document.createElement("div");
          timeBlock.className = "daily__time-block";

          // Create a time label
          // const timeLabel = document.createElement("div");
          // timeLabel.className = "daily__time-label";
          // timeLabel.textContent = timeKey;
          // dailySchedule.appendChild(timeLabel);

          // Create a row container for events at this time
          const eventRow = document.createElement("div");
          eventRow.className = "daily__event-row";
          let uniqueEvents = [];
          const seen = new Set();
    
          eventsAtTime.forEach(event => {
            const key = `${event.event_startdatetime}-${event.event_enddatetime}`;
          
            if (!seen.has(key)) {
              seen.add(key);
              uniqueEvents.push(event);
            }
          });
          // Add all events for this time
          uniqueEvents.forEach((event) => {
            const eventDate = new Date(event.event_startdatetime);
            const day = eventDate.getDay();
            const number = day === 6 ? day - 5 : day + 2;

            const eventElement = document.createElement("div");
            eventElement.className = `daily__event daily__event-${number} ${
              event.event_type === "student event" ? "student-event" : ""
            }`;
            eventElement.dataset.day = day;
            eventElement.dataset.eventId = event.event_id;

            eventElement.innerHTML = `
            <p class="daily__event-title">${event.event_name}</p>
            <p class="daliy__event-description">${event.event_details || ""}</p>
          `;

            eventRow.appendChild(eventElement);
          });

          timeBlock.appendChild(eventRow);
          dailySchedule.appendChild(timeBlock);
        });

      // Update hours display
      updateHoursDisplay(timeHours);
    });
  });
}

// Function to set up real-time subscription
function setupDailyRealtimeSubscription() {
  supaClient
    .channel("daily_calendar_changes")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "calendar_event",
        filter: `instructor_id=eq.${instructorId}`,
      },
      (payload) => {
        console.log("Daily view - Change received!", payload);

        // For all changes, re-fetch and re-render to ensure proper grouping
        getDailySchedule().then((events) => {
          // Filter for currently selected day
          const filteredEvents = events.filter((event) => {
            const eventDate = new Date(event.event_startdatetime);
            return (
              eventDate.getDate() === currentlySelectedDay &&
              eventDate.getMonth() === currentlySelectedMonth &&
              eventDate.getFullYear() === currentlySelectedYear
            );
          });

          // Clear previous content
          dailySchedule.innerHTML = "";

          if (filteredEvents.length === 0) {
            dailySchedule.innerHTML = `<p class="no-events">No events for this day</p>`;
            updateHoursDisplay([]);
            return;
          }

          // Group and render events
          const groupedEvents = groupEventsByTime(filteredEvents);
          const timeHours = filteredEvents.map(
            (event) => event.event_startdatetime
          );

          // Create and append time blocks
          Object.keys(groupedEvents)
            .sort((a, b) => {
              return new Date(`1/1/2000 ${a}`) - new Date(`1/1/2000 ${b}`);
            })
            .forEach((timeKey) => {
              const eventsAtTime = groupedEvents[timeKey];

              // Create a time block container for this time
              const timeBlock = document.createElement("div");
              timeBlock.className = "daily__time-block";

              // Create a time label
              // const timeLabel = document.createElement("div");
              // timeLabel.className = "daily__time-label";
              // timeLabel.textContent = timeKey;
              // dailySchedule.appendChild(timeLabel);

              // Create a row container for events at this time
              const eventRow = document.createElement("div");
              eventRow.className = "daily__event-row";
              let uniqueEvents = [];
              const seen = new Set();
              eventsAtTime.forEach(event => {
                const key = `${event.event_startdatetime}-${event.event_enddatetime}`;
              
                if (!seen.has(key)) {
                  seen.add(key);
                  uniqueEvents.push(event);
                }
              });
              // Add all events for this time
              uniqueEvents.forEach((event) => {
                const eventDate = new Date(event.event_startdatetime);
                const day = eventDate.getDay();
                const number = day === 6 ? day - 5 : day + 2;

                const eventElement = document.createElement("div");
                eventElement.className = `daily__event daily__event-${number} ${
                  event.event_type === "student event" ? "student-event" : ""
                }`;
                eventElement.dataset.day = day;
                eventElement.dataset.eventId = event.event_id;

                eventElement.innerHTML = `
                <p class="daily__event-title">${event.event_name}</p>
                <p class="daliy__event-description">${
                  event.event_details || ""
                }</p>
              `;

                eventRow.appendChild(eventElement);
              });

              timeBlock.appendChild(eventRow);
              dailySchedule.appendChild(timeBlock);
            });

          // Update hours display
          updateHoursDisplay(timeHours);
        });
      }
    )
    .subscribe((status) => {
      console.log("Daily view subscription status:", status);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize the click listeners for the initial calendar render
  attachDayClickListeners();

  // Display today's events by default
  renderDailyEvents(getDailySchedule());

  // Setup real-time updates
  setupDailyRealtimeSubscription();
});
