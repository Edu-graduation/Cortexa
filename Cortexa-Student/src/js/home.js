import { isInstitutionSchool, supaClient } from "./app.js";
const studentId = sessionStorage.getItem("studentId");

// Cache objects to store fetched data
const cache = {
  courseNames: {},
  instructors: null,
  studentCourses: null,
  sessionsByDay: {},
  courseActivities: null,
};
async function getInstitutionId(studentId) {
  const { data, error } = await supaClient
    .from("student")
    .select("institution_id")
    .eq("student_id", +studentId);

  if (error) {
    console.error("Error fetching institution_id:", error);
    return null;
  }
  if (data && data.length > 0) {
    const institutionId = data[0].institution_id;
    if (!sessionStorage.getItem("institution_id")) {
      sessionStorage.setItem("institution_id", institutionId);
    }
    return institutionId;
  } else {
    console.log("No data found for studentId:", studentId);
    return null;
  }
}
// Get all necessary data in a single function call
async function loadInitialData() {
  try {
    // 1. First get instructors for the institution
    if (!cache.instructors) {
      let institutionId;
      if (!sessionStorage.getItem("institution_id")) {
        institutionId = await getInstitutionId(studentId);
      } else {
        institutionId = sessionStorage.getItem("institution_id");
      }
      const { data: instructorData, error: instructorError } = await supaClient
        .from("instructor_institution")
        .select("instructor_id")
        .eq("institution_id", institutionId);

      if (instructorError) {
        console.error("Error fetching institution data:", instructorError);
        return false;
      }

      cache.instructors = instructorData.map(
        (instructor) => instructor.instructor_id
      );

      if (!cache.instructors.length) {
        console.error("No instructors found for this institution");
        return false;
      }
    }

    // 2. Get all student courses in one request
    if (!cache.studentCourses) {
      const { data: enrollmentData, error: enrollmentError } = await supaClient
        .from("enrollment")
        .select("*, course:course_id(course_id, course_name)")
        .in("instructor_id", cache.instructors)
        .eq("student_id", studentId);

      if (enrollmentError) {
        console.error("Error fetching enrollment data:", enrollmentError);
        return false;
      }

      // Store courses with their names already attached
      cache.studentCourses = enrollmentData;
      // Also populate the courseNames cache
      enrollmentData.forEach((enrollment) => {
        if (enrollment.course) {
          cache.courseNames[enrollment.course_id] =
            enrollment.course.course_name;
        }
      });
    }

    return true;
  } catch (error) {
    console.error("Error in loadInitialData:", error);
    return false;
  }
}

// Helper function to get course name (uses cache)
function getCourseName(courseId) {
  return cache.courseNames[courseId] || "Unknown Course";
}

// Get courses IDs for the current student
// function getStudentCourseIds() {
//   if (!cache.studentCourses) return [];
//     return cache.studentCourses.map(course => course.course_id);

// }
function getStudentCourseIds() {
  if (!cache.studentCourses) {
    console.warn("Student courses not loaded yet");
    return [];
  }

  const courseIds = cache.studentCourses.map(
    (enrollment) => enrollment.course_id
  );
  return courseIds;
}
// Format time to display as "At 8:00 AM"
function formatSessionTime(timeString) {
  try {
    // Check if it contains date information (format: 2025-05-07 14:00:00)
    let time;
    if (timeString.includes("-")) {
      time = new Date(timeString);
    }
    // Check if it's a full ISO datetime
    else if (timeString.includes("T")) {
      time = new Date(timeString);
    }
    // Handle time-only format like "14:30:00"
    else {
      const [hours, minutes] = timeString
        .split(":")
        .map((num) => parseInt(num));
      time = new Date();
      time.setHours(hours, minutes, 0);
    }

    if (isNaN(time.getTime())) {
      console.warn("Invalid time:", timeString);
      return "At " + timeString; // Return original if invalid
    }

    // Format as "8:00 AM"
    return (
      "At " +
      time.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    );
  } catch (e) {
    console.error("Time formatting error:", e);
    return "At " + timeString;
  }
}

// Check if a session is for today by examining various possible date fields
function isSessionToday(session) {
  try {
    // Get today's date without time for comparison
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Check session_date field (if it exists)
    if (session.session_date) {
      const sessionDate = new Date(session.session_date);
      sessionDate.setHours(0, 0, 0, 0);

      if (
        sessionDate.toISOString().split("T")[0] ===
        today.toISOString().split("T")[0]
      ) {
        return true;
      }
    }

    // 2. Check session_datetime field (if it exists)
    if (session.session_datetime) {
      const sessionDate = new Date(session.session_datetime);
      sessionDate.setHours(0, 0, 0, 0);

      if (
        sessionDate.toISOString().split("T")[0] ===
        today.toISOString().split("T")[0]
      ) {
        return true;
      }
    }

    // 3. Special check for session_time if it contains date information (format: 2025-05-07 14:00:00)
    if (session.session_time && session.session_time.includes("-")) {
      const sessionDate = new Date(session.session_time);
      sessionDate.setHours(0, 0, 0, 0);

      if (
        sessionDate.toISOString().split("T")[0] ===
        today.toISOString().split("T")[0]
      ) {
        return true;
      }
    }

    // 4. Check session_day if it exists
    if (session.session_day) {
      // If session_day is a number representing day of week (0-6, where 0 is Sunday)
      if (
        typeof session.session_day === "number" ||
        !isNaN(Number(session.session_day))
      ) {
        const sessionDayNum = Number(session.session_day);
        const todayDayNum = today.getDay();

        if (sessionDayNum === todayDayNum) {
          return true;
        }
      }
      // If session_day is a string like "Monday", "Tuesday", etc.
      else if (typeof session.session_day === "string") {
        const days = [
          "sunday",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
        ];
        const todayDayName = days[today.getDay()];

        if (session.session_day.toLowerCase() === todayDayName) {
          return true;
        }
      }
    }
    return false;
  } catch (e) {
    console.error("Error checking if session is today:", e);
    return true;
  }
}

// Format date for display
function formatDate(dateString) {
  try {
    // Parse ISO 8601 date (e.g. "2025-05-08T12:00:00+00:00")
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date:", dateString);
      return dateString; // Return original if invalid
    }

    // Format: "2025-04-29 09:59"
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch (e) {
    console.error("Date formatting error:", e);
    return dateString;
  }
}

// New function to format date as "5 Nov Sun"
function formatDateShort(dateString) {
  try {
    // Parse the date string
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      console.warn("Invalid date for short formatting:", dateString);
      return dateString; // Return original if invalid
    }

    // Get day number (1-31)
    const day = date.getDate();

    // Get month short name (Jan, Feb, etc.)
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const month = months[date.getMonth()];

    // Get weekday short name (Sun, Mon, etc.)
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weekday = weekdays[date.getDay()];

    // Format: "5 Nov Sun"
    return `${day} ${month} ${weekday}`;
  } catch (e) {
    console.error("Date short formatting error:", e);
    return dateString;
  }
}

function isWithinNextWeek(dateString) {
  try {
    if (!dateString) {
      console.warn("Empty date string provided");
      return false;
    }

    // Parse the date string
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      console.warn("Invalid date for weekly check:", dateString);
      return false;
    }

    // Get today at 00:00:00
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get next week at 23:59:59
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    return date >= today && date <= nextWeek;
  } catch (e) {
    console.error("Date check error:", e, "for date:", dateString);
    return false;
  }
}

// Create deadline box element
function createDeadlineBox(title, type, deadline) {
  const formattedDate = formatDate(deadline);

  const box = document.createElement("div");
  box.className = "box";

  box.innerHTML = `
    <div class="upper" ${
      title.length > 10 ? 'style="font-size: 1.5rem;"' : ""
    }>${title}</div>
    <div class="lower">${type}</div>
    <div class="box__time-container">
      <p class="box__time">${formatDateShort(formattedDate)}</p>
      <img class="imgCard" src="src/images/icons8-clock-60.png" />
    </div>
  `;

  return box;
}
async function fetchStudentSessionData() {
  try {
    // Make sure initial data is loaded first
    if (!cache.studentCourses) {
      const loaded = await loadInitialData();
      if (!loaded) {
        console.error("Failed to load initial data for student sessions");
        return [];
      }
    }

    if (!cache.todaySessions) {
      const courseIds = getStudentCourseIds();

      if (!courseIds || courseIds.length === 0) {
        console.error("No course IDs found for student sessions");
        return [];
      }

      // Fetch all sessions for student's courses in one request
      const { data, error } = await supaClient
        .from("session")
        .select("*")
        .in("course_id", courseIds);

      if (error) {
        console.error("Error fetching session data:", error);
        return [];
      }

      // Filter for today's sessions
      const todaySessions = data
        .filter((session) => isSessionToday(session))
        .map((session) => ({
          ...session,
          course_name: getCourseName(session.course_id),
        }));

      todaySessions.sort((a, b) => {
        const timeA = new Date(a.session_time).getTime();
        const timeB = new Date(b.session_time).getTime();
        return timeA - timeB;
      });
      cache.todaySessions = todaySessions;
    }

    return cache.todaySessions;
  } catch (error) {
    console.error("Error in fetchStudentSessionData:", error);
    return [];
  }
}
// Get all deadline data in a single function
async function fetchAllDeadlineData() {
  const courseIds = getStudentCourseIds();
  if (!courseIds.length)
    return { quizzes: [], assignments: [], activities: [] };

  // Parallel requests for better performance
  const [quizResult, assignmentResult] = await Promise.all([
    // Fetch quizzes
    supaClient.from("quiz").select("*").in("course_id", courseIds),
    // Fetch assignments
    supaClient.from("assignment").select("*").in("course_id", courseIds),
  ]);

  // Handle errors
  if (quizResult.error) {
    console.error("Error fetching quizzes:", quizResult.error);
    quizResult.data = [];
  }

  if (assignmentResult.error) {
    console.error("Error fetching assignments:", assignmentResult.error);
    assignmentResult.data = [];
  }

  // Get course activities in an efficient way
  let activitiesData = [];
  if (!cache.courseActivities) {
    // First get the course_activity mappings
    const { data: courseActivities, error: courseActivityError } =
      await supaClient
        .from("course_activity")
        .select("*")
        .in("course_id", courseIds);

    if (courseActivityError) {
      console.error("Error fetching course activities:", courseActivityError);
    } else if (courseActivities && courseActivities.length > 0) {
      // Store in cache
      cache.courseActivities = courseActivities;

      // Get the activity IDs
      const activityIds = courseActivities.map((ca) => ca.activity_id);

      // Fetch the activities
      const { data: activities, error: activityError } = await supaClient
        .from("activity")
        .select("*")
        .in("activity_id", activityIds);

      if (activityError) {
        console.error("Error fetching activities:", activityError);
      } else if (activities) {
        // Map activities to include course info
        activitiesData = activities.map((activity) => {
          const courseActivity = courseActivities.find(
            (ca) => ca.activity_id === activity.activity_id
          );
          const courseId = courseActivity ? courseActivity.course_id : null;

          return {
            ...activity,
            course_id: courseId,
            course_name: getCourseName(courseId),
          };
        });
      }
    }
  }

  // Filter for items within next week
  const quizzes = quizResult.data.filter((quiz) => {
    const quizDueDate = quiz.quiz_dueDateTime || quiz.quiz_duedatetime;
    return isWithinNextWeek(quizDueDate);
  });

  const assignments = assignmentResult.data.filter((assignment) =>
    isWithinNextWeek(assignment.assign_duedate)
  );

  const activities = activitiesData.filter((activity) =>
    isWithinNextWeek(activity.activity_duedate)
  );

  return { quizzes, assignments, activities };
}

// Get semester progress data
async function getSemesterProgress() {
  const semesterProgress = document.querySelector(".semester-progress-fill");
  const semesterProgressPercentage = document.querySelector(
    ".semester-progress-percentage"
  );
  const semesterProgressDate = document.querySelector(
    ".semester-progress-date"
  );

  try {
    // Load initial data if not already loaded
    if (!cache.studentCourses) {
      const loaded = await loadInitialData();
      if (!loaded) {
        semesterProgress.style.width = "0%";
        semesterProgressPercentage.textContent = "Error";
        semesterProgressDate.textContent = "Error loading data";
        return;
      }
    }

    const courseIds = getStudentCourseIds();
    // Fetch sessions for all courses in one go
    const { data, error } = await supaClient
      .from("session")
      .select("*")
      .in("course_id", courseIds)
      .order("session_time");
    if (error) {
      console.error("Error fetching session data:", error);
      semesterProgress.style.width = "0%";
      semesterProgressPercentage.textContent = "Error";
      semesterProgressDate.textContent = "Error loading sessions";
      return;
    }

    if (data && data.length > 0) {
      // Parse dates properly to ensure correct calculations
      const allSessions = data.map((session) => {
        return {
          ...session,
          date: new Date(session.session_time),
        };
        
      });

      // Sort sessions by date
      allSessions.sort((a, b) => a.date - b.date);

      // Divide sessions into first and second semester
      const firstSessionDate = allSessions[0].date;
      const lastSessionDate = allSessions[allSessions.length - 1].date;
      // Calculate the midpoint between first and last session
      const totalMilliseconds = lastSessionDate - firstSessionDate;
      if(isInstitutionSchool()){
        // const midpointDate = new Date(
        //   firstSessionDate.getTime() + totalMilliseconds / 2
        // );
  
        // Split sessions into first and second semester
        const currentSemesterSessions = allSessions;
        // Determine current semester
        const currentDate = new Date();
        // let currentSemesterSessions;
        let semesterName;
  
        if (currentSemesterSessions.length === 0) {
          console.warn("No sessions found for the current semester");
          semesterProgress.style.width = "0%";
          semesterProgressPercentage.textContent = "0%";
          semesterProgressDate.textContent = "0/0 weeks";
          return;
        }
  
  
        // Calculate progress for the current semester
        const semesterStartDate = currentSemesterSessions[0].date;
        const semesterEndDate =
          currentSemesterSessions[currentSemesterSessions.length - 1].date;
        // Helper function to get week number of year for a date
        const getWeekNumber = (date) => {
          // Create a copy of the date to avoid modifying the original
          const dateCopy = new Date(date);
          // Set to nearest Thursday: current date + 4 - current day number
          // Make Sunday's day number 7
          const dayNum = dateCopy.getUTCDay() || 7;
          dateCopy.setUTCDate(dateCopy.getUTCDate() + 4 - dayNum);
          // Get first day of year
          const yearStart = new Date(Date.UTC(dateCopy.getUTCFullYear(), 0, 1));
          // Calculate full weeks to nearest Thursday
          const weekNumber = Math.ceil(
            ((dateCopy - yearStart) / 86400000 + 1) / 7
          );
          // Return array of year and week number
          return [dateCopy.getUTCFullYear(), weekNumber];
        };
  
        // Calculate weeks for current semester
        const startWeekInfo = getWeekNumber(semesterStartDate);
        const endWeekInfo = getWeekNumber(semesterEndDate);
        const currentWeekInfo = getWeekNumber(currentDate);
        
        // Calculate total number of weeks in semester
        let totalWeeks = 0;
        if (startWeekInfo[0] === endWeekInfo[0]) {
          // Same year
          totalWeeks = endWeekInfo[1] - startWeekInfo[1] + 1;
        } else {
          // Different years
          const weeksInStartYear = 52 - startWeekInfo[1] + 1;
          totalWeeks = weeksInStartYear + endWeekInfo[1];
        }
  
        // Calculate elapsed weeks
        let elapsedWeeks = 0;
        if (startWeekInfo[0] === currentWeekInfo[0]) {
          // Same year
          elapsedWeeks = currentWeekInfo[1] - startWeekInfo[1] + 1;
        } else {
          // Different years
          const weeksInStartYear = 52 - startWeekInfo[1] + 1;
          elapsedWeeks = weeksInStartYear + currentWeekInfo[1];
        }
  
        // Ensure elapsedWeeks isn't greater than totalWeeks
        elapsedWeeks = Math.min(elapsedWeeks, totalWeeks);
        
        // Handle edge case where elapsed weeks is negative (current date before semester start)
        if (elapsedWeeks < 0) {
          elapsedWeeks = 0;
        }
        console.log(elapsedWeeks);
        console.log(totalWeeks);
        
        
        // Calculate progress percentage
        const progressPercentage = (elapsedWeeks / totalWeeks) * 100;
        // Round to nearest whole number for display
        const roundedPercentage = Math.round(progressPercentage);
  
        // Update UI elements
        semesterProgress.style.width = `${roundedPercentage}%`;
        semesterProgressPercentage.textContent = `${roundedPercentage}%`;
        semesterProgressDate.textContent = `${elapsedWeeks}/${totalWeeks} weeks`;
      }else{
      const midpointDate = new Date(
        firstSessionDate.getTime() + totalMilliseconds / 2
      );

      // Split sessions into first and second semester
      const firstSemesterSessions = allSessions.filter(
        (session) => session.date < midpointDate
      );
      const secondSemesterSessions = allSessions.filter(
        (session) => session.date >= midpointDate
      );
      // Determine current semester
      const currentDate = new Date();
      let currentSemesterSessions;
      let semesterName;

      if (currentDate < midpointDate) {
        currentSemesterSessions = firstSemesterSessions;
        semesterName = "First Semester";
      } else {
        currentSemesterSessions = secondSemesterSessions;
        semesterName = "Second Semester";
      }
      
      if (currentSemesterSessions.length === 0) {
        console.warn("No sessions found for the current semester");
        semesterProgress.style.width = "0%";
        semesterProgressPercentage.textContent = "0%";
        semesterProgressDate.textContent = "0/0 weeks";
        return;
      }


      // Calculate progress for the current semester
      const semesterStartDate = currentSemesterSessions[0].date;
      const semesterEndDate =
        currentSemesterSessions[currentSemesterSessions.length - 1].date;
      // Helper function to get week number of year for a date
      const getWeekNumber = (date) => {
        // Create a copy of the date to avoid modifying the original
        const dateCopy = new Date(date);
        // Set to nearest Thursday: current date + 4 - current day number
        // Make Sunday's day number 7
        const dayNum = dateCopy.getUTCDay() || 7;
        dateCopy.setUTCDate(dateCopy.getUTCDate() + 4 - dayNum);
        // Get first day of year
        const yearStart = new Date(Date.UTC(dateCopy.getUTCFullYear(), 0, 1));
        // Calculate full weeks to nearest Thursday
        const weekNumber = Math.ceil(
          ((dateCopy - yearStart) / 86400000 + 1) / 7
        );
        // Return array of year and week number
        return [dateCopy.getUTCFullYear(), weekNumber];
      };

      // Calculate weeks for current semester
      const startWeekInfo = getWeekNumber(semesterStartDate);
      const endWeekInfo = getWeekNumber(semesterEndDate);
      const currentWeekInfo = getWeekNumber(currentDate);
      
      // Calculate total number of weeks in semester
      let totalWeeks = 0;
      if (startWeekInfo[0] === endWeekInfo[0]) {
        // Same year
        totalWeeks = endWeekInfo[1] - startWeekInfo[1] + 1;
      } else {
        // Different years
        const weeksInStartYear = 52 - startWeekInfo[1] + 1;
        totalWeeks = weeksInStartYear + endWeekInfo[1];
      }

      // Calculate elapsed weeks
      let elapsedWeeks = 0;
      if (startWeekInfo[0] === currentWeekInfo[0]) {
        // Same year
        elapsedWeeks = currentWeekInfo[1] - startWeekInfo[1] + 1;
      } else {
        // Different years
        const weeksInStartYear = 52 - startWeekInfo[1] + 1;
        elapsedWeeks = weeksInStartYear + currentWeekInfo[1];
      }

      // Ensure elapsedWeeks isn't greater than totalWeeks
      elapsedWeeks = Math.min(elapsedWeeks, totalWeeks);
      
      // Handle edge case where elapsed weeks is negative (current date before semester start)
      if (elapsedWeeks < 0) {
        elapsedWeeks = 0;
      }
      console.log(elapsedWeeks);
      console.log(totalWeeks);
      
      
      // Calculate progress percentage
      const progressPercentage = (elapsedWeeks / totalWeeks) * 100;
      // Round to nearest whole number for display
      const roundedPercentage = Math.round(progressPercentage);

      // Update UI elements
      semesterProgress.style.width = `${roundedPercentage}%`;
      semesterProgressPercentage.textContent = `${roundedPercentage}%`;
      semesterProgressDate.textContent = `${elapsedWeeks}/${totalWeeks} weeks`;
    }
    } else {
      console.warn("No session data found");
      // Set default values if no data
      semesterProgress.style.width = "0%";
      semesterProgressPercentage.textContent = "0%";
      semesterProgressDate.textContent = "No semester data";
    }
  } catch (err) {
    console.error("Error in getSemesterProgress:", err);
    // Set default values on error
    semesterProgress.style.width = "0%";
    semesterProgressPercentage.textContent = "Error";
    semesterProgressDate.textContent = "Error calculating progress";
  }
}

// Get today's progress
async function getTodayProgress() {
  try {
    const todaySessions = await fetchStudentSessionData();

    // Get current date and time
    const now = new Date();

    if (todaySessions.length === 0) {
      updateProgressUI(0, "No sessions scheduled for today");
      return;
    }

    // Count completed sessions (sessions whose time has passed)
    const completedSessions = todaySessions.filter((session) => {
      const sessionTime = new Date(session.session_time);
      return sessionTime < now;
    });

    // Calculate progress percentage
    const progressPercentage = Math.round(
      (completedSessions.length / todaySessions.length) * 100
    );

    // Update the UI with the progress
    updateProgressUI(
      progressPercentage,
      `${completedSessions.length}/${todaySessions.length} completed`
    );
  } catch (error) {
    console.error("Error getting today's progress:", error);
    updateProgressUI(0, "Error");
  }
}

// Helper function to update the progress UI
function updateProgressUI(percentage, text) {
  const progressFill = document.querySelector(".today-progress-fill");
  const progressPercentage = document.querySelector(
    ".today-progress-percentage"
  );
  const progressText = document.querySelector(".today-progress-text");
  if (progressFill && progressPercentage) {
    progressFill.style.width = `${percentage}%`;
    progressPercentage.textContent = `${percentage}%`;
    progressText.textContent = text;
  }
}
async function renderStudentSession() {
  const scheduleGrid = document.querySelector(".schedule-grid");
  if (!scheduleGrid) {
    console.error("Schedule grid element not found!");
    return;
  }

  // Show loading indicator
  scheduleGrid.innerHTML =
    '<div class="loading-spinner" style="grid-column: span 2;"></div>';

  try {
    // Make sure initial data is loaded
    if (!cache.studentCourses) {
      await loadInitialData();
    }

    const sessions = await fetchStudentSessionData();

    if (!sessions || sessions.length === 0) {
      scheduleGrid.innerHTML =
        '<div class="no-sessions">No sessions scheduled for today</div>';
      return;
    }

    let markup = "";

    sessions.forEach((session) => {
      const formattedTime = formatSessionTime(session.session_time);
      markup += `
        <div class="schedule-item">
          <p>${session.course_name}</p>
          <span>${formattedTime}</span>
        </div>
      `;
    });

    scheduleGrid.innerHTML = markup;
  } catch (error) {
    console.error("Error rendering today's sessions:", error);
    scheduleGrid.innerHTML =
      '<div class="error">Failed to load today\'s sessions</div>';
  }
}
// Render weekly deadlines
async function renderWeeklyDeadlines() {
  const deadlineContainer = document.querySelector(".deadlineBoxes");

  if (!deadlineContainer) {
    console.error("Deadline container not found!");
    return;
  }

  // Clear existing content
  deadlineContainer.innerHTML = "";

  try {
    // Show loading indicator
    deadlineContainer.innerHTML = '<div class="loading-spinner"></div>';

    // Make sure initial data is loaded
    if (!cache.studentCourses) {
      await loadInitialData();
    }

    // Get all deadlines in one function call
    const { quizzes, assignments, activities } = await fetchAllDeadlineData();

    // Clear loading indicator
    deadlineContainer.innerHTML = "";

    // Prepare deadline items
    const deadlineItems = [];

    // Process quizzes
    for (const quiz of quizzes) {
      try {
        // Handle potential field name variations (quiz_dueDateTime vs quiz_duedatetime)
        const quizDueDate = quiz.quiz_dueDateTime || quiz.quiz_duedatetime;

        if (!quizDueDate) {
          console.warn(`Quiz ${quiz.quiz_id} has no due date, skipping`);
          continue;
        }

        deadlineItems.push({
          title: getCourseName(quiz.course_id),
          type: "Quiz: " + quiz.quiz_title,
          deadline: quizDueDate,
          date: new Date(quizDueDate),
        });
      } catch (err) {
        console.error("Error processing quiz:", err, "Quiz data:", quiz);
      }
    }

    // Process assignments
    for (const assignment of assignments) {
      try {
        deadlineItems.push({
          title: getCourseName(assignment.course_id),
          type: "Assignment",
          deadline: assignment.assign_duedate,
          date: new Date(assignment.assign_duedate),
        });
      } catch (err) {
        console.error("Error processing assignment:", err);
      }
    }

    // Process activities
    for (const activity of activities) {
      try {
        deadlineItems.push({
          title: activity.course_name,
          type: "Activity",
          deadline: activity.activity_duedate,
          date: new Date(activity.activity_duedate),
        });
      } catch (err) {
        console.error("Error processing activity:", err);
      }
    }

    // Sort by deadline date (ascending)
    deadlineItems.sort((a, b) => a.date - b.date);

    // Take all items
    const itemsToShow = deadlineItems;

    // Hide buttons if fewer than 5 items
    if (itemsToShow.length < 5) {
      document.querySelector(".nav-buttons").style.display = "none";
    }

    // Display the deadline items
    if (itemsToShow.length > 0) {
      itemsToShow.forEach((item) => {
        const box = createDeadlineBox(item.title, item.type, item.deadline);
        deadlineContainer.appendChild(box);
      });
    } else {
      deadlineContainer.innerHTML =
        '<div class="no-deadlines">No deadlines for the next week</div>';
    }
  } catch (error) {
    console.error("Error rendering deadlines:", error);
    deadlineContainer.innerHTML =
      '<div class="error">Failed to load deadlines</div>';
  }
}

// Get student activity stats efficiently
async function getStudentActivityCount() {
  try {
    const { data, error } = await supaClient
      .from("student_activity")
      .select("activity_path")
      .eq("student_id", studentId);

    if (error) {
      console.error("Error fetching student activities:", error);
      return { totalActivities: 0, submittedActivities: 0 };
    }

    if (data) {
      const totalActivities = data.length;
      const submittedActivities = data.filter(
        (activity) => activity.activity_path !== null
      ).length;

      return {
        totalActivities,
        submittedActivities,
      };
    }

    return { totalActivities: 0, submittedActivities: 0 };
  } catch (error) {
    console.error("Error in getStudentActivityCount:", error);
    return { totalActivities: 0, submittedActivities: 0 };
  }
}

// Get student assignment stats efficiently
async function getStudentAssignmentCount() {
  try {
    const { data, error } = await supaClient
      .from("student_assignment")
      .select("assign_path")
      .eq("student_id", studentId);

    if (error) {
      console.error("Error fetching student assignments:", error);
      return { totalAssignments: 0, submittedAssignments: 0 };
    }

    if (data) {
      const totalAssignments = data.length;
      const submittedAssignments = data.filter(
        (assignment) => assignment.assign_path !== null
      ).length;

      return {
        totalAssignments,
        submittedAssignments,
      };
    }

    return { totalAssignments: 0, submittedAssignments: 0 };
  } catch (error) {
    console.error("Error in getStudentAssignmentCount:", error);
    return { totalAssignments: 0, submittedAssignments: 0 };
  }
}
//  function initializePage() {
//    loadInitialData();
//     renderWeeklyDeadlines();
//     renderStudentSession().then(() => {
//       console.log("Student sessions rendered successfully");
//     });
//     getStudentActivityCount();
//     getStudentAssignmentCount();
//     getSemesterProgress();
//     getTodayProgress();

//     // You can add other initialization code here

//   }

// Run when page loads
// document.addEventListener("DOMContentLoaded", initializePage);
async function initializePage() {
  try {
    // First load the initial data
    getInstitutionId(studentId);
    const loaded = await loadInitialData();
    if (!loaded) {
      console.error("Failed to load initial data");
      return;
    }

    // Then render components that depend on that data
    await renderWeeklyDeadlines();
    await renderStudentSession();
    await getSemesterProgress();
    await getTodayProgress();

    // Get other stats
    getStudentActivityCount();
    getStudentAssignmentCount();
  } catch (error) {
    console.error("Error initializing page:", error);
  }
}

// Run when page loads
document.addEventListener("DOMContentLoaded", initializePage);

//   document.addEventListener('DOMContentLoaded', function() {
//   const deadlineBoxes = document.querySelector('.deadlineBoxes');
//   const prevButton = document.getElementById('prev');
//   const nextButton = document.getElementById('next');

//   nextButton.addEventListener('click', function() {
//       deadlineBoxes.scrollBy({ left: 350, behavior: 'smooth' });
//   });

//   prevButton.addEventListener('click', function() {
//       deadlineBoxes.scrollBy({ left: -350, behavior: 'smooth' });

//   });
// });
document.addEventListener("DOMContentLoaded", function () {
  const deadlineBoxes = document.querySelector(".deadlineBoxes");
  const prevButton = document.getElementById("prev");
  const nextButton = document.getElementById("next");
  deadlineBoxes.addEventListener("wheel", function (event) {
    if (event.deltaY !== 0) {
      event.preventDefault();
      deadlineBoxes.scrollLeft += event.deltaY;
    }
  });
  // Get the width of a single box plus its gap
  function getScrollDistance() {
    const box = document.querySelector(".deadlineBoxes .box");
    if (!box) return 0;

    // Get the actual width of a box
    const boxWidth = box.offsetWidth;

    // Get the gap value from computed style
    const computedStyle = window.getComputedStyle(deadlineBoxes);
    const gap = parseInt(computedStyle.gap) || 0;

    // Return single box width + gap
    return boxWidth + gap;
  }

  nextButton.addEventListener("click", function () {
    const scrollDistance = getScrollDistance();
    deadlineBoxes.scrollBy({
      left: scrollDistance,
      behavior: "smooth",
    });
  });

  prevButton.addEventListener("click", function () {
    const scrollDistance = getScrollDistance();
    deadlineBoxes.scrollBy({
      left: -scrollDistance,
      behavior: "smooth",
    });
  });

  // Hide scrollbar but keep functionality
  deadlineBoxes.style.scrollbarWidth = "none";
  deadlineBoxes.style.msOverflowStyle = "none";
});
