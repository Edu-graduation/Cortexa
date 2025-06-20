import { attachDayClickListeners } from "./dailyCalendar.js";

//////////////////////=================================================///////////////////////
document.addEventListener("DOMContentLoaded", function () {
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const todayWeakEl = document.querySelector(".today__weak");
  const todayInMonthEl = document.querySelector(".today__in-month");
  const monthDisplay = document.getElementById("monthDisplay");
  const daysGrid = document.getElementById("daysGrid");
  const daysContainer = document.getElementById("daysContainer");
  const prevMonthBtn = document.getElementById("prevMonth");
  const nextMonthBtn = document.getElementById("nextMonth");

  // Initialize with today's date
  const today = new Date();
  let currentMonth = today.getMonth();
  let currentYear = today.getFullYear();
  let selectedDate;
  let selectedDay;
  let selDay;
  const fullToday = new Date();
  todayWeakEl.textContent = `${today.toDateString().slice(0, 3)}`;
  todayInMonthEl.textContent = ` ${today.toDateString().slice(8, 10)}
   ${today.toDateString().slice(4, 7)}`;

  // Month names

  // Initial calendar render
  renderCalendar();

  // Event listeners for navigation buttons
  prevMonthBtn.addEventListener("click", goToPrevMonth);
  nextMonthBtn.addEventListener("click", goToNextMonth);

  function goToPrevMonth() {
    // Create a clone of the current days grid for animation
    const currentGrid = daysGrid.cloneNode(true);
    currentGrid.id = "oldGrid";
    currentGrid.classList.add("calendar__month-slide");
    daysContainer.appendChild(currentGrid);
    // Update month and year
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }

    // Animate the month display
    monthDisplay.classList.add("animate");
    setTimeout(() => {
      monthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
      // todayWeakEl.textContent = `${fullToday.toDateString().slice(0, 3)}`;
      // todayInMonthEl.textContent = `1 ${monthNames[currentMonth].slice(0, 3)}`;
      monthDisplay.classList.remove("animate");
    }, 150);

    // Clear and render the new grid
    daysGrid.innerHTML = "";
    renderCalendar();

    // Animate transition
    daysGrid.classList.add("calendar__month-slide", "slide-in-left");
    currentGrid.classList.add("slide-out-right");

    // Cleanup after animation
    setTimeout(() => {
      daysGrid.classList.remove("calendar__month-slide", "slide-in-left");
      daysContainer.removeChild(currentGrid);
      attachDayClickListeners();
    }, 300);
    // Remove the selected day if user goes to the next month
    document.querySelectorAll(".calendar__day").forEach((day) => {
      day.classList.remove("calendar__day--selected");
    });
    // selDay?.classList?.add("calendar__day--selected");
  }
  function goToNextMonth() {
    // Create a clone of the current days grid for animation
    const currentGrid = daysGrid.cloneNode(true);
    currentGrid.id = "oldGrid";
    currentGrid.classList.add("calendar__month-slide");
    daysContainer.appendChild(currentGrid);

    // Update month and year
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }

    // Animate the month display
    monthDisplay.classList.add("animate");
    setTimeout(() => {
      monthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;
      // todayWeakEl.textContent = `${fullToday.toDateString().slice(0, 3)}`;
      // todayInMonthEl.textContent = `1 ${monthNames[currentMonth].slice(0, 3)}`;
      monthDisplay.classList.remove("animate");
    }, 150);

    // Clear and render the new grid
    daysGrid.innerHTML = "";
    renderCalendar();

    // Animate transition
    daysGrid.classList.add("calendar__month-slide", "slide-in-right");
    currentGrid.classList.add("slide-out-left");

    // Cleanup after animation
    setTimeout(() => {
      daysGrid.classList.remove("calendar__month-slide", "slide-in-right");
      daysContainer.removeChild(currentGrid);
      attachDayClickListeners();
    }, 300);
    // Remove the selected day if user goes to the next month
    selectedDay?.classList?.remove("calendar__day--selected");
    document.querySelectorAll(".calendar__day").forEach((day) => {
      day.classList.remove("calendar__day--selected");
    });
    // selDay?.classList?.add("calendar__day--selected");
  }

  function renderCalendar() {
    // Update month and year display
    monthDisplay.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    // Get first day of month and days in month
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Calculate days from previous month needed to fill first row
    // If firstDay is 0 (Sunday), we need to show 6 days from previous month
    // Otherwise we need to show firstDay - 1 days (since our week starts with Monday)
    const prevMonthDays = firstDay === 0 ? 6 : firstDay - 1;

    // Clear previous days
    daysGrid.innerHTML = "";

    // Previous month days
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = new Date(prevMonthYear, prevMonth + 1, 0).getDate();

    for (
      let i = daysInPrevMonth - prevMonthDays + 1;
      i <= daysInPrevMonth;
      i++
    ) {
      createDayElement(
        i,
        "calendar__day--other-month",
        prevMonth,
        prevMonthYear
      );
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      createDayElement(
        i,
        "calendar__day--current-month",
        currentMonth,
        currentYear
      );
    }

    // Next month days
    const totalCells = 42; // 6 rows of 7 days
    const nextMonthDays = totalCells - (prevMonthDays + daysInMonth);
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextMonthYear = currentMonth === 11 ? currentYear + 1 : currentYear;

    for (let i = 1; i <= nextMonthDays; i++) {
      createDayElement(
        i,
        "calendar__day--other-month",
        nextMonth,
        nextMonthYear
      );
    }
    attachDayClickListeners();
  }

  function createDayElement(day, monthClass, month, year) {
    const dayElement = document.createElement("div");

    dayElement.textContent = day;
    // dayElement.dataset.month = currentMonth;
    dayElement.dataset.month = month;
    dayElement.dataset.year = year;

    dayElement.classList.add("calendar__day");
    dayElement.classList.add(monthClass);
    // Get the day of week (0 is Sunday, 1 is Monday, etc.)
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();

    // Add weekend class for Saturday and Sunday
    if (dayOfWeek === 5 || dayOfWeek === 6) {
      dayElement.classList.add("calendar__day--weekend");
    }

    // Check if this day is today
    const isToday =
      today.getDate() === day &&
      today.getMonth() === month &&
      today.getFullYear() === year;

    if (isToday) {
      dayElement.classList.add("calendar__day--today");
    }

    // Check if this day is selected
    const isSelected =
      selectedDate === day && currentMonth === month && currentYear === year;

    if (isSelected) {
      dayElement.classList.add("calendar__day--selected");
    }

    // Add click event to select day
    dayElement.addEventListener("click", function () {
      // Remove selected class from previously selected day
      selectedDay = document.querySelector(".calendar__day--selected");
      if (selectedDay) {
        selectedDay.classList.remove("calendar__day--selected");
      }

      // Add selected class to clicked day

      // Store selected date
      selectedDate = day;
      selDay = new Date(`${year}/${month + 1}/${selectedDate}`);
      todayWeakEl.textContent = `${selDay.toDateString().slice(0, 3)}`;
      todayInMonthEl.textContent = ` ${selectedDate
        .toString()
        .padStart(2, 0)} ${monthNames[month]}`;

      if (selectedDate) {
        dayElement.classList.add(`calendar__day--selected`);
        dayElement.classList.add("day-select-animation");
      }
      // If user clicks on a day from previous or next month, change the month
      if (month !== currentMonth) {
        // currentMonth = month;// COMMENTED OUT
        // currentYear = year; // COMMENTED OUT

        setTimeout(() => {
          if (month < currentMonth || (month === 11 && currentMonth === 0)) {
            goToPrevMonth();
          } else {
            goToNextMonth();
          }
        }, 200);
      }

      // Remove animation class after animation completes
      setTimeout(() => {
        dayElement.classList.remove("day-select-animation");
      }, 300);
    });

    daysGrid.appendChild(dayElement);
  }
});

////////////////////////  WEEKLY CALENDAR  /////////////////////////
// Function to update the week calendar with current dates
